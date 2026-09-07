import { applyFilters } from "./preprocessing.ts";
import type { FilterSettings, ProcessedTrack } from "./types.ts";

const OFF_TEMPORAL: FilterSettings = {
  bandpass: false,
  bandpassLow: 0,
  bandpassHigh: 0,
  lff: 0,
  hff: 0,
  notch60: false,
  removeDc: false,
  artifactReduction: false,
  ica: false,
  spatialFilter: false,
};

const ICA_FIT_CAP = 8192;
const ICA_MAX_ITER = 48;
const ICA_CORR_REJECT = 0.32;
const SPATIAL_CORR_MIN = 0.12;

export interface NoiseReferenceReport {
  eog: string[];
  emg: string[];
  ocularProxies: string[];
  used: string[];
  summary: string;
}

export function spatialCleaningEnabled(filters: FilterSettings): boolean {
  return Boolean(filters.artifactReduction || filters.ica || filters.spatialFilter);
}

export function isOcularProxyLabel(label: string): boolean {
  return /\bFp[12z]\b/i.test(label) || /^Fp[12z]/i.test(label.trim());
}

export function describeNoiseReferences(tracks: readonly ProcessedTrack[]): NoiseReferenceReport {
  const eog = tracks.filter((track) => track.kind === "eog").map((track) => track.label);
  const emg = tracks.filter((track) => track.kind === "emg").map((track) => track.label);
  const ocularProxies =
    eog.length > 0
      ? []
      : tracks
          .filter((track) => track.kind === "eeg" && isOcularProxyLabel(track.label))
          .map((track) => track.label);
  const used = [...eog, ...emg, ...ocularProxies];
  let summary: string;
  if (eog.length && emg.length) {
    summary = `Using ${eog.join(", ")} and ${emg.join(", ")} as noise references.`;
  } else if (eog.length) {
    summary = `Using ${eog.join(", ")} as ocular references. No EMG channel in this montage.`;
  } else if (emg.length && ocularProxies.length) {
    summary = `Using ${emg.join(", ")} as muscle references and ${ocularProxies.join(", ")} as ocular proxies.`;
  } else if (emg.length) {
    summary = `Using ${emg.join(", ")} as muscle references. No EOG channel in this montage.`;
  } else if (ocularProxies.length) {
    summary = `No EOG/EMG channels. Using ${ocularProxies.join(", ")} as ocular proxies.`;
  } else {
    summary = "No EOG, EMG, or frontal ocular-proxy channels in this window.";
  }
  return { eog, emg, ocularProxies, used, summary };
}

/**
 * Display-only EOG/EMG cleaning. EEG traces are replaced; EOG, EMG, EKG, and
 * other auxiliaries are returned unchanged so the noise sources stay visible.
 * Input sample buffers are never mutated.
 */
export function applySpatialCleaning(
  tracks: readonly ProcessedTrack[],
  filters: FilterSettings,
): ProcessedTrack[] {
  if (!spatialCleaningEnabled(filters) || tracks.length === 0) {
    return tracks.map(cloneTrack);
  }
  const groups = groupByRate(tracks);
  const out = tracks.map(cloneTrack);
  const byId = new Map(out.map((track) => [track.id, track]));
  for (const group of groups) {
    let cleaned = group.map((track) => byId.get(track.id)!);
    if (filters.artifactReduction) cleaned = applyArtifactReduction(cleaned);
    if (filters.ica) cleaned = applyIca(cleaned);
    if (filters.spatialFilter) cleaned = applySpatialFilter(cleaned);
    for (const track of cleaned) byId.set(track.id, track);
  }
  return out.map((track) => byId.get(track.id) ?? track);
}

function cloneTrack(track: ProcessedTrack): ProcessedTrack {
  return { ...track, samples: new Float32Array(track.samples) };
}

function groupByRate(tracks: readonly ProcessedTrack[]): ProcessedTrack[][] {
  const groups = new Map<number, ProcessedTrack[]>();
  for (const track of tracks) {
    const list = groups.get(track.sampleRate) ?? [];
    list.push(track);
    groups.set(track.sampleRate, list);
  }
  return [...groups.values()];
}

function eegTracks(tracks: readonly ProcessedTrack[]): ProcessedTrack[] {
  return tracks.filter((track) => track.kind === "eeg" && track.samples.length > 8);
}

function referenceTracks(tracks: readonly ProcessedTrack[]): ProcessedTrack[] {
  const eog = tracks.filter((track) => track.kind === "eog" && track.samples.length > 8);
  const emg = tracks.filter((track) => track.kind === "emg" && track.samples.length > 8);
  if (eog.length) return [...eog, ...emg];
  const proxies = eegTracks(tracks).filter((track) => isOcularProxyLabel(track.label));
  return [...proxies, ...emg];
}

function alignedLength(tracks: readonly ProcessedTrack[]): number {
  return tracks.reduce((min, track) => Math.min(min, track.samples.length), Number.POSITIVE_INFINITY);
}

function copyRefs(refs: readonly ProcessedTrack[], length: number, sampleRate: number): Float32Array[] {
  return refs.map((ref) => {
    const slice = ref.samples.subarray(0, length);
    if (ref.kind !== "emg") return new Float32Array(slice);
    return applyFilters(slice, sampleRate, { ...OFF_TEMPORAL, lff: 20 });
  });
}

function applyArtifactReduction(tracks: ProcessedTrack[]): ProcessedTrack[] {
  const eeg = eegTracks(tracks);
  const refs = referenceTracks(tracks);
  if (eeg.length === 0 || refs.length === 0) return tracks;
  const n = alignedLength([...eeg, ...refs]);
  if (!Number.isFinite(n) || n < 16) return tracks;
  const refSeries = copyRefs(refs, n, eeg[0]!.sampleRate);
  const refIds = new Set(refs.map((track) => track.id));
  return tracks.map((track) => {
    if (track.kind !== "eeg" || refIds.has(track.id) || track.samples.length < 16) return track;
    const cleaned = regressOut(track.samples.subarray(0, n), refSeries);
    const samples = new Float32Array(track.samples);
    samples.set(cleaned);
    return { ...track, samples };
  });
}

function applySpatialFilter(tracks: ProcessedTrack[]): ProcessedTrack[] {
  const eeg = eegTracks(tracks);
  const refs = referenceTracks(tracks);
  if (eeg.length === 0) return tracks;
  const n = alignedLength(refs.length ? [...eeg, ...refs] : eeg);
  if (!Number.isFinite(n) || n < 16) return tracks;
  if (refs.length === 0) return subtractCommonAverage(tracks, eeg, n);
  const refIds = new Set(refs.map((track) => track.id));
  const targets = eeg.filter((track) => !refIds.has(track.id));
  if (targets.length === 0) return tracks;
  const matrix = targets.map((track) => Array.from(track.samples.subarray(0, n)));
  for (const ref of copyRefs(refs, n, targets[0]!.sampleRate)) {
    projectOutSpatialPattern(matrix, ref);
  }
  return tracks.map((track) => {
    const index = targets.findIndex((candidate) => candidate.id === track.id);
    if (index < 0) return track;
    const samples = new Float32Array(track.samples);
    samples.set(Float32Array.from(matrix[index]!));
    return { ...track, samples };
  });
}

function subtractCommonAverage(
  tracks: ProcessedTrack[],
  eeg: ProcessedTrack[],
  n: number,
): ProcessedTrack[] {
  if (eeg.length < 2) return tracks;
  const mean = new Float64Array(n);
  for (const track of eeg) {
    for (let i = 0; i < n; i++) mean[i]! += track.samples[i]!;
  }
  const scale = 1 / eeg.length;
  for (let i = 0; i < n; i++) mean[i]! *= scale;
  const ids = new Set(eeg.map((track) => track.id));
  return tracks.map((track) => {
    if (!ids.has(track.id)) return track;
    const samples = new Float32Array(track.samples);
    for (let i = 0; i < n; i++) samples[i]! -= mean[i]!;
    return { ...track, samples };
  });
}

function projectOutSpatialPattern(matrix: number[][], ref: Float32Array): void {
  const n = ref.length;
  const channels = matrix.length;
  if (channels === 0 || n < 16) return;
  const centeredRef = centerCopy(ref);
  const pattern = new Float64Array(channels);
  let refEnergy = 0;
  for (let i = 0; i < n; i++) refEnergy += centeredRef[i]! * centeredRef[i]!;
  if (refEnergy < 1e-12) return;
  for (let c = 0; c < channels; c++) {
    let cov = 0;
    const row = matrix[c]!;
    const rowMean = meanOf(row);
    for (let i = 0; i < n; i++) cov += (row[i]! - rowMean) * centeredRef[i]!;
    pattern[c] = cov / refEnergy;
  }
  const patternNorm = Math.sqrt(pattern.reduce((sum, value) => sum + value * value, 0));
  if (patternNorm < 1e-12) return;
  for (let c = 0; c < channels; c++) pattern[c]! /= patternNorm;
  const maxCorr = Math.max(
    ...matrix.map((row, c) => Math.abs(correlation(row, Array.from(centeredRef)) * Math.sign(pattern[c] || 1))),
  );
  if (maxCorr < SPATIAL_CORR_MIN) return;
  const scores = new Float64Array(n);
  for (let c = 0; c < channels; c++) {
    const row = matrix[c]!;
    const w = pattern[c]!;
    for (let i = 0; i < n; i++) scores[i]! += row[i]! * w;
  }
  for (let c = 0; c < channels; c++) {
    const row = matrix[c]!;
    const w = pattern[c]!;
    for (let i = 0; i < n; i++) row[i]! -= scores[i]! * w;
  }
}

function applyIca(tracks: ProcessedTrack[]): ProcessedTrack[] {
  const eeg = eegTracks(tracks);
  const refs = referenceTracks(tracks);
  if (eeg.length < 2) return tracks;
  const n = alignedLength(refs.length ? [...eeg, ...refs] : eeg);
  if (!Number.isFinite(n) || n < 32) return tracks;
  const refIds = new Set(refs.map((track) => track.id));
  const targets = eeg.filter((track) => !refIds.has(track.id));
  if (targets.length < 2) return tracks;
  const data = targets.map((track) => Array.from(track.samples.subarray(0, n)));
  const ica = fastIca(data);
  if (!ica) return tracks;
  const refSeries = refs.length ? copyRefs(refs, n, targets[0]!.sampleRate) : [];
  const rejected = new Set<number>();
  for (let c = 0; c < ica.sources.length; c++) {
    const source = ica.sources[c]!;
    let reject = false;
    for (const ref of refSeries) {
      if (Math.abs(correlation(source, Array.from(ref))) >= ICA_CORR_REJECT) {
        reject = true;
        break;
      }
    }
    if (!reject && refSeries.length === 0 && isOcularProxyLabel(targets[c]?.label ?? "")) {
      const kurt = excessKurtosis(source);
      if (kurt > 4) reject = true;
    }
    if (reject) rejected.add(c);
  }
  if (rejected.size === 0) return tracks;
  const reconstructed = mixSources(ica.mixing, ica.sources, rejected);
  return tracks.map((track) => {
    const index = targets.findIndex((candidate) => candidate.id === track.id);
    if (index < 0) return track;
    const samples = new Float32Array(track.samples);
    samples.set(Float32Array.from(reconstructed[index]!));
    return { ...track, samples };
  });
}

interface IcaResult {
  mixing: number[][];
  sources: number[][];
}

function fastIca(rows: number[][]): IcaResult | null {
  const channels = rows.length;
  const samples = rows[0]?.length ?? 0;
  if (channels < 2 || samples < channels * 4) return null;
  const centered = rows.map((row) => {
    const m = meanOf(row);
    return row.map((value) => value - m);
  });
  const white = whiten(centered);
  if (!white) return null;
  const stride = Math.max(1, Math.ceil(samples / ICA_FIT_CAP));
  const fit = white.z.map((row) => row.filter((_, index) => index % stride === 0));
  const fitN = fit[0]!.length;
  const unmixing: number[][] = [];
  for (let comp = 0; comp < channels; comp++) {
    let w = unitVector(channels, 1 + comp * 17 + Math.round(Math.abs(centered[0]![0] ?? 0) * 1000));
    for (let iter = 0; iter < ICA_MAX_ITER; iter++) {
      const wx = new Float64Array(fitN);
      for (let i = 0; i < fitN; i++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) sum += w[c]! * fit[c]![i]!;
        wx[i] = sum;
      }
      const next = new Array<number>(channels).fill(0);
      let gPrime = 0;
      for (let i = 0; i < fitN; i++) {
        const u = Math.tanh(wx[i]!);
        gPrime += 1 - u * u;
        for (let c = 0; c < channels; c++) next[c]! += fit[c]![i]! * u;
      }
      const invN = 1 / fitN;
      for (let c = 0; c < channels; c++) next[c] = next[c]! * invN - (gPrime * invN) * w[c]!;
      for (const prev of unmixing) {
        const proj = dot(next, prev);
        for (let c = 0; c < channels; c++) next[c]! -= proj * prev[c]!;
      }
      const normed = normalize(next);
      if (!normed) break;
      const aligned = Math.abs(dot(normed, w));
      w = normed;
      if (aligned > 0.9999) break;
    }
    unmixing.push(w);
  }
  const sources = unmixing.map((w) => {
    const source = new Array<number>(samples);
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let c = 0; c < channels; c++) sum += w[c]! * white.z[c]![i]!;
      source[i] = sum;
    }
    return source;
  });
  const mixingWhite = invert(unmixing);
  if (!mixingWhite) return null;
  const mixing = multiply(white.dewhiten, mixingWhite);
  return { mixing, sources };
}

function mixSources(mixing: number[][], sources: number[][], rejected: Set<number>): number[][] {
  const channels = mixing.length;
  const samples = sources[0]?.length ?? 0;
  const out = Array.from({ length: channels }, () => new Array<number>(samples).fill(0));
  for (let c = 0; c < channels; c++) {
    for (let k = 0; k < sources.length; k++) {
      if (rejected.has(k)) continue;
      const weight = mixing[c]![k]!;
      const source = sources[k]!;
      const row = out[c]!;
      for (let i = 0; i < samples; i++) row[i]! += weight * source[i]!;
    }
  }
  return out;
}

function whiten(rows: number[][]): { z: number[][]; dewhiten: number[][] } | null {
  const channels = rows.length;
  const samples = rows[0]!.length;
  const cov = Array.from({ length: channels }, () => new Array<number>(channels).fill(0));
  const invN = 1 / samples;
  for (let a = 0; a < channels; a++) {
    for (let b = a; b < channels; b++) {
      let sum = 0;
      const ra = rows[a]!;
      const rb = rows[b]!;
      for (let i = 0; i < samples; i++) sum += ra[i]! * rb[i]!;
      cov[a]![b] = sum * invN;
      cov[b]![a] = cov[a]![b]!;
    }
  }
  const eig = jacobiEigen(cov);
  if (!eig) return null;
  const maxEv = Math.max(...eig.values);
  const z = Array.from({ length: channels }, () => new Array<number>(samples).fill(0));
  const dewhiten = Array.from({ length: channels }, () => new Array<number>(channels).fill(0));
  const white = Array.from({ length: channels }, () => new Array<number>(channels).fill(0));
  let kept = 0;
  for (let k = 0; k < channels; k++) {
    const ev = eig.values[k]!;
    if (ev <= maxEv * 1e-8) continue;
    const scale = 1 / Math.sqrt(ev);
    const vec = eig.vectors[k]!;
    kept += 1;
    for (let c = 0; c < channels; c++) {
      white[k]![c] = scale * vec[c]!;
      dewhiten[c]![k] = Math.sqrt(ev) * vec[c]!;
    }
  }
  if (kept < 2) return null;
  for (let k = 0; k < channels; k++) {
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let c = 0; c < channels; c++) sum += white[k]![c]! * rows[c]![i]!;
      z[k]![i] = sum;
    }
  }
  return { z, dewhiten };
}

function jacobiEigen(input: number[][]): { values: number[]; vectors: number[][] } | null {
  const n = input.length;
  const a = input.map((row) => row.slice());
  const v = Array.from({ length: n }, (_, i) => {
    const row = new Array<number>(n).fill(0);
    row[i] = 1;
    return row;
  });
  for (let sweep = 0; sweep < 24; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p]![q]!;
        off += apq * apq;
        if (Math.abs(apq) < 1e-12) continue;
        const app = a[p]![p]!;
        const aqq = a[q]![q]!;
        const tau = (aqq - app) / (2 * apq);
        const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          if (k === p || k === q) continue;
          const akp = a[k]![p]!;
          const akq = a[k]![q]!;
          a[k]![p] = c * akp - s * akq;
          a[p]![k] = a[k]![p]!;
          a[k]![q] = s * akp + c * akq;
          a[q]![k] = a[k]![q]!;
        }
        a[p]![p] = app - t * apq;
        a[q]![q] = aqq + t * apq;
        a[p]![q] = 0;
        a[q]![p] = 0;
        for (let k = 0; k < n; k++) {
          const vkp = v[k]![p]!;
          const vkq = v[k]![q]!;
          v[k]![p] = c * vkp - s * vkq;
          v[k]![q] = s * vkp + c * vkq;
        }
      }
    }
    if (off < 1e-20) break;
  }
  const values = a.map((row, i) => row[i]!);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const vectors = values.map((_, k) => v.map((row) => row[k]!));
  return { values, vectors };
}

export function regressOut(y: Float32Array, refs: readonly Float32Array[]): Float32Array {
  const n = y.length;
  const k = refs.length;
  const out = new Float32Array(y);
  if (k === 0 || n < k + 2) return out;
  const yMean = meanOf(y);
  const refMeans = refs.map((ref) => meanOf(ref));
  const gram = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const rhs = new Array<number>(k).fill(0);
  for (let a = 0; a < k; a++) {
    const ra = refs[a]!;
    const ma = refMeans[a]!;
    let cy = 0;
    for (let i = 0; i < n; i++) cy += (ra[i]! - ma) * (y[i]! - yMean);
    rhs[a] = cy;
    for (let b = a; b < k; b++) {
      const rb = refs[b]!;
      const mb = refMeans[b]!;
      let sum = 0;
      for (let i = 0; i < n; i++) sum += (ra[i]! - ma) * (rb[i]! - mb);
      gram[a]![b] = sum;
      gram[b]![a] = sum;
    }
  }
  const beta = solveSymmetric(gram, rhs);
  if (!beta) return out;
  for (let i = 0; i < n; i++) {
    let estimate = 0;
    for (let a = 0; a < k; a++) estimate += beta[a]! * (refs[a]![i]! - refMeans[a]!);
    out[i] = y[i]! - estimate;
  }
  return out;
}

function solveSymmetric(matrix: number[][], rhs: number[]): number[] | null {
  const k = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]!]);
  for (let p = 0; p < k; p++) {
    let best = p;
    for (let r = p + 1; r < k; r++) if (Math.abs(a[r]![p]!) > Math.abs(a[best]![p]!)) best = r;
    if (Math.abs(a[best]![p]!) < 1e-12) return null;
    if (best !== p) {
      const swap = a[p]!;
      a[p] = a[best]!;
      a[best] = swap;
    }
    const pivot = a[p]![p]!;
    for (let c = p; c <= k; c++) a[p]![c]! /= pivot;
    for (let r = 0; r < k; r++) {
      if (r === p) continue;
      const f = a[r]![p]!;
      for (let c = p; c <= k; c++) a[r]![c]! -= f * a[p]![c]!;
    }
  }
  return a.map((row) => row[k]!);
}

function invert(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const a = matrix.map((row, i) => {
    const augmented = row.slice();
    for (let j = 0; j < n; j++) augmented.push(i === j ? 1 : 0);
    return augmented;
  });
  for (let p = 0; p < n; p++) {
    let best = p;
    for (let r = p + 1; r < n; r++) if (Math.abs(a[r]![p]!) > Math.abs(a[best]![p]!)) best = r;
    if (Math.abs(a[best]![p]!) < 1e-12) return null;
    if (best !== p) {
      const swap = a[p]!;
      a[p] = a[best]!;
      a[best] = swap;
    }
    const pivot = a[p]![p]!;
    for (let c = 0; c < 2 * n; c++) a[p]![c]! /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === p) continue;
      const f = a[r]![p]!;
      for (let c = 0; c < 2 * n; c++) a[r]![c]! -= f * a[p]![c]!;
    }
  }
  return a.map((row) => row.slice(n));
}

function multiply(a: number[][], b: number[][]): number[][] {
  const rows = a.length;
  const cols = b[0]?.length ?? 0;
  const inner = b.length;
  const out = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      const aik = a[i]![k]!;
      if (aik === 0) continue;
      for (let j = 0; j < cols; j++) out[i]![j]! += aik * b[k]![j]!;
    }
  }
  return out;
}

function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  if (n < 4) return 0;
  const ma = meanOf(a);
  const mb = meanOf(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i]! - ma;
    const xb = b[i]! - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den > 1e-12 ? num / den : 0;
}

function excessKurtosis(x: ArrayLike<number>): number {
  const n = x.length;
  if (n < 8) return 0;
  const m = meanOf(x);
  let m2 = 0;
  let m4 = 0;
  for (let i = 0; i < n; i++) {
    const d = x[i]! - m;
    const d2 = d * d;
    m2 += d2;
    m4 += d2 * d2;
  }
  m2 /= n;
  m4 /= n;
  return m2 > 1e-12 ? m4 / (m2 * m2) - 3 : 0;
}

function meanOf(x: ArrayLike<number>): number {
  if (x.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i]!;
  return sum / x.length;
}

function centerCopy(x: Float32Array): Float32Array {
  const m = meanOf(x);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i]! - m;
  return out;
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i]! * b[i]!;
  return sum;
}

function normalize(w: number[]): number[] | null {
  const n = Math.sqrt(dot(w, w));
  if (n < 1e-12) return null;
  return w.map((value) => value / n);
}

function unitVector(n: number, seed: number): number[] {
  const w = new Array<number>(n);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    w[i] = (s / 0xffffffff) * 2 - 1;
  }
  return normalize(w) ?? w.map((_, i) => (i === 0 ? 1 : 0));
}
