import type { Annotation, ChannelKind, MorphologyType, ProcessedTrack } from "./types.ts";

const BUCKET_SECONDS = 30;
const MAX_BUCKET_VALUES = 4096;
const REFRACTORY_SECONDS = 0.2;
const MAX_CROSSING_SECONDS = 0.25;

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

function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[mid - 1]! + values[mid]!) / 2 : values[mid]!;
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
    } else {
      clusters.push({
        type: candidate.type,
        start: candidate.start,
        end: candidate.end,
        peak: candidate.peak,
        candidates: [candidate],
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
  return ev(cluster.type, cluster.start, cluster.end, trackIds, strongest.score, strongest.text);
}

/** Legacy compatibility export; unsupported broad transient heuristics are disabled. */
export function detectTransients(
  _x: Float32Array,
  _fs: number,
  _trackId: string,
  _kind: ChannelKind,
): Annotation[] {
  return [];
}

/** Unsupported rhythm auto-suggestions are intentionally disabled. */
export function detectRhythms(_x: Float32Array, _fs: number, _trackId: string): Annotation[] {
  return [];
}

/** Unsupported burst-suppression auto-suggestions are intentionally disabled. */
export function detectBurstSuppression(
  _x: Float32Array,
  _fs: number,
  _trackId: string,
): Annotation[] {
  return [];
}

/** Unsupported periodic auto-suggestions are intentionally disabled. */
export function detectPeriodic(_events: Annotation[], _trackId: string): Annotation[] {
  return [];
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
  return retained.sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
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
  slow: "Broad high-amplitude deflection.",
  "spike-wave": "About 2.5–4 Hz complexes.",
  polyspike: "Two or more spikes bunched together.",
  periodic: "Stereotyped transients at a stable interval (LPD/GPD-like).",
  "burst-suppression": "High-energy bursts separated by flattening.",
  spindle: "11–16 Hz waxing run (sleep-like).",
  alpha: "8–13 Hz run.",
  triphasic: "Three-phase slow complex.",
  blink: "Slow lid/EOG deflection.",
  qrs: "EKG QRS.",
  muscle: "High-frequency myogenic activity.",
  comment: "Free-text mark.",
};
