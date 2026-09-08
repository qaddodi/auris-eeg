import type {
  Annotation,
  ChannelKind,
  Derivation,
  Laterality,
  MorphologyType,
  ProcessedTrack,
} from "../types.ts";
import { detectTemporalPhenomena, type TemporalPhenomenonDetector } from "./phenomena.ts";

/**
 * Deterministic screening is intentionally a narrow, model-ready boundary.
 * It is not a clinical interpretation, diagnostic classifier, or validated
 * medical device. All scores below are bounded heuristics with their inputs
 * and thresholds returned to callers for auditability.
 */
export const DETERMINISTIC_SCREENING_VERSION = "deterministic-screening-0.2.0";
export const SCREENING_PREPROCESSING_VERSION = "raw-finite-median-centered-v1";

export type ScreeningDetector =
  | TemporalPhenomenonDetector
  | "focal-slowing"
  | "generalized-slowing"
  | "hemispheric-asymmetry"
  | "suppression-attenuation"
  | "flat-disconnected-electrode"
  | "movement-artifact"
  | "eye-movement-contamination"
  | "muscle-contamination"
  | "line-noise"
  | "clipping-saturation";

export type ScreeningStatus = "screen-positive" | "not-detected" | "insufficient-data";

export type EvidencePolarity = "positive" | "negative" | "mixed" | "unknown" | "not-applicable";

export type DerivationEvidenceClass =
  | "referential-electrode"
  | "bipolar-candidate"
  | "mixed"
  | "ambiguous"
  | "unknown";

export interface ScreeningChannel {
  id: string;
  label: string;
  samples: ArrayLike<number>;
  sampleRate: number;
  kind?: ChannelKind;
  isEeg?: boolean;
  laterality?: Laterality;
  canonical?: string;
  /** A single-source channel can be referential, but the reference may be unknown. */
  reference?: string;
  /** Two source electrodes identify a bipolar candidate without asserting its polarity. */
  sources?: readonly string[];
  derivation?: Pick<Derivation, "id" | "label" | "sources" | "laterality" | "kind">;
  unit?: string;
}

export type ScreeningInputChannel = ScreeningChannel | ProcessedTrack;

export interface ScreeningInput {
  channels: readonly ScreeningInputChannel[];
  /** Optional display/recording origin for audit logs; no signal data is persisted here. */
  recordingId?: string;
  startTimeSeconds?: number;
  durationSeconds?: number;
  /** Optional explicit candidate pairs; otherwise laterality/canonical labels are used. */
  comparisonPairs?: readonly ScreeningComparisonPair[];
}

export interface ScreeningComparisonPair {
  left: string;
  right: string;
  label?: string;
}

export interface ScreeningProgress {
  phase: "measurements" | "detectors" | "complete";
  completed: number;
  total: number;
  fraction: number;
  channelId?: string;
  contextWindowSeconds?: number;
}

export interface ScreeningOptions {
  /** One or more contextual windows. Values are clamped to a useful bounded range. */
  contextWindowSeconds?: number | readonly number[];
  maxContextWindowSeconds?: number;
  lineFrequenciesHz?: readonly number[];
  /** Optional cancellation support for interactive review. */
  signal?: AbortSignal;
  isCancelled?: () => boolean;
  onProgress?: (progress: ScreeningProgress) => void;
  /** Yield to the browser event loop after this many channel/window operations. */
  yieldEvery?: number;
}

export interface ScreeningThreshold {
  name: string;
  operator: ">" | ">=" | "<" | "<=" | "ratio" | "absolute";
  value: number;
  units?: string;
  observed?: number;
}

export interface ScreeningFeatureEvidence {
  feature: string;
  value: number | string;
  units?: string;
  channelId?: string;
  channelLabel?: string;
  contextWindowSeconds?: number;
  direction?: "higher" | "lower" | "left-greater" | "right-greater" | "none";
}

export interface ScreeningChannelProvenance {
  channelId: string;
  label: string;
  canonical?: string;
  laterality: Laterality;
  kind: ChannelKind | "unknown";
  derivationEvidence: DerivationEvidenceClass;
  reference?: string;
  sources: string[];
  polarity: EvidencePolarity;
}

export interface ScreeningWindowMeasurement {
  channelId: string;
  channelLabel: string;
  contextWindowSeconds: number;
  startSeconds: number;
  endSeconds: number;
  sampleCount: number;
  finiteFraction: number;
  signedMean: number;
  median: number;
  robustScale: number;
  p05: number;
  p95: number;
  rms: number;
  peakToPeak: number;
  polarity: EvidencePolarity;
  bandPower: Record<ScreeningBand, number>;
  relativeBandPower: Record<ScreeningBand, number>;
  spectralRatios: {
    slowToFast: number;
    thetaToAlpha: number;
    highFrequencyToTotal: number;
    lineToTotal: number;
  };
  continuity: number;
  flatlineRatio: number;
  jumpRatio: number;
  clippingRatio: number;
  lineFrequencyHz: number | null;
  lineNoiseRatio: number;
  movementScore: number;
  eyeMovementScore: number;
  muscleScore: number;
}

export type ScreeningBand = "delta" | "theta" | "alpha" | "beta" | "gamma";

export interface ScreeningChannelMeasurement {
  provenance: ScreeningChannelProvenance;
  windows: ScreeningWindowMeasurement[];
  representative: ScreeningWindowMeasurement | null;
}

export interface ScreeningFinding {
  id: string;
  detector: ScreeningDetector;
  status: "screen-positive";
  title: string;
  summary: string;
  confidence: number;
  artifactProbability: number;
  polarity: EvidencePolarity;
  derivationEvidence: DerivationEvidenceClass;
  channelIds: string[];
  channelLabels: string[];
  contextWindowSeconds: number | null;
  /** Exact event boundary when an event-level detector supplies one. */
  eventInterval?: { start: number; end: number };
  featureEvidence: ScreeningFeatureEvidence[];
  thresholds: ScreeningThreshold[];
  provenance: ScreeningChannelProvenance[];
  detectorVersion: string;
  preprocessingVersion: string;
  limitations: string[];
}

export interface ScreeningDetectorEvaluation {
  detector: ScreeningDetector;
  status: ScreeningStatus;
  candidateFindingIds: string[];
  evaluatedChannelCount: number;
  thresholds: ScreeningThreshold[];
  limitations: string[];
}

export interface DeterministicScreeningResult {
  status: "complete" | "cancelled";
  detectorVersion: string;
  preprocessingVersion: string;
  screeningLabel: "deterministic screening; not clinically validated";
  recordingId?: string;
  measurements: ScreeningChannelMeasurement[];
  findings: ScreeningFinding[];
  evaluations: ScreeningDetectorEvaluation[];
  limitations: string[];
  cancelledAt?: string;
}

/** Future supervised detectors can implement this boundary without changing the UI-facing result shape. */
export interface ScreeningAdapter {
  readonly id: string;
  readonly version: string;
  run(input: ScreeningInput, options?: ScreeningOptions): Promise<DeterministicScreeningResult>;
}

interface NormalizedChannel {
  id: string;
  label: string;
  samples: ArrayLike<number>;
  sampleRate: number;
  kind: ChannelKind | "unknown";
  isEeg: boolean;
  laterality: Laterality;
  canonical?: string;
  reference?: string;
  sources: string[];
  derivationEvidence: DerivationEvidenceClass;
  unit?: string;
}

const BANDS: readonly [ScreeningBand, number, number][] = [
  ["delta", 1, 4],
  ["theta", 4, 8],
  ["alpha", 8, 13],
  ["beta", 13, 30],
  ["gamma", 30, 80],
];
const DETECTORS: readonly ScreeningDetector[] = [
  "sharp-transient-candidate",
  "rhythmic-activity",
  "periodic-activity",
  "focal-slowing",
  "generalized-slowing",
  "hemispheric-asymmetry",
  "suppression-attenuation",
  "burst-suppression",
  "fast-activity",
  "sleep-spindle",
  "k-complex-candidate",
  "flat-disconnected-electrode",
  "movement-artifact",
  "eye-movement-contamination",
  "muscle-contamination",
  "line-noise",
  "clipping-saturation",
];
const LIMITATIONS = [
  "Deterministic screening is not clinically validated and is not a diagnosis or medical advice.",
  "Thresholds are bounded heuristics and are not calibrated to an age, state, montage, amplifier, or laboratory reference range.",
  "A finding may reflect artifact, montage/reference effects, medication, state, or benign variation; human review is required.",
  "Spectral estimates are coarse finite-window estimates and do not infer morphology, phase, or clinical context.",
];

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finite(value) ? value : min));
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const position = clamp(fraction, 0, 1) * (ordered.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower);
}

function mean(values: readonly number[]): number {
  if (!values.length) return 0;
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

function safeRatio(numerator: number, denominator: number, fallback = 0): number {
  return finite(numerator) && finite(denominator) && denominator > 1e-12 ? numerator / denominator : fallback;
}

function boundedScore(value: number): number {
  if (!finite(value) || value <= 0) return 0;
  return clamp(value / (1 + value), 0, 1);
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function makeId(detector: ScreeningDetector, channels: readonly string[], context: number | null): string {
  return `ds-${detector}-${fnv1a(`${detector}|${channels.join(",")}|${context ?? "all"}`)}`;
}

function normalizeChannel(channel: ScreeningInputChannel): NormalizedChannel {
  const candidate = channel as ScreeningChannel & Partial<ProcessedTrack>;
  const kind = candidate.kind ?? "unknown";
  const sources = [...(candidate.sources ?? candidate.derivation?.sources?.map(String) ?? [])];
  const explicitEvidence = candidate.derivation && candidate.derivation.sources.length > 1
    ? "bipolar-candidate"
    : candidate.derivation && candidate.derivation.sources.length === 1
      ? "referential-electrode"
      : sources.length > 1
        ? "bipolar-candidate"
        : sources.length === 1 || Boolean(candidate.reference)
          ? "referential-electrode"
          : "ambiguous";
  return {
    id: candidate.id,
    label: candidate.label,
    samples: candidate.samples,
    sampleRate: finite(candidate.sampleRate) && candidate.sampleRate > 0 ? candidate.sampleRate : 0,
    kind,
    isEeg: candidate.isEeg ?? (kind === "eeg" || kind === "unknown"),
    laterality: candidate.laterality ?? "unknown",
    canonical: candidate.canonical,
    reference: candidate.reference,
    sources,
    derivationEvidence: explicitEvidence,
    unit: candidate.unit,
  };
}

function provenance(channel: NormalizedChannel, polarity: EvidencePolarity): ScreeningChannelProvenance {
  return {
    channelId: channel.id,
    label: channel.label,
    canonical: channel.canonical,
    laterality: channel.laterality,
    kind: channel.kind,
    derivationEvidence: channel.derivationEvidence,
    reference: channel.reference,
    sources: [...channel.sources],
    polarity,
  };
}

function windowValues(channel: NormalizedChannel, start: number, end: number): { values: number[]; finiteFraction: number } {
  const values: number[] = [];
  const total = Math.max(0, end - start);
  for (let index = start; index < end; index += 1) {
    const value = Number(channel.samples[index]);
    if (finite(value)) values.push(value);
  }
  return { values, finiteFraction: total ? values.length / total : 0 };
}

/** Coarse DFT band power, bounded to 512 samples for predictable interactive cost. */
function powerInBand(values: readonly number[], sampleRate: number, low: number, high: number): number {
  if (values.length < 4 || sampleRate <= 0 || high <= low) return 0;
  const maxSamples = 512;
  const data = values.length <= maxSamples
    ? values
    : Array.from({ length: maxSamples }, (_, index) => values[Math.floor(index * values.length / maxSamples)]);
  const n = data.length;
  const effectiveSampleRate = sampleRate * n / values.length;
  const center = mean(data);
  const upper = Math.min(high, effectiveSampleRate / 2);
  if (upper <= low) return 0;
  let power = 0;
  for (let bin = 1; bin <= Math.floor(n / 2); bin += 1) {
    const frequency = (bin * effectiveSampleRate) / n;
    if (frequency < low || frequency >= upper) continue;
    let real = 0;
    let imaginary = 0;
    const angle = (2 * Math.PI * bin) / n;
    for (let index = 0; index < n; index += 1) {
      const centered = data[index] - center;
      real += centered * Math.cos(angle * index);
      imaginary -= centered * Math.sin(angle * index);
    }
    power += (real * real + imaginary * imaginary) / (n * n);
  }
  return power;
}

function nearestBandPower(values: readonly number[], sampleRate: number, frequency: number): number {
  return powerInBand(values, sampleRate, Math.max(0.5, frequency - 1.5), frequency + 1.5);
}

function polarityOf(values: readonly number[], p05: number, p95: number): EvidencePolarity {
  const positive = Math.max(0, p95);
  const negative = Math.max(0, -p05);
  if (positive < 1e-9 && negative < 1e-9) return "unknown";
  if (positive > negative * 1.25) return "positive";
  if (negative > positive * 1.25) return "negative";
  return "mixed";
}

function longestFlatRun(values: readonly number[], tolerance: number): number {
  if (values.length < 2) return values.length;
  let longest = 1;
  let current = 1;
  for (let index = 1; index < values.length; index += 1) {
    if (Math.abs(values[index] - values[index - 1]) <= tolerance) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function resampleForFeature(values: readonly number[], targetLength: number): number[] {
  if (values.length <= targetLength) return [...values];
  return Array.from({ length: targetLength }, (_, index) => values[Math.floor(index * values.length / targetLength)]);
}

function computeWindow(
  channel: NormalizedChannel,
  startIndex: number,
  endIndex: number,
  contextWindowSeconds: number,
  lineFrequencies: readonly number[],
  recordingStartSeconds: number,
): ScreeningWindowMeasurement | null {
  const { values, finiteFraction } = windowValues(channel, startIndex, endIndex);
  if (values.length < 8 || channel.sampleRate <= 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const signedMean = mean(values);
  const med = median(sorted);
  const deviations = values.map((value) => Math.abs(value - med));
  const robustScale = Math.max(1e-12, median(deviations) * 1.4826);
  const p05 = percentile(sorted, 0.05);
  const p95 = percentile(sorted, 0.95);
  const rms = Math.sqrt(mean(values.map((value) => value * value)));
  const peakToPeak = p95 - p05;
  const centered = values.map((value) => value - med);
  const bands = Object.fromEntries(BANDS.map(([band, low, high]) => [band, powerInBand(centered, channel.sampleRate, low, high)])) as Record<ScreeningBand, number>;
  const totalBandPower = Object.values(bands).reduce((total, value) => total + value, 0);
  const relativeBandPower = Object.fromEntries(BANDS.map(([band]) => [band, safeRatio(bands[band], totalBandPower)])) as Record<ScreeningBand, number>;
  const fastPower = bands.beta + bands.gamma;
  const highFrequency = bands.beta + bands.gamma;
  const lineCandidates = lineFrequencies
    .filter((frequency) => frequency > 0 && frequency < channel.sampleRate / 2)
    .map((frequency) => ({ frequency, power: nearestBandPower(centered, channel.sampleRate, frequency) }));
  const lineCandidate = lineCandidates.sort((a, b) => b.power - a.power)[0];
  const linePower = lineCandidate?.power ?? 0;
  const jumpThreshold = Math.max(robustScale * 8, 1e-9);
  let jumps = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (Math.abs(values[index] - values[index - 1]) > jumpThreshold) jumps += 1;
  }
  const flatTolerance = Math.max(robustScale * 0.02, 1e-9);
  const flatlineRatio = clamp(longestFlatRun(values, flatTolerance) / values.length, 0, 1);
  const finiteAbsolute = values.map((value) => Math.abs(value)).sort((a, b) => a - b);
  const upper = percentile(finiteAbsolute, 0.999);
  const endpointRatio = upper > 0
    ? values.filter((value) => Math.abs(value) >= upper * 0.995).length / values.length
    : 1;
  const clippingRatio = clamp(Math.max(endpointRatio - 0.002, 0), 0, 1);
  const lowFrequency = bands.delta + bands.theta;
  const movementScore = clamp(
    0.55 * boundedScore(safeRatio(peakToPeak, robustScale * 12)) +
      0.3 * relativeBandPower.delta + 0.15 * clamp(safeRatio(jumps, values.length) * 80, 0, 1),
    0,
    1,
  );
  const eyeMovementScore = clamp(0.75 * safeRatio(lowFrequency, totalBandPower) + 0.25 * boundedScore(safeRatio(peakToPeak, robustScale * 8)), 0, 1);
  const muscleScore = clamp(0.75 * safeRatio(highFrequency, totalBandPower) + 0.25 * clamp(safeRatio(jumps, values.length) * 30, 0, 1), 0, 1);
  return {
    channelId: channel.id,
    channelLabel: channel.label,
    contextWindowSeconds,
    startSeconds: recordingStartSeconds + startIndex / channel.sampleRate,
    endSeconds: recordingStartSeconds + endIndex / channel.sampleRate,
    sampleCount: values.length,
    finiteFraction,
    signedMean,
    median: med,
    robustScale,
    p05,
    p95,
    rms,
    peakToPeak,
    polarity: polarityOf(values, p05, p95),
    bandPower: bands,
    relativeBandPower,
    spectralRatios: {
      slowToFast: safeRatio(lowFrequency, fastPower),
      thetaToAlpha: safeRatio(bands.theta, bands.alpha),
      highFrequencyToTotal: safeRatio(highFrequency, totalBandPower),
      lineToTotal: safeRatio(linePower, totalBandPower),
    },
    continuity: clamp(finiteFraction * (1 - safeRatio(jumps, Math.max(1, values.length - 1))), 0, 1),
    flatlineRatio,
    jumpRatio: safeRatio(jumps, Math.max(1, values.length - 1)),
    clippingRatio,
    lineFrequencyHz: lineCandidate?.frequency ?? null,
    lineNoiseRatio: safeRatio(linePower, totalBandPower),
    movementScore,
    eyeMovementScore,
    muscleScore,
  };
}

function representative(windows: readonly ScreeningWindowMeasurement[]): ScreeningWindowMeasurement | null {
  if (!windows.length) return null;
  const longest = Math.max(...windows.map((window) => window.contextWindowSeconds));
  const candidates = windows.filter((window) => window.contextWindowSeconds === longest);
  const pick = (field: keyof ScreeningWindowMeasurement): number => median(candidates.map((candidate) => Number(candidate[field])));
  const first = candidates[0];
  if (candidates.length === 1) return first;
  return {
    ...first,
    startSeconds: Math.min(...candidates.map((candidate) => candidate.startSeconds)),
    endSeconds: Math.max(...candidates.map((candidate) => candidate.endSeconds)),
    sampleCount: Math.round(mean(candidates.map((candidate) => candidate.sampleCount))),
    finiteFraction: pick("finiteFraction"),
    signedMean: pick("signedMean"),
    median: pick("median"),
    robustScale: pick("robustScale"),
    p05: pick("p05"),
    p95: pick("p95"),
    rms: pick("rms"),
    peakToPeak: pick("peakToPeak"),
    bandPower: Object.fromEntries(BANDS.map(([band]) => [band, median(candidates.map((candidate) => candidate.bandPower[band]))])) as Record<ScreeningBand, number>,
    relativeBandPower: Object.fromEntries(BANDS.map(([band]) => [band, median(candidates.map((candidate) => candidate.relativeBandPower[band]))])) as Record<ScreeningBand, number>,
    spectralRatios: {
      slowToFast: median(candidates.map((candidate) => candidate.spectralRatios.slowToFast)),
      thetaToAlpha: median(candidates.map((candidate) => candidate.spectralRatios.thetaToAlpha)),
      highFrequencyToTotal: median(candidates.map((candidate) => candidate.spectralRatios.highFrequencyToTotal)),
      lineToTotal: median(candidates.map((candidate) => candidate.spectralRatios.lineToTotal)),
    },
    continuity: pick("continuity"),
    flatlineRatio: pick("flatlineRatio"),
    jumpRatio: pick("jumpRatio"),
    clippingRatio: pick("clippingRatio"),
    lineNoiseRatio: pick("lineNoiseRatio"),
    movementScore: pick("movementScore"),
    eyeMovementScore: pick("eyeMovementScore"),
    muscleScore: pick("muscleScore"),
  };
}

function detectorPolarity(channels: readonly ScreeningChannelMeasurement[]): EvidencePolarity {
  const polarities = channels.map((channel) => channel.representative?.polarity).filter(Boolean) as EvidencePolarity[];
  if (!polarities.length || polarities.includes("unknown")) return "unknown";
  const hasPositive = polarities.includes("positive");
  const hasNegative = polarities.includes("negative");
  if (hasPositive && hasNegative) return "mixed";
  return hasPositive ? "positive" : hasNegative ? "negative" : "mixed";
}

function derivationClass(channels: readonly ScreeningChannelMeasurement[]): DerivationEvidenceClass {
  const classes = new Set(channels.map((channel) => channel.provenance.derivationEvidence));
  if (classes.size === 1) return [...classes][0];
  if (classes.has("bipolar-candidate") && classes.has("referential-electrode")) return "mixed";
  if (classes.has("ambiguous") || classes.has("unknown")) return "ambiguous";
  return "mixed";
}

function addFinding(
  findings: ScreeningFinding[],
  detector: ScreeningDetector,
  title: string,
  summary: string,
  channels: readonly ScreeningChannelMeasurement[],
  contextWindowSeconds: number | null,
  evidence: ScreeningFeatureEvidence[],
  thresholds: ScreeningThreshold[],
  confidence: number,
  artifactProbability: number,
  limitations: string[] = [],
): ScreeningFinding {
  const id = makeId(detector, channels.map((channel) => channel.provenance.channelId), contextWindowSeconds);
  const finding: ScreeningFinding = {
    id,
    detector,
    status: "screen-positive",
    title,
    summary,
    confidence: clamp(confidence, 0, 1),
    artifactProbability: clamp(artifactProbability, 0, 1),
    polarity: detectorPolarity(channels),
    derivationEvidence: derivationClass(channels),
    channelIds: channels.map((channel) => channel.provenance.channelId),
    channelLabels: channels.map((channel) => channel.provenance.label),
    contextWindowSeconds,
    featureEvidence: evidence,
    thresholds,
    provenance: channels.map((channel) => channel.provenance),
    detectorVersion: DETERMINISTIC_SCREENING_VERSION,
    preprocessingVersion: SCREENING_PREPROCESSING_VERSION,
    limitations: [...LIMITATIONS, ...limitations],
  };
  findings.push(finding);
  return finding;
}

function usable(measurements: readonly ScreeningChannelMeasurement[]): ScreeningChannelMeasurement[] {
  return measurements.filter((measurement) => measurement.representative !== null);
}

function detectorThresholds(detector: ScreeningDetector): ScreeningThreshold[] {
  switch (detector) {
    case "sharp-transient-candidate": return [{ name: "duration", operator: ">=", value: 20, units: "ms" }, { name: "duration", operator: "<=", value: 200, units: "ms" }, { name: "local robust-scale deviation", operator: ">=", value: 5, units: "ratio" }, { name: "adjacent-channel support", operator: ">=", value: 2, units: "channels" }];
    case "rhythmic-activity": return [{ name: "autocorrelation peak", operator: ">=", value: 0.5, units: "correlation" }, { name: "spectral concentration", operator: ">=", value: 0.35, units: "relative" }, { name: "cycles", operator: ">=", value: 4, units: "cycles" }];
    case "periodic-activity": return [{ name: "repeating field events", operator: ">=", value: 3, units: "events" }, { name: "interval coefficient of variation", operator: "<=", value: 0.25, units: "ratio" }, { name: "template correlation", operator: ">=", value: 0.65, units: "correlation" }];
    case "focal-slowing": return [{ name: "slow relative power", operator: ">=", value: 0.6, units: "relative" }, { name: "slow-to-fast ratio", operator: ">=", value: 1.5, units: "ratio" }, { name: "homologous slow-power ratio", operator: ">=", value: 1.5, units: "ratio" }];
    case "generalized-slowing": return [{ name: "fraction of channels with slow relative power", operator: ">=", value: 0.6, units: "fraction" }, { name: "posterior alpha relative power", operator: "<", value: 0.25, units: "relative" }];
    case "hemispheric-asymmetry": return [{ name: "left/right total-power ratio", operator: "ratio", value: 1.8, units: "ratio" }];
    case "suppression-attenuation": return [{ name: "peak-to-peak amplitude", operator: "<", value: 10, units: "input units" }, { name: "absolute RMS support", operator: "<", value: 5, units: "input units" }];
    case "burst-suppression": return [{ name: "suppression fraction", operator: ">=", value: 0.2, units: "fraction" }, { name: "burst fraction", operator: ">=", value: 0.1, units: "fraction" }, { name: "high/low envelope ratio", operator: ">=", value: 4, units: "ratio" }];
    case "fast-activity": return [{ name: "frequency", operator: ">=", value: 20, units: "Hz" }, { name: "frequency", operator: "<=", value: 40, units: "Hz" }, { name: "spectral concentration", operator: ">=", value: 0.35, units: "relative" }];
    case "sleep-spindle": return [{ name: "frequency", operator: ">=", value: 11, units: "Hz" }, { name: "frequency", operator: "<=", value: 16, units: "Hz" }, { name: "duration", operator: ">=", value: 0.5, units: "seconds" }];
    case "k-complex-candidate": return [{ name: "duration", operator: ">=", value: 0.5, units: "seconds" }, { name: "duration", operator: "<=", value: 1.5, units: "seconds" }, { name: "robust-scale deviation", operator: ">=", value: 4, units: "ratio" }];
    case "flat-disconnected-electrode": return [{ name: "flatline ratio", operator: ">=", value: 0.95, units: "fraction" }, { name: "continuity", operator: "<", value: 0.5, units: "fraction" }];
    case "movement-artifact": return [{ name: "movement score", operator: ">=", value: 0.72, units: "score" }, { name: "peak-to-peak robust ratio", operator: ">=", value: 4, units: "ratio" }];
    case "eye-movement-contamination": return [{ name: "low-frequency relative power", operator: ">=", value: 0.6, units: "relative" }, { name: "eye/frontal score", operator: ">=", value: 0.65, units: "score" }];
    case "muscle-contamination": return [{ name: "high-frequency relative power", operator: ">=", value: 0.5, units: "relative" }, { name: "muscle score", operator: ">=", value: 0.55, units: "score" }];
    case "line-noise": return [{ name: "line-frequency relative power", operator: ">=", value: 0.12, units: "relative" }];
    case "clipping-saturation": return [{ name: "clipping ratio", operator: ">=", value: 0.005, units: "fraction" }];
  }
}

function isFrontal(channel: ScreeningChannelMeasurement): boolean {
  const value = `${channel.provenance.canonical ?? ""} ${channel.provenance.label}`.toUpperCase();
  return /(^|[^A-Z])(FP|F|AF|EOG|LOC|ROC|EYE|PG)/.test(value);
}

function evaluateDetectors(
  measurements: readonly ScreeningChannelMeasurement[],
  input: ScreeningInput,
  lineFrequencies: readonly number[],
  onProgress?: (fraction: number) => void,
): { findings: ScreeningFinding[]; evaluations: ScreeningDetectorEvaluation[] } {
  const findings: ScreeningFinding[] = [];
  const evaluations: ScreeningDetectorEvaluation[] = [];
  const eeg = usable(measurements.filter((measurement) => measurement.provenance.kind === "eeg" || measurement.provenance.kind === "unknown"));
  const all = usable(measurements);
  const refs = all.map((measurement) => measurement.representative as ScreeningWindowMeasurement);
  const cohortSlow = median(refs.map((measurement) => measurement.relativeBandPower.delta + measurement.relativeBandPower.theta));
  const cohortScale = median(refs.map((measurement) => measurement.robustScale));
  const cohortRms = median(refs.map((measurement) => measurement.rms));
  const cohortPeak = median(refs.map((measurement) => measurement.peakToPeak));
  const pairs = input.comparisonPairs?.length ? input.comparisonPairs : inferPairs(eeg);
  const evaluationSteps = DETECTORS.length + 1;
  let completedSteps = 0;
  const reportDetectorProgress = () => {
    completedSteps += 1;
    onProgress?.(completedSteps / evaluationSteps);
  };
  const positive = (detector: ScreeningDetector, channels: readonly ScreeningChannelMeasurement[], context: number | null, evidence: ScreeningFeatureEvidence[], confidence: number, artifactProbability: number, summary: string, limitations: string[] = []): void => {
    const thresholdList = detectorThresholds(detector);
    const finding = addFinding(findings, detector, detector.replace(/-/g, " "), summary, channels, context, evidence, thresholdList, confidence, artifactProbability, limitations);
    const existing = evaluations.find((evaluation) => evaluation.detector === detector);
    if (existing) existing.candidateFindingIds.push(finding.id);
  };
  const evaluate = (detector: ScreeningDetector, hit: boolean, evaluatedChannelCount: number, limitations: string[] = []): void => {
    const status: ScreeningStatus = evaluatedChannelCount === 0 ? "insufficient-data" : hit ? "screen-positive" : "not-detected";
    evaluations.push({ detector, status, candidateFindingIds: [], evaluatedChannelCount, thresholds: detectorThresholds(detector), limitations: [...LIMITATIONS, ...limitations] });
    reportDetectorProgress();
  };

  const slowingChannels = eeg.filter((channel) => {
    const metric = channel.representative as ScreeningWindowMeasurement;
    const slow = metric.relativeBandPower.delta + metric.relativeBandPower.theta;
    return slow >= 0.6 && metric.spectralRatios.slowToFast >= 1.5;
  });
  const homologousRatio = (channel: ScreeningChannelMeasurement): number | null => {
    const pair = pairs.find((candidate) => candidate.left === channel.provenance.channelId || candidate.right === channel.provenance.channelId);
    if (!pair) return null;
    const otherId = pair.left === channel.provenance.channelId ? pair.right : pair.left;
    const other = eeg.find((candidate) => candidate.provenance.channelId === otherId)?.representative;
    if (!other || !channel.representative) return null;
    const ownSlow = channel.representative.relativeBandPower.delta + channel.representative.relativeBandPower.theta;
    const otherSlow = other.relativeBandPower.delta + other.relativeBandPower.theta;
    return safeRatio(ownSlow, Math.max(otherSlow, 0.02));
  };
  const focal = slowingChannels.filter((channel) => {
    const ratio = homologousRatio(channel);
    if (ratio !== null) return ratio >= 1.5;
    const metric = channel.representative as ScreeningWindowMeasurement;
    return safeRatio(metric.relativeBandPower.delta + metric.relativeBandPower.theta, Math.max(cohortSlow, 0.02)) >= 1.35;
  });
  evaluate("focal-slowing", focal.length > 0, eeg.length);
  for (const channel of focal) {
    const metric = channel.representative as ScreeningWindowMeasurement;
    positive("focal-slowing", [channel], metric.contextWindowSeconds, [
      { feature: "delta_plus_theta_relative_power", value: metric.relativeBandPower.delta + metric.relativeBandPower.theta, units: "relative", channelId: channel.provenance.channelId, channelLabel: channel.provenance.label, contextWindowSeconds: metric.contextWindowSeconds, direction: "higher" },
      { feature: "slow_to_fast_ratio", value: metric.spectralRatios.slowToFast, units: "ratio", channelId: channel.provenance.channelId, direction: "higher" },
      { feature: "slow_relative_to_cohort", value: safeRatio(metric.relativeBandPower.delta + metric.relativeBandPower.theta, Math.max(cohortSlow, 0.02)), units: "ratio", channelId: channel.provenance.channelId, direction: "higher" },
      ...(homologousRatio(channel) === null ? [] : [{ feature: "slow_relative_to_homologous_channel", value: homologousRatio(channel) as number, units: "ratio", channelId: channel.provenance.channelId, direction: "higher" as const }]),
    ], clamp(0.55 + 0.2 * boundedScore(metric.spectralRatios.slowToFast - 1.5), 0, 1), 0.15, `Relative slowing screen in ${channel.provenance.label}; focal localization is provisional and montage-dependent.`, homologousRatio(channel) === null ? ["No homologous contralateral channel was available; the channel cohort was used as the comparator."] : []);
  }

  const generalizedFraction = eeg.length ? slowingChannels.length / eeg.length : 0;
  const posterior = eeg.filter((channel) => /(^|[^A-Z])(P3|P4|PZ|O1|O2|P7|P8)([^A-Z]|$)/i.test(`${channel.provenance.canonical ?? ""} ${channel.provenance.label}`));
  const posteriorAlpha = posterior.length
    ? median(posterior.map((channel) => (channel.representative as ScreeningWindowMeasurement).relativeBandPower.alpha))
    : null;
  const reducedPosteriorDominantActivity = posteriorAlpha === null || posteriorAlpha < 0.25;
  const generalized = eeg.length >= 2 && generalizedFraction >= 0.6 && reducedPosteriorDominantActivity;
  evaluate("generalized-slowing", generalized, eeg.length);
  if (generalized) positive("generalized-slowing", eeg, null, [{ feature: "channels_meeting_slowing_rule", value: slowingChannels.length, units: "channels", direction: "higher" }, { feature: "slow_channel_fraction", value: generalizedFraction, units: "fraction", direction: "higher" }, ...(posteriorAlpha === null ? [] : [{ feature: "posterior_alpha_relative_power", value: posteriorAlpha, units: "relative", direction: "lower" as const }])], clamp(0.55 + generalizedFraction * 0.35, 0, 1), 0.15, "A majority of eligible EEG channels have increased low-frequency power with reduced posterior alpha when posterior channels are available.", posteriorAlpha === null ? ["No posterior channels were available, so posterior dominant activity could not be measured."] : []);
  let asymmetryHit = false;
  for (const pair of pairs) {
    const left = eeg.find((channel) => channel.provenance.channelId === pair.left);
    const right = eeg.find((channel) => channel.provenance.channelId === pair.right);
    if (!left || !right || !left.representative || !right.representative) continue;
    const leftMetric = left.representative;
    const rightMetric = right.representative;
    const leftPower = Object.values(leftMetric.bandPower).reduce((sum, value) => sum + value, 0);
    const rightPower = Object.values(rightMetric.bandPower).reduce((sum, value) => sum + value, 0);
    const ratio = safeRatio(Math.max(leftPower, rightPower), Math.min(leftPower, rightPower));
    if (ratio < 1.8) continue;
    asymmetryHit = true;
    const leftGreater = leftPower > rightPower;
    const channels = leftGreater ? [left, right] : [right, left];
    positive("hemispheric-asymmetry", channels, Math.max(leftMetric.contextWindowSeconds, rightMetric.contextWindowSeconds), [
      { feature: "left_total_power", value: leftPower, units: "power", channelId: left.provenance.channelId, direction: leftGreater ? "left-greater" : "right-greater" },
      { feature: "right_total_power", value: rightPower, units: "power", channelId: right.provenance.channelId, direction: leftGreater ? "left-greater" : "right-greater" },
      { feature: "left_right_power_ratio", value: ratio, units: "ratio", direction: leftGreater ? "left-greater" : "right-greater" },
    ], clamp(0.55 + 0.2 * boundedScore(ratio - 1.8), 0, 1), 0.2, `Power asymmetry screen between ${pair.label ?? `${pair.left} and ${pair.right}`}; polarity and reference effects are preserved as unresolved ambiguity.`, ["Side-by-side comparison is only attempted for explicit or inferred pairs; unknown laterality is excluded."]);
  }
  evaluate("hemispheric-asymmetry", asymmetryHit, pairs.length);

  const suppressed = eeg.filter((channel) => {
    const metric = channel.representative as ScreeningWindowMeasurement;
    return metric.peakToPeak < 10 && metric.rms < 5;
  });
  evaluate("suppression-attenuation", suppressed.length > 0, eeg.length);
  for (const channel of suppressed) {
    const metric = channel.representative as ScreeningWindowMeasurement;
    positive("suppression-attenuation", [channel], metric.contextWindowSeconds, [{ feature: "peak_to_peak", value: metric.peakToPeak, units: "input units", channelId: channel.provenance.channelId, direction: "lower" }, { feature: "robust_scale_to_cohort", value: safeRatio(metric.robustScale, Math.max(cohortScale, 1e-9)), units: "ratio", channelId: channel.provenance.channelId, direction: "lower" }, { feature: "rms", value: metric.rms, units: channel.provenance.kind === "eeg" ? "input units" : undefined, channelId: channel.provenance.channelId, direction: "lower" }], 0.58, 0.25, `Sustained very-low peak-to-peak amplitude screen in ${channel.provenance.label}; absolute scale depends on input calibration.`);
  }

  const disconnected = all.filter((channel) => {
    const metric = channel.representative as ScreeningWindowMeasurement;
    return metric.finiteFraction < 0.98 || metric.flatlineRatio >= 0.95 || metric.continuity < 0.5;
  });
  evaluate("flat-disconnected-electrode", disconnected.length > 0, all.length);
  for (const channel of disconnected) {
    const metric = channel.representative as ScreeningWindowMeasurement;
    positive("flat-disconnected-electrode", [channel], metric.contextWindowSeconds, [{ feature: "flatline_ratio", value: metric.flatlineRatio, units: "fraction", channelId: channel.provenance.channelId, direction: "higher" }, { feature: "continuity", value: metric.continuity, units: "fraction", channelId: channel.provenance.channelId, direction: "lower" }, { feature: "finite_fraction", value: metric.finiteFraction, units: "fraction", channelId: channel.provenance.channelId, direction: "lower" }], 0.7, 0.9, `Flat or disconnected-channel screen for ${channel.provenance.label}.`, ["A flat signal can also be intentional suppression or an out-of-range display segment."]);
  }

  const movement = all.filter((channel) => {
    const metric = channel.representative as ScreeningWindowMeasurement;
    return metric.movementScore >= 0.72 && safeRatio(metric.peakToPeak, Math.max(cohortPeak, 1e-9)) >= 4;
  });
  evaluate("movement-artifact", movement.length > 0, all.length);
  for (const channel of movement) {
    const metric = channel.representative as ScreeningWindowMeasurement;
    positive("movement-artifact", [channel], metric.contextWindowSeconds, [{ feature: "movement_score", value: metric.movementScore, units: "score", channelId: channel.provenance.channelId, direction: "higher" }, { feature: "peak_to_peak_to_cohort", value: safeRatio(metric.peakToPeak, Math.max(cohortPeak, 1e-9)), units: "ratio", channelId: channel.provenance.channelId, direction: "higher" }], 0.65, 0.92, `High-amplitude, low-frequency transient screen in ${channel.provenance.label}.`);
  }

  const eyeCandidates = all.filter((channel) => {
    const metric = channel.representative as ScreeningWindowMeasurement;
    const explicitEye = channel.provenance.kind === "eog" || /EOG|LOC|ROC|EYE|BLINK|PG[12]/i.test(channel.provenance.label);
    return (explicitEye || isFrontal(channel)) && metric.eyeMovementScore >= 0.65 && metric.relativeBandPower.delta + metric.relativeBandPower.theta >= 0.6;
  });
  evaluate("eye-movement-contamination", eyeCandidates.length > 0, all.length);
  for (const channel of eyeCandidates) {
    const metric = channel.representative as ScreeningWindowMeasurement;
    positive("eye-movement-contamination", [channel], metric.contextWindowSeconds, [{ feature: "eye_movement_score", value: metric.eyeMovementScore, units: "score", channelId: channel.provenance.channelId, direction: "higher" }, { feature: "delta_plus_theta_relative_power", value: metric.relativeBandPower.delta + metric.relativeBandPower.theta, units: "relative", channelId: channel.provenance.channelId, direction: "higher" }], 0.65, 0.96, `Eye-movement contamination screen in ${channel.provenance.label}; frontal scalp evidence is not equivalent to an EOG channel.`);
  }

  const muscle = all.filter((channel) => {
    const metric = channel.representative as ScreeningWindowMeasurement;
    return metric.muscleScore >= 0.55 && metric.spectralRatios.highFrequencyToTotal >= 0.5;
  });
  evaluate("muscle-contamination", muscle.length > 0, all.length);
  for (const channel of muscle) {
    const metric = channel.representative as ScreeningWindowMeasurement;
    positive("muscle-contamination", [channel], metric.contextWindowSeconds, [{ feature: "muscle_score", value: metric.muscleScore, units: "score", channelId: channel.provenance.channelId, direction: "higher" }, { feature: "high_frequency_relative_power", value: metric.spectralRatios.highFrequencyToTotal, units: "relative", channelId: channel.provenance.channelId, direction: "higher" }], 0.62, 0.97, `High-frequency muscle-contamination screen in ${channel.provenance.label}.`, ["High-frequency power is affected by sample rate, anti-alias filtering, and amplifier bandwidth."]);
  }

  const line = all.filter((channel) => {
    const metric = channel.representative as ScreeningWindowMeasurement;
    return metric.lineNoiseRatio >= 0.12;
  });
  evaluate("line-noise", line.length > 0, all.length, ["Mains frequency is inferred from configured candidate frequencies and is not a source-separated estimate."]);
  for (const channel of line) {
    const metric = channel.representative as ScreeningWindowMeasurement;
    positive("line-noise", [channel], metric.contextWindowSeconds, [{ feature: "line_noise_ratio", value: metric.lineNoiseRatio, units: "relative", channelId: channel.provenance.channelId, direction: "higher" }, { feature: "line_frequency_hz", value: metric.lineFrequencyHz ?? "unknown", units: "Hz", channelId: channel.provenance.channelId }], clamp(0.55 + metric.lineNoiseRatio, 0, 1), 0.9, `Narrow-band mains-frequency screen in ${channel.provenance.label}.`, ["Harmonics and physiologic narrow-band rhythms can produce the same bounded feature."]);
  }

  const clipped = all.filter((channel) => {
    const metric = channel.representative as ScreeningWindowMeasurement;
    return metric.clippingRatio >= 0.005;
  });
  evaluate("clipping-saturation", clipped.length > 0, all.length);
  for (const channel of clipped) {
    const metric = channel.representative as ScreeningWindowMeasurement;
    positive("clipping-saturation", [channel], metric.contextWindowSeconds, [{ feature: "clipping_ratio", value: metric.clippingRatio, units: "fraction", channelId: channel.provenance.channelId, direction: "higher" }, { feature: "p05", value: metric.p05, units: "input units", channelId: channel.provenance.channelId }, { feature: "p95", value: metric.p95, units: "input units", channelId: channel.provenance.channelId }], 0.75, 0.99, `Repeated-extrema saturation screen in ${channel.provenance.label}.`, ["Without amplifier digital-range metadata, this is a repeated-extrema heuristic rather than a definitive ADC clip detector."]);
  }

  const temporal = detectTemporalPhenomena(input.channels.map(normalizeChannel));
  reportDetectorProgress();
  const recordingOffset = input.startTimeSeconds ?? 0;
  for (const evaluation of temporal.evaluations) {
    evaluations.push({
      detector: evaluation.detector,
      status: evaluation.evaluatedChannelCount === 0
        ? "insufficient-data"
        : evaluation.candidateCount > 0
          ? "screen-positive"
          : "not-detected",
      candidateFindingIds: [],
      evaluatedChannelCount: evaluation.evaluatedChannelCount,
      thresholds: detectorThresholds(evaluation.detector),
      limitations: [...LIMITATIONS, ...evaluation.limitations],
    });
  }
  for (const phenomenon of temporal.phenomena) {
    const channels = phenomenon.channelIds
      .map((id) => measurements.find((measurement) => measurement.provenance.channelId === id))
      .filter((measurement): measurement is ScreeningChannelMeasurement => Boolean(measurement));
    if (!channels.length) continue;
    const featureEvidence: ScreeningFeatureEvidence[] = Object.entries(phenomenon.evidence)
      .filter(([, value]) => typeof value === "number" || typeof value === "boolean")
      .map(([feature, value]) => ({
        feature,
        value: typeof value === "boolean" ? String(value) : value as number,
        direction: "none",
      }));
    const finding = addFinding(
      findings,
      phenomenon.detector,
      phenomenon.title,
      phenomenon.summary,
      channels,
      null,
      featureEvidence,
      detectorThresholds(phenomenon.detector),
      phenomenon.confidence,
      phenomenon.artifactProbability,
      phenomenon.limitations,
    );
    finding.eventInterval = {
      start: recordingOffset + phenomenon.evidence.startSeconds,
      end: recordingOffset + phenomenon.evidence.endSeconds,
    };
    // A detector can emit many intervals for the same channel set. Include
    // the measured bounds in its stable identity so UI selection never
    // collapses repeated findings onto the first matching marker.
    finding.id = `${finding.id}-${Math.round(finding.eventInterval.start * 1000)}-${Math.round(finding.eventInterval.end * 1000)}`;
  }

  // Keep detector order stable even when no channel had enough data.
  for (const detector of DETECTORS) {
    if (!evaluations.some((evaluation) => evaluation.detector === detector)) evaluate(detector, false, detector === "hemispheric-asymmetry" ? pairs.length : all.length);
  }
  for (const evaluation of evaluations) {
    evaluation.candidateFindingIds = findings
      .filter((finding) => finding.detector === evaluation.detector)
      .map((finding) => finding.id);
  }
  return { findings, evaluations: evaluations.sort((a, b) => DETECTORS.indexOf(a.detector) - DETECTORS.indexOf(b.detector)) };
}

function inferPairs(channels: readonly ScreeningChannelMeasurement[]): ScreeningComparisonPair[] {
  const left = channels.filter((channel) => channel.provenance.laterality === "left");
  const right = channels.filter((channel) => channel.provenance.laterality === "right");
  const pairs: ScreeningComparisonPair[] = [];
  for (const leftChannel of left) {
    const leftKey = (leftChannel.provenance.canonical ?? leftChannel.provenance.label).toUpperCase().replace(/[LR]/g, "");
    const match = right.find((rightChannel) => (rightChannel.provenance.canonical ?? rightChannel.provenance.label).toUpperCase().replace(/[LR]/g, "") === leftKey);
    if (match) pairs.push({ left: leftChannel.provenance.channelId, right: match.provenance.channelId, label: `${leftChannel.provenance.label} ↔ ${match.provenance.label}` });
  }
  return pairs;
}

function normalizedWindows(options: ScreeningOptions): number[] {
  const raw = options.contextWindowSeconds === undefined
    ? [2, 10, 30]
    : typeof options.contextWindowSeconds === "number"
      ? [options.contextWindowSeconds]
      : [...options.contextWindowSeconds];
  const cap = clamp(options.maxContextWindowSeconds ?? 60, 1, 300);
  const values = raw.map((value) => clamp(value, 0.5, cap)).filter((value) => finite(value));
  return [...new Set(values.map((value) => Math.round(value * 1000) / 1000))].sort((a, b) => a - b).slice(0, 8);
}

function cancelled(options: ScreeningOptions): boolean {
  return options.signal?.aborted === true || options.isCancelled?.() === true;
}

function emitProgress(options: ScreeningOptions, progress: ScreeningProgress, fractionOverride?: number): void {
  options.onProgress?.({
    ...progress,
    fraction: fractionOverride ?? (progress.total ? clamp(progress.completed / progress.total, 0, 1) : 1),
  });
}

function cancelledResult(measurements: ScreeningChannelMeasurement[], input: ScreeningInput): DeterministicScreeningResult {
  return {
    status: "cancelled",
    detectorVersion: DETERMINISTIC_SCREENING_VERSION,
    preprocessingVersion: SCREENING_PREPROCESSING_VERSION,
    screeningLabel: "deterministic screening; not clinically validated",
    recordingId: input.recordingId,
    measurements,
    findings: [],
    evaluations: [],
    limitations: [...LIMITATIONS, "The run was cancelled before all requested channels/windows were processed."],
    cancelledAt: new Date().toISOString(),
  };
}

/** Synchronous adapter for workers, tests, and callers that already own scheduling. */
export function runDeterministicScreeningSync(input: ScreeningInput, options: ScreeningOptions = {}): DeterministicScreeningResult {
  const channels = input.channels.map(normalizeChannel);
  const windows = normalizedWindows(options);
  const lineFrequencies = [...(options.lineFrequenciesHz ?? [50, 60])].filter((frequency) => finite(frequency) && frequency > 0);
  const measurements: ScreeningChannelMeasurement[] = [];
  const total = channels.length * Math.max(windows.length, 1);
  let completed = 0;
  for (const channel of channels) {
    const channelWindows: ScreeningWindowMeasurement[] = [];
    if (channel.sampleRate > 0) {
      for (const contextWindowSeconds of windows) {
        if (cancelled(options)) return cancelledResult(measurements, input);
        const count = Number(channel.samples.length) || 0;
        const windowSize = Math.max(8, Math.round(contextWindowSeconds * channel.sampleRate));
        const maxStart = Math.max(0, count - windowSize);
        // Non-overlapping windows cover the segment and make context size explicit.
        for (let start = 0; start < count; start += windowSize) {
          const end = Math.min(count, start + windowSize);
          if (end - start < Math.min(windowSize, 8)) continue;
          const measurement = computeWindow(channel, start, end, contextWindowSeconds, lineFrequencies, input.startTimeSeconds ?? 0);
          if (measurement) channelWindows.push(measurement);
          if (start >= maxStart && end === count) break;
        }
        completed += 1;
        emitProgress(
          options,
          { phase: "measurements", completed, total, fraction: 0, channelId: channel.id, contextWindowSeconds },
          total ? (completed / total) * 0.75 : 0.75,
        );
      }
    } else {
      completed += windows.length;
      emitProgress(
        options,
        { phase: "measurements", completed, total, fraction: 0, channelId: channel.id },
        total ? (completed / total) * 0.75 : 0.75,
      );
    }
    const first = channelWindows[0];
    measurements.push({ provenance: provenance(channel, first?.polarity ?? "unknown"), windows: channelWindows, representative: representative(channelWindows) });
  }
  if (cancelled(options)) return cancelledResult(measurements, input);
  emitProgress(options, { phase: "detectors", completed: total, total, fraction: 0 }, 0.75);
  const result = evaluateDetectors(measurements, input, lineFrequencies, (fraction) => {
    emitProgress(
      options,
      { phase: "detectors", completed: total, total, fraction: 0 },
      0.75 + fraction * 0.24,
    );
  });
  emitProgress(options, { phase: "complete", completed: total, total, fraction: 1 }, 1);
  return {
    status: "complete",
    detectorVersion: DETERMINISTIC_SCREENING_VERSION,
    preprocessingVersion: SCREENING_PREPROCESSING_VERSION,
    screeningLabel: "deterministic screening; not clinically validated",
    recordingId: input.recordingId,
    measurements,
    findings: result.findings,
    evaluations: result.evaluations,
    limitations: [...LIMITATIONS, "Referential versus bipolar status is reported as evidence provenance; it is never silently inferred as a clinical montage."],
  };
}

/**
 * Async entry point. It yields between bounded work units so an interactive
 * review can cancel a long recording without changing detector semantics.
 */
export async function runDeterministicScreening(input: ScreeningInput, options: ScreeningOptions = {}): Promise<DeterministicScreeningResult> {
  const yieldEvery = Math.max(1, Math.round(options.yieldEvery ?? 4));
  let ticks = 0;
  const previousProgress = options.onProgress;
  const wrappedOptions: ScreeningOptions = {
    ...options,
    onProgress: (progress) => {
      previousProgress?.(progress);
      ticks += 1;
    },
  };
  // Scheduling is deliberately lightweight; the pure implementation remains the source of truth.
  if (cancelled(options)) return cancelledResult([], input);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  if (cancelled(options)) return cancelledResult([], input);
  const result = runDeterministicScreeningSync(input, wrappedOptions);
  // A microtask boundary keeps cancellation/progress consumers responsive even for short inputs.
  if (ticks >= yieldEvery) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  return result;
}

export const screenDeterministic = runDeterministicScreening;
export const screenDeterministicSync = runDeterministicScreeningSync;

const ANNOTATION_TYPE_BY_DETECTOR: Record<ScreeningDetector, MorphologyType> = {
  "sharp-transient-candidate": "sharp",
  "rhythmic-activity": "comment",
  "periodic-activity": "periodic",
  "focal-slowing": "slow",
  "generalized-slowing": "slow",
  "hemispheric-asymmetry": "comment",
  "suppression-attenuation": "slow",
  "burst-suppression": "burst-suppression",
  "fast-activity": "muscle",
  "sleep-spindle": "spindle",
  "k-complex-candidate": "slow",
  "flat-disconnected-electrode": "comment",
  "movement-artifact": "comment",
  "eye-movement-contamination": "blink",
  "muscle-contamination": "muscle",
  "line-noise": "comment",
  "clipping-saturation": "comment",
};

/**
 * UI adapter for the existing review-marker surface. Event detectors retain
 * their measured interval. Record-level screens become short rail markers at
 * time zero so they are visible in the event list without painting a
 * whole-record annotation across every waveform lane.
 */
export function detectDeterministicAnnotations(
  channels: readonly ScreeningInputChannel[],
  durationSeconds: number,
  options: ScreeningOptions = {},
): Annotation[] {
  const duration = Math.max(0, durationSeconds);
  const context = clamp(duration || 30, 2, 300);
  const result = runDeterministicScreeningSync(
    { channels, durationSeconds: duration },
    {
      ...options,
      contextWindowSeconds: context,
      maxContextWindowSeconds: context,
    },
  );
  const detectorCounts = new Map<ScreeningDetector, number>();
  const bucketCounts = new Map<string, number>();
  const selected = [...result.findings]
    .sort((a, b) => b.confidence - a.confidence || (a.eventInterval?.start ?? 0) - (b.eventInterval?.start ?? 0))
    .filter((finding) => {
      const detectorCount = detectorCounts.get(finding.detector) ?? 0;
      const detectorLimit = finding.eventInterval ? 40 : 3;
      if (detectorCount >= detectorLimit) return false;
      if (finding.eventInterval) {
        const bucket = Math.floor(finding.eventInterval.start / 30);
        const key = `${finding.detector}:${bucket}`;
        const bucketCount = bucketCounts.get(key) ?? 0;
        if (bucketCount >= 1) return false;
        bucketCounts.set(key, bucketCount + 1);
      }
      detectorCounts.set(finding.detector, detectorCount + 1);
      return true;
    })
    .slice(0, 120);
  return selected.map((finding) => {
    const exact = finding.eventInterval;
    const start = clamp(exact?.start ?? 0, 0, duration);
    const measuredEnd = exact ? clamp(Math.max(exact.end, start), start, duration) : start;
    const measuredDuration = measuredEnd - start;
    const reviewDuration = Math.min(measuredDuration, 10);
    const end = exact
      ? Math.min(duration, start + Math.max(0.02, reviewDuration))
      : Math.min(duration, start + 0.2);
    const ids = finding.channelIds.filter((id) => channels.some((channel) => channel.id === id));
    const recordLevel = exact ? "" : "Record-level screen · ";
    const clippedInterval = exact && measuredDuration > reviewDuration + 1e-6
      ? ` · Measured span ${measuredDuration.toFixed(1)} s; marker shows the first ${reviewDuration.toFixed(0)} s review window.`
      : "";
    return {
      id: `screen-${finding.id}`,
      start,
      end,
      trackId: ids.length === 1 ? ids[0]! : null,
      ...(ids.length > 1 ? { trackIds: ids } : {}),
      type: ANNOTATION_TYPE_BY_DETECTOR[finding.detector],
      text: `${finding.title} · ${recordLevel}${finding.summary}${clippedInterval}`,
      source: "auto" as const,
      confidence: finding.confidence,
    };
  }).sort((a, b) => a.start - b.start || b.confidence - a.confidence || a.id.localeCompare(b.id));
}

export function createDeterministicScreeningAdapter(): ScreeningAdapter {
  return {
    id: "deterministic-screening",
    version: DETERMINISTIC_SCREENING_VERSION,
    run: runDeterministicScreening,
  };
}
