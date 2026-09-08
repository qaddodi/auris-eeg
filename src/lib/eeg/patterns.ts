import type { Annotation, ChannelKind, MorphologyType, ProcessedTrack } from "./types.ts";
import {
  detectTemporalPhenomena,
  type PhenomenonChannel,
  type TemporalPhenomenon,
} from "./abnormality/phenomena.ts";

const BUCKET_SECONDS = 30;
const MAX_BUCKET_VALUES = 4096;
const REFRACTORY_SECONDS = 0.2;
const MAX_CROSSING_SECONDS = 0.25;
const MIN_REVIEW_SECONDS = 0.4;
const MAX_REVIEW_SECONDS = 10;

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableId(type: MorphologyType, start: number, end: number, trackIds: string[]): string {
  const ids = [...trackIds].sort();
  const startMs = Math.round(start * 1000);
  const endMs = Math.round(end * 1000);
  return `${type}-${startMs}-${endMs}-${fnv1a(`${type}|${startMs}|${endMs}|${ids.join(",")}`)}`;
}

function ev(
  type: MorphologyType,
  start: number,
  end: number,
  trackIds: string[],
  score: number,
  text = "",
): Annotation {
  const ids = [...trackIds];
  return {
    id: stableId(type, start, end, ids),
    start,
    end: Math.max(end, start),
    trackId: ids.length === 1 ? ids[0]! : null,
    ...(ids.length > 1 ? { trackIds: ids } : {}),
    type,
    text,
    source: "auto",
    confidence: score,
  };
}

function boundedSpan(
  start: number,
  end: number,
  durationSeconds = MIN_REVIEW_SECONDS,
  recordingDuration = Number.POSITIVE_INFINITY,
): { start: number; end: number } {
  const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
  const safeEnd = Number.isFinite(end) ? Math.max(safeStart, end) : safeStart;
  const length = Math.min(MAX_REVIEW_SECONDS, Math.max(durationSeconds, safeEnd - safeStart));
  let nextStart = safeStart;
  let nextEnd = nextStart + length;
  if (Number.isFinite(recordingDuration)) {
    const total = Math.max(0, recordingDuration);
    if (total <= length) return { start: 0, end: total };
    const center = (safeStart + safeEnd) / 2;
    nextStart = Math.max(0, Math.min(center - length / 2, total - length));
    nextEnd = nextStart + length;
  }
  return { start: nextStart, end: nextEnd };
}

function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[mid - 1]! + values[mid]!) / 2 : values[mid]!;
}

function mean(values: readonly number[]): number {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

interface BucketStats {
  center: number;
  scale: number;
}

function localStats(x: Float32Array, start: number, end: number): BucketStats | null {
  const count = end - start;
  if (count <= 0) return null;
  const n = Math.min(MAX_BUCKET_VALUES, count);
  const values: number[] = [];
  for (let k = 0; k < n; k++) {
    const offset = n === 1 ? 0 : Math.round((k * (count - 1)) / (n - 1));
    const value = x[start + offset]!;
    if (Number.isFinite(value)) values.push(value);
  }
  if (values.length < 4) return null;
  const center = median(values);
  const deviations = values.map((value) => Math.abs(value - center));
  const scale = median(deviations) * 1.4826;
  if (!Number.isFinite(center) || !Number.isFinite(scale) || scale <= 1e-12) return null;
  return { center, scale };
}

function crossingLeft(
  x: Float32Array,
  peak: number,
  center: number,
  maxDistance: number,
): number | null {
  const limit = Math.max(0, peak - maxDistance);
  for (let i = peak - 1; i >= limit; i--) {
    const a = x[i]! - center;
    const b = x[i + 1]! - center;
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (a === 0) return i;
    if (a * b <= 0) return i + 1;
  }
  return null;
}

function crossingRight(
  x: Float32Array,
  peak: number,
  center: number,
  maxDistance: number,
): number | null {
  const limit = Math.min(x.length - 1, peak + maxDistance);
  for (let i = peak + 1; i <= limit; i++) {
    const a = x[i - 1]! - center;
    const b = x[i]! - center;
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (b === 0) return i;
    if (a * b <= 0) return i;
  }
  return null;
}

function afterGoingDeflection(
  x: Float32Array,
  peak: number,
  peakDeviation: number,
  center: number,
  scale: number,
  fs: number,
): boolean {
  const from = Math.min(x.length - 1, peak + Math.max(1, Math.round(0.07 * fs)));
  const to = Math.min(x.length - 1, peak + Math.max(1, Math.round(0.5 * fs)));
  const opposite = peakDeviation < 0 ? 1 : -1;
  let strongest = 0;
  for (let i = from; i <= to; i++) {
    const deviation = (x[i]! - center) * opposite;
    if (Number.isFinite(deviation)) strongest = Math.max(strongest, deviation);
  }
  return strongest >= 2 * scale;
}

interface TrackCandidate {
  type: "spike" | "sharp";
  start: number;
  end: number;
  peak: number;
  trackId: string;
  score: number;
  text: string;
  afterGoing: boolean;
  recordingDuration: number;
}

function candidatesForBucket(
  x: Float32Array,
  fs: number,
  trackId: string,
  bucketStart: number,
  bucketEnd: number,
  stats: BucketStats,
): TrackCandidate[] {
  const maxDistance = Math.max(1, Math.round(MAX_CROSSING_SECONDS * fs));
  const candidates: TrackCandidate[] = [];
  const first = Math.max(bucketStart + 1, 1);
  const last = Math.min(bucketEnd - 2, x.length - 2);
  for (let i = first; i <= last; i++) {
    const value = x[i]!;
    const previous = x[i - 1]!;
    const next = x[i + 1]!;
    const deviation = value - stats.center;
    const amplitude = Math.abs(deviation);
    if (
      !Number.isFinite(value) ||
      !Number.isFinite(previous) ||
      !Number.isFinite(next) ||
      amplitude < 6 * stats.scale ||
      amplitude < Math.abs(previous - stats.center) ||
      amplitude < Math.abs(next - stats.center)
    ) {
      continue;
    }

    const left = crossingLeft(x, i, stats.center, maxDistance);
    const right = crossingRight(x, i, stats.center, maxDistance);
    if (left === null || right === null || right <= left) continue;
    const widthMs = ((right - left) / fs) * 1000;
    if (widthMs < 20 || widthMs > 200) continue;

    const halfWidth = Math.max(1, Math.round((right - left) / 2));
    const leftHalf = i - halfWidth;
    const rightHalf = i + halfWidth;
    let pointed = false;
    const comparison: number[] = [];
    if (leftHalf >= 0 && Number.isFinite(x[leftHalf]!)) {
      comparison.push(Math.abs(x[leftHalf]! - stats.center));
    }
    if (rightHalf < x.length && Number.isFinite(x[rightHalf]!)) {
      comparison.push(Math.abs(x[rightHalf]! - stats.center));
    }
    if (comparison.length > 0) {
      pointed = amplitude >= 1.5 * Math.max(...comparison);
    }

    const riseMs = ((i - left) / fs) * 1000;
    const fallMs = ((right - i) / fs) * 1000;
    const asymmetry = riseMs > 0 && fallMs > 0 && (riseMs / fallMs < 0.67 || riseMs / fallMs > 1.5);
    const afterGoing = afterGoingDeflection(x, i, deviation, stats.center, stats.scale, fs);
    if (!pointed && !asymmetry && !afterGoing) continue;

    const score = Math.min(
      0.9,
      0.45 +
        (amplitude >= 8 * stats.scale ? 0.15 : 0) +
        (pointed ? 0.15 : 0) +
        (afterGoing ? 0.15 : 0) +
        (asymmetry ? 0.1 : 0),
    );
    const supports = [
      pointed ? "pointed" : "",
      asymmetry ? "asymmetric" : "",
      afterGoing ? "after-going deflection" : "",
    ].filter(Boolean);
    const type = widthMs < 70 ? "spike" : "sharp";
    candidates.push({
      type,
      start: left / fs,
      end: right / fs,
      peak: i / fs,
      trackId,
      score,
      text: `Local ${(amplitude / stats.scale).toFixed(1)}× robust scale · ${Math.round(widthMs)} ms · ${supports.join(" · ")}`,
      afterGoing,
      recordingDuration: x.length / fs,
    });
    i = Math.max(i, right);
  }
  return candidates;
}

function enforceRefractory(candidates: TrackCandidate[]): TrackCandidate[] {
  const sorted = [...candidates].sort((a, b) => a.peak - b.peak || b.score - a.score);
  const kept: TrackCandidate[] = [];
  for (const candidate of sorted) {
    const previous = kept[kept.length - 1];
    if (!previous || candidate.peak - previous.peak >= REFRACTORY_SECONDS) {
      kept.push(candidate);
    } else if (candidate.score > previous.score) {
      kept[kept.length - 1] = candidate;
    }
  }
  return kept;
}

interface Cluster {
  type: "spike" | "sharp";
  start: number;
  end: number;
  peak: number;
  candidates: TrackCandidate[];
  recordingDuration: number;
}

function clusterCandidates(candidates: TrackCandidate[]): Cluster[] {
  const sorted = [...candidates].sort((a, b) => a.peak - b.peak || a.type.localeCompare(b.type));
  const clusters: Cluster[] = [];
  for (const candidate of sorted) {
    const previous = clusters[clusters.length - 1];
    if (
      previous &&
      previous.type === candidate.type &&
      candidate.peak - previous.peak <= 0.08 &&
      !previous.candidates.some((item) => item.trackId === candidate.trackId)
    ) {
      previous.start = Math.min(previous.start, candidate.start);
      previous.end = Math.max(previous.end, candidate.end);
      previous.peak = Math.max(previous.peak, candidate.peak);
      previous.candidates.push(candidate);
      previous.recordingDuration = Math.max(previous.recordingDuration, candidate.recordingDuration);
    } else {
      clusters.push({
        type: candidate.type,
        start: candidate.start,
        end: candidate.end,
        peak: candidate.peak,
        candidates: [candidate],
        recordingDuration: candidate.recordingDuration,
      });
    }
  }
  return clusters;
}

function clusterAnnotation(cluster: Cluster, trackOrder: Map<string, number>): Annotation {
  const trackIds = [...new Set(cluster.candidates.map((candidate) => candidate.trackId))].sort(
    (a, b) =>
      (trackOrder.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (trackOrder.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
  const strongest = cluster.candidates.reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best,
  );
  const duration = cluster.type === "spike" ? 0.8 : 1;
  const span = boundedSpan(
    cluster.peak - duration / 2,
    cluster.peak + duration / 2,
    duration,
    cluster.recordingDuration,
  );
  return ev(cluster.type, span.start, span.end, trackIds, strongest.score, strongest.text);
}

interface ArtifactInterval {
  type: "blink" | "muscle" | "qrs";
  start: number;
  end: number;
  trackIds: string[];
  score: number;
  text: string;
}

function labelKey(track: ProcessedTrack): string {
  return `${track.label} ${track.id}`.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isFrontal(track: ProcessedTrack): boolean {
  return /(?:FP[12]|AF[37]|F[0-9Z])/.test(labelKey(track));
}

function isPosterior(track: ProcessedTrack): boolean {
  return /(?:P[0-9Z]|O[12]|T5|T6|P7|P8)/.test(labelKey(track));
}

function isEkg(track: ProcessedTrack): boolean {
  return track.kind === "ekg" || /(?:EKG|ECG)/.test(labelKey(track));
}

function mergeIntervals(intervals: ArtifactInterval[]): ArtifactInterval[] {
  const output: ArtifactInterval[] = [];
  for (const item of [...intervals].sort((a, b) => a.start - b.start || a.trackIds[0]!.localeCompare(b.trackIds[0]!))) {
    const previous = output[output.length - 1];
    if (
      previous &&
      previous.type === item.type &&
      previous.trackIds.length === 1 &&
      previous.trackIds[0] === item.trackIds[0] &&
      item.start <= previous.end + 0.25
    ) {
      previous.end = Math.max(previous.end, item.end);
      previous.score = Math.max(previous.score, item.score);
      continue;
    }
    output.push({ ...item, trackIds: [...item.trackIds] });
  }
  return output;
}

function detectBlinkIntervals(tracks: readonly ProcessedTrack[]): ArtifactInterval[] {
  const frontal = tracks.filter((track) => track.kind === "eog" || isFrontal(track));
  const posterior = tracks.filter(isPosterior);
  const output: ArtifactInterval[] = [];
  for (const track of frontal) {
    if (track.sampleRate <= 0 || track.samples.length < 16) continue;
    const bucket = Math.max(1, Math.round(BUCKET_SECONDS * track.sampleRate));
    for (let bucketStart = 0; bucketStart < track.samples.length; bucketStart += bucket) {
      const bucketEnd = Math.min(track.samples.length, bucketStart + bucket);
      const stats = localStats(track.samples, bucketStart, bucketEnd);
      if (!stats) continue;
      const maxDistance = Math.max(1, Math.round(0.6 * track.sampleRate));
      for (let index = Math.max(bucketStart + 1, 1); index < Math.min(bucketEnd - 1, track.samples.length - 1); index += 1) {
        const deviation = track.samples[index]! - stats.center;
        if (
          !Number.isFinite(deviation) ||
          Math.abs(deviation) < 4 * stats.scale ||
          Math.abs(deviation) < Math.abs(track.samples[index - 1]! - stats.center) ||
          Math.abs(deviation) < Math.abs(track.samples[index + 1]! - stats.center)
        ) continue;
        const left = crossingLeft(track.samples, index, stats.center, maxDistance);
        const right = crossingRight(track.samples, index, stats.center, maxDistance);
        if (left === null || right === null) continue;
        const width = (right - left) / track.sampleRate;
        if (width < 0.2 || width > 0.6) continue;
        const posteriorPeak = posterior.reduce((peak, item) => {
          const sample = Math.min(item.samples.length - 1, Math.round(index * item.sampleRate / track.sampleRate));
          const value = Math.abs((item.samples[sample] ?? 0) - (median(Array.from(item.samples).slice(Math.max(0, sample - Math.round(item.sampleRate * 0.15)), Math.min(item.samples.length, sample + Math.round(item.sampleRate * 0.15) + 1))) || 0));
          return Math.max(peak, value);
        }, 0);
        if (posterior.length > 0 && Math.abs(deviation) < Math.max(1e-9, posteriorPeak * 1.25)) continue;
        const span = boundedSpan(left / track.sampleRate, right / track.sampleRate, 0.4, track.samples.length / track.sampleRate);
        output.push({
          type: "blink",
          start: span.start,
          end: span.end,
          trackIds: [track.id],
          score: Math.min(0.9, 0.55 + Math.min(0.3, Math.abs(deviation) / Math.max(stats.scale, 1e-9) / 20)),
          text: `Slow frontal pulse · ${(Math.abs(deviation) / stats.scale).toFixed(1)}× robust scale · ${Math.round(width * 1000)} ms · ${track.label}`,
        });
        index = right;
      }
    }
  }
  return mergeIntervals(output);
}

function detectMuscleIntervals(tracks: readonly ProcessedTrack[]): ArtifactInterval[] {
  const output: ArtifactInterval[] = [];
  for (const track of tracks.filter((item) => item.kind === "eeg" || item.kind === "emg")) {
    if (track.sampleRate < 90 || track.samples.length < Math.round(track.sampleRate * 0.25)) continue;
    const window = Math.max(8, Math.round(track.sampleRate * 0.25));
    for (let start = 0; start + window <= track.samples.length; start += Math.max(1, Math.round(window / 2))) {
      const values = Array.from(track.samples.subarray(start, start + window)).filter(Number.isFinite);
      if (values.length < 8) continue;
      const center = median([...values]);
      const scale = Math.max(1e-9, median(values.map((value) => Math.abs(value - center))) * 1.4826);
      let crossings = 0;
      let jump = 0;
      let previousSign = 0;
      for (let index = 1; index < values.length; index += 1) {
        const deviation = values[index]! - center;
        const sign = deviation > 0 ? 1 : deviation < 0 ? -1 : 0;
        if (sign !== 0) {
          if (previousSign !== 0 && sign !== previousSign) crossings += 1;
          previousSign = sign;
        }
        jump += Math.abs(values[index]! - values[index - 1]!);
      }
      const zeroRate = crossings / (values.length / track.sampleRate);
      const jumpRatio = jump / Math.max(1, values.length - 1) / scale;
      // Some sampled periodic signals hit zero exactly; the sign-tracking
      // above bridges those exact-zero samples. Require both sustained
      // high-frequency crossings and jump evidence so one sharp transient
      // cannot be mislabeled as muscle activity and veto a morphology.
      if (zeroRate < 30 || jumpRatio < 0.55) continue;
      const span = boundedSpan(start / track.sampleRate, (start + window) / track.sampleRate, 0.4, track.samples.length / track.sampleRate);
      output.push({
        type: "muscle",
        start: span.start,
        end: span.end,
        trackIds: [track.id],
        score: Math.min(0.92, 0.55 + Math.min(0.3, (zeroRate - 30) / 100)),
        text: `High-frequency hash · ${zeroRate.toFixed(1)} zero-crossings/s · ${jumpRatio.toFixed(1)}× robust jump ratio · ${track.label}`,
      });
    }
  }
  return mergeIntervals(output);
}

function detectQrsIntervals(tracks: readonly ProcessedTrack[]): ArtifactInterval[] {
  const output: ArtifactInterval[] = [];
  for (const track of tracks.filter(isEkg)) {
    const bucket = Math.max(1, Math.round(BUCKET_SECONDS * track.sampleRate));
    for (let bucketStart = 0; bucketStart < track.samples.length; bucketStart += bucket) {
      const bucketEnd = Math.min(track.samples.length, bucketStart + bucket);
      const stats = localStats(track.samples, bucketStart, bucketEnd);
      if (!stats) continue;
      let previousPeak = -Infinity;
      for (let index = Math.max(bucketStart + 1, 1); index < Math.min(bucketEnd - 1, track.samples.length - 1); index += 1) {
        const value = track.samples[index]!;
        const deviation = value - stats.center;
        const slope = Math.max(Math.abs(value - track.samples[index - 1]!), Math.abs(track.samples[index + 1]! - value)) * track.sampleRate;
        if (!Number.isFinite(value) || Math.abs(deviation) < 4 * stats.scale || slope < 20 * stats.scale || Math.abs(deviation) < Math.abs(track.samples[index - 1]! - stats.center) || Math.abs(deviation) < Math.abs(track.samples[index + 1]! - stats.center)) continue;
        if (index / track.sampleRate - previousPeak < 0.2) continue;
        const left = crossingLeft(track.samples, index, stats.center, Math.max(1, Math.round(0.12 * track.sampleRate)));
        const right = crossingRight(track.samples, index, stats.center, Math.max(1, Math.round(0.12 * track.sampleRate)));
        if (left === null || right === null) continue;
        const width = (right - left) / track.sampleRate;
        if (width < 0.04 || width > 0.12) continue;
        previousPeak = index / track.sampleRate;
        const span = boundedSpan(left / track.sampleRate, right / track.sampleRate, 0.4, track.samples.length / track.sampleRate);
        output.push({
          type: "qrs",
          start: span.start,
          end: span.end,
          trackIds: [track.id],
          score: Math.min(0.95, 0.6 + Math.min(0.3, Math.abs(deviation) / Math.max(stats.scale, 1e-9) / 20)),
          text: `QRS-like complex · ${(Math.abs(deviation) / stats.scale).toFixed(1)}× robust scale · ${Math.round(width * 1000)} ms · ${track.label}`,
        });
      }
    }
  }
  return output;
}

export function detectArtifactAnnotations(tracks: ProcessedTrack[]): Annotation[] {
  return [...detectBlinkIntervals(tracks), ...detectMuscleIntervals(tracks), ...detectQrsIntervals(tracks)]
    .map((artifact) => ev(artifact.type, artifact.start, artifact.end, artifact.trackIds, artifact.score, artifact.text))
    .sort((a, b) => a.start - b.start || a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
}

export function vetoArtifactOverlaps(
  annotations: Annotation[],
  artifacts: readonly (ArtifactInterval | Annotation)[],
): Annotation[] {
  return annotations.filter((annotation) => {
    if (!["spike", "sharp", "polyspike", "spike-wave"].includes(annotation.type)) return true;
    return !artifacts.some((artifact) => {
      const ids = "trackIds" in artifact && artifact.trackIds?.length
        ? artifact.trackIds
        : "trackId" in artifact && artifact.trackId
          ? [artifact.trackId]
          : artifact.trackIds ?? [];
      return ["blink", "muscle", "qrs"].includes(artifact.type) &&
        ids.some((id) => {
          const targetIds = annotation.trackIds?.length ? annotation.trackIds : annotation.trackId ? [annotation.trackId] : [];
          return targetIds.includes(id) && annotation.start < artifact.end && artifact.start < annotation.end;
        });
    });
  });
}

/** Legacy compatibility export; EKG and artifact paths are intentionally kept separate. */
export function detectTransients(
  _x: Float32Array,
  _fs: number,
  _trackId: string,
  _kind: ChannelKind,
): Annotation[] {
  return [];
}

function phenomenonEvidenceText(phenomenon: TemporalPhenomenon): string {
  const evidence = phenomenon.evidence;
  const parts = [
    evidence.frequencyHz == null ? "" : `${evidence.frequencyHz.toFixed(1)} Hz`,
    evidence.cycleCount == null ? "" : `${evidence.cycleCount.toFixed(1)} cycles`,
    evidence.autocorrelationPeak == null ? "" : `r ${evidence.autocorrelationPeak.toFixed(2)}`,
    evidence.spectralConcentration == null ? "" : `${(evidence.spectralConcentration * 100).toFixed(0)}% spectral concentration`,
    evidence.intervalCoefficientOfVariation == null ? "" : `CV ${evidence.intervalCoefficientOfVariation.toFixed(2)}`,
    evidence.templateCorrelation == null ? "" : `template r ${evidence.templateCorrelation.toFixed(2)}`,
    evidence.suppressionFraction == null ? "" : `${(evidence.suppressionFraction * 100).toFixed(0)}% suppression`,
    evidence.burstFraction == null ? "" : `${(evidence.burstFraction * 100).toFixed(0)}% burst`,
    evidence.envelopeRatio == null ? "" : `${evidence.envelopeRatio.toFixed(1)}× envelope ratio`,
    evidence.robustScaleRatio == null ? "" : `${evidence.robustScaleRatio.toFixed(1)}× robust scale`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : `${evidence.durationSeconds.toFixed(2)} s measured span`;
}

function phenomenonType(phenomenon: TemporalPhenomenon): MorphologyType {
  if (phenomenon.detector === "periodic-activity") return "periodic";
  if (phenomenon.detector === "burst-suppression") return "burst-suppression";
  if (phenomenon.detector === "sleep-spindle") return "spindle";
  if (phenomenon.detector === "fast-activity") return "muscle";
  if (phenomenon.detector === "k-complex-candidate") return "slow";
  if (
    phenomenon.detector === "rhythmic-activity" &&
    phenomenon.evidence.frequencyHz != null &&
    phenomenon.evidence.frequencyHz >= 8 &&
    phenomenon.evidence.frequencyHz <= 13 &&
    phenomenon.channelIds.some((id) => /(?:P[0-9Z]|O[12]|P7|P8)/i.test(id))
  ) return "alpha";
  if (phenomenon.detector === "sharp-transient-candidate") return "sharp";
  return "comment";
}

function annotationFromPhenomenon(phenomenon: TemporalPhenomenon, durationSeconds: number): Annotation {
  const rawDuration = Math.max(0, phenomenon.evidence.endSeconds - phenomenon.evidence.startSeconds);
  const span = boundedSpan(
    phenomenon.evidence.startSeconds,
    phenomenon.evidence.endSeconds,
    Math.min(MAX_REVIEW_SECONDS, Math.max(MIN_REVIEW_SECONDS, rawDuration)),
    durationSeconds,
  );
  return ev(
    phenomenonType(phenomenon),
    span.start,
    span.end,
    phenomenon.channelIds,
    phenomenon.confidence,
    `${phenomenon.title} · ${phenomenonEvidenceText(phenomenon)} · expert review required`,
  );
}

function temporalChannel(trackId: string, x: Float32Array, fs: number): PhenomenonChannel {
  return { id: trackId, label: trackId, samples: x, sampleRate: fs, kind: "eeg", laterality: "unknown" };
}

/** Delegates rhythmic review candidates to the shared temporal-phenomena rules. */
export function detectRhythms(x: Float32Array, fs: number, trackId: string): Annotation[] {
  const channel = temporalChannel(trackId, x, fs);
  return detectTemporalPhenomena([channel]).phenomena
    .filter((phenomenon) => phenomenon.detector === "rhythmic-activity")
    .map((phenomenon) => annotationFromPhenomenon(phenomenon, x.length / fs));
}

/** Delegates burst/suppression review candidates to the shared temporal rules. */
export function detectBurstSuppression(x: Float32Array, fs: number, trackId: string): Annotation[] {
  const channel = temporalChannel(trackId, x, fs);
  return detectTemporalPhenomena([channel]).phenomena
    .filter((phenomenon) => phenomenon.detector === "burst-suppression")
    .map((phenomenon) => annotationFromPhenomenon(phenomenon, x.length / fs));
}

/** Delegate field periodicity to the shared phenomenon detector when channels are available. */
export function detectPeriodic(
  events: Annotation[],
  trackId: string,
  channels?: readonly PhenomenonChannel[],
): Annotation[] {
  if (channels?.length) {
    const delegated = detectTemporalPhenomena(channels).phenomena
      .filter((phenomenon) => phenomenon.detector === "periodic-activity")
      .filter((phenomenon) => phenomenon.channelIds.includes(trackId));
    if (delegated.length) {
      const duration = channels.find((channel) => channel.id === trackId);
      return delegated.map((phenomenon) => annotationFromPhenomenon(phenomenon, duration ? duration.samples.length / duration.sampleRate : MAX_REVIEW_SECONDS));
    }
  }
  const peaks = events
    .filter((event) => event.trackId === trackId && (event.type === "spike" || event.type === "sharp"))
    .sort((a, b) => a.start - b.start);
  if (peaks.length < 3) return [];
  const intervals = peaks.slice(1).map((event, index) => event.start - peaks[index]!.start);
  const interval = median(intervals);
  const meanInterval = median(intervals);
  const deviation = Math.sqrt(mean(intervals.map((value) => (value - meanInterval) ** 2)));
  const cv = meanInterval > 0 ? deviation / meanInterval : Infinity;
  if (interval < 0.25 || interval > 4 || cv > 0.25) return [];
  const span = boundedSpan(peaks[0]!.start, peaks.at(-1)!.end, Math.min(MAX_REVIEW_SECONDS, Math.max(0.4, peaks.at(-1)!.end - peaks[0]!.start)));
  return [ev("periodic", span.start, span.end, [trackId], Math.min(0.9, 0.55 + 0.25 * (1 - cv)), `${(1 / interval).toFixed(1)} Hz · ${peaks.length} events · CV ${cv.toFixed(2)} · expert review required`)];
}

function composePolyspikes(byTrack: Map<string, TrackCandidate[]>): Annotation[] {
  const output: Annotation[] = [];
  for (const [trackId, candidates] of byTrack) {
    const sorted = candidates.filter((candidate) => candidate.type === "spike").sort((a, b) => a.peak - b.peak);
    for (let index = 0; index < sorted.length; index += 1) {
      const group = [sorted[index]!];
      while (index + group.length < sorted.length && sorted[index + group.length]!.peak - group[0]!.peak <= 0.15) {
        group.push(sorted[index + group.length]!);
      }
      if (group.length < 2) continue;
      const start = Math.min(...group.map((candidate) => candidate.start));
      const end = Math.max(...group.map((candidate) => candidate.end));
      const span = boundedSpan(start, end, 0.4, group[0]!.recordingDuration);
      const strongest = Math.max(...group.map((candidate) => candidate.score));
      output.push(ev("polyspike", span.start, span.end, [trackId], strongest, `${group.length} spike-class peaks · ${(end - start) * 1000 >= 1 ? Math.round((end - start) * 1000) : 0} ms bunch · ${trackId}`));
      index += group.length - 1;
    }
  }
  return output;
}

function composeSpikeWave(byTrack: Map<string, TrackCandidate[]>): Annotation[] {
  const output: Annotation[] = [];
  for (const [trackId, candidates] of byTrack) {
    const slow = candidates.filter((candidate) => candidate.type === "spike" && candidate.afterGoing).sort((a, b) => a.peak - b.peak);
    for (let index = 0; index < slow.length; index += 1) {
      const group = [slow[index]!];
      while (index + group.length < slow.length) {
        const gap = slow[index + group.length]!.peak - group.at(-1)!.peak;
        if (gap < 0.25 || gap > 0.4) break;
        group.push(slow[index + group.length]!);
      }
      if (group.length < 6) continue;
      const intervals = group.slice(1).map((candidate, candidateIndex) => candidate.peak - group[candidateIndex]!.peak);
      const frequency = 1 / Math.max(1e-6, median(intervals));
      const start = group[0]!.start;
      const end = group.at(-1)!.end;
      const span = boundedSpan(start, end, 2, group[0]!.recordingDuration);
      output.push(ev("spike-wave", span.start, span.end, [trackId], Math.min(0.92, 0.55 + group.length / 40), `${frequency.toFixed(1)} Hz · ${group.length} cycles · after-going slow deflection · ${trackId}`));
      index += group.length - 1;
    }
  }
  return output;
}

export function detectMorphologies(tracks: ProcessedTrack[]): Annotation[] {
  const eeg = tracks.filter((track) => track.kind === "eeg" && track.sampleRate > 0);
  const trackOrder = new Map(eeg.map((track, index) => [track.id, index]));
  const byTrack = new Map<string, TrackCandidate[]>();

  for (const track of eeg) {
    const bucketSamples = Math.max(1, Math.round(BUCKET_SECONDS * track.sampleRate));
    const candidates: TrackCandidate[] = [];
    for (let start = 0; start < track.samples.length; start += bucketSamples) {
      const end = Math.min(track.samples.length, start + bucketSamples);
      const stats = localStats(track.samples, start, end);
      if (stats) {
        candidates.push(
          ...candidatesForBucket(track.samples, track.sampleRate, track.id, start, end, stats),
        );
      }
    }
    byTrack.set(track.id, enforceRefractory(candidates));
  }

  const all = clusterCandidates([...byTrack.values()].flat());
  const retained: Annotation[] = [];
  const bucketCounts = new Map<number, number>();
  const trackCounts = new Map<number, Map<string, number>>();
  const ranked = [...all].sort((a, b) => {
    const scoreA = Math.max(...a.candidates.map((candidate) => candidate.score));
    const scoreB = Math.max(...b.candidates.map((candidate) => candidate.score));
    return scoreB - scoreA || a.peak - b.peak;
  });
  for (const cluster of ranked) {
    const bucket = Math.floor(cluster.peak / BUCKET_SECONDS);
    if ((bucketCounts.get(bucket) ?? 0) >= 6) continue;
    const counts = trackCounts.get(bucket) ?? new Map<string, number>();
    const trackIds = [...new Set(cluster.candidates.map((candidate) => candidate.trackId))];
    if (trackIds.some((trackId) => (counts.get(trackId) ?? 0) >= 2)) continue;
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
    for (const trackId of trackIds) counts.set(trackId, (counts.get(trackId) ?? 0) + 1);
    trackCounts.set(bucket, counts);
    retained.push(clusterAnnotation(cluster, trackOrder));
  }
  const composed = [...composePolyspikes(byTrack), ...composeSpikeWave(byTrack)];
  const artifacts = detectArtifactAnnotations(tracks);
  return vetoArtifactOverlaps([...retained, ...composed], artifacts)
    .sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
}

function capReviewCandidates(annotations: Annotation[]): Annotation[] {
  const bucketCounts = new Map<number, number>();
  const trackCounts = new Map<number, Map<string, number>>();
  const ranked = [...annotations].sort((a, b) => b.confidence - a.confidence || a.start - b.start || a.id.localeCompare(b.id));
  const retained: Annotation[] = [];
  for (const annotation of ranked) {
    const bucket = Math.floor(annotation.start / BUCKET_SECONDS);
    if ((bucketCounts.get(bucket) ?? 0) >= 8) continue;
    const ids = annotation.trackIds?.length ? annotation.trackIds : annotation.trackId ? [annotation.trackId] : [];
    const counts = trackCounts.get(bucket) ?? new Map<string, number>();
    if (ids.some((id) => (counts.get(id) ?? 0) >= 3)) continue;
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    trackCounts.set(bucket, counts);
    retained.push(annotation);
  }
  return retained.sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
}

/** Shared browser-side candidate surface used by the screening adapter. */
export function detectReviewCandidates(tracks: ProcessedTrack[]): Annotation[] {
  const artifacts = detectArtifactAnnotations(tracks);
  const temporalChannels: PhenomenonChannel[] = tracks
    .filter((track) => track.kind === "eeg" && track.sampleRate > 0 && track.samples.length >= 16)
    .map((track) => ({
      id: track.id,
      label: track.label,
      samples: track.samples,
      sampleRate: track.sampleRate,
      kind: track.kind,
      laterality: track.laterality,
    }));
  const temporal = temporalChannels.flatMap((channel) => detectTemporalPhenomena([channel]).phenomena)
    .filter((phenomenon) => phenomenon.detector !== "sharp-transient-candidate" && phenomenon.detector !== "fast-activity")
    .map((phenomenon) => {
      const source = temporalChannels.find((channel) => channel.id === phenomenon.channelIds[0]);
      return annotationFromPhenomenon(phenomenon, source ? source.samples.length / source.sampleRate : MAX_REVIEW_SECONDS);
    });
  const candidates = [...detectMorphologies(tracks), ...artifacts, ...temporal];
  return capReviewCandidates(vetoArtifactOverlaps(candidates, artifacts));
}

export function spikesForTrack(events: Annotation[], trackId: string): Float32Array {
  const times = events
    .filter(
      (event) =>
        event.trackId === trackId &&
        (event.type === "spike" || event.type === "sharp" || event.type === "qrs"),
    )
    .map((event) => event.start);
  return Float32Array.from(times);
}

export const MORPH_HELP: Record<MorphologyType, string> = {
  spike: "Spike-like review candidate (20–<70 ms) based on local amplitude, duration, and waveform-shape criteria; descriptive only — expert review is required.",
  sharp: "Sharp-wave-like review candidate (70–200 ms) based on local amplitude, duration, and waveform-shape criteria; descriptive only — expert review is required.",
  slow: "Broad high-amplitude deflection; descriptive review candidate — expert review is required.",
  "spike-wave": "About 2.5–4 Hz spike/slow-wave run; descriptive only — expert review is required.",
  polyspike: "Two or more spike-class peaks bunched together; descriptive only — expert review is required.",
  periodic: "Stereotyped transients at a stable interval; descriptive only — expert review is required.",
  "burst-suppression": "High-energy bursts separated by low-amplitude periods; descriptive only — expert review is required.",
  spindle: "11–16 Hz waxing run; descriptive only — expert review is required.",
  alpha: "Posterior 8–13 Hz rhythmic run; descriptive only — expert review is required.",
  triphasic: "Three-phase slow complex; descriptive only — expert review is required.",
  blink: "Slow lid/EOG deflection; descriptive only — expert review is required.",
  qrs: "EKG QRS-like complex; descriptive only — expert review is required.",
  muscle: "High-frequency myogenic-like activity; descriptive only — expert review is required.",
  comment: "Free-text or channel-quality mark; expert review is required.",
};
