import type { ChannelKind, Laterality } from "../types.ts";

export type TemporalPhenomenonDetector =
  | "sharp-transient-candidate"
  | "rhythmic-activity"
  | "periodic-activity"
  | "burst-suppression"
  | "fast-activity"
  | "sleep-spindle"
  | "k-complex-candidate";

export interface PhenomenonChannel {
  id: string;
  label: string;
  canonical?: string;
  samples: ArrayLike<number>;
  sampleRate: number;
  kind: ChannelKind | "unknown";
  laterality: Laterality;
}

export interface PhenomenonEvidence {
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  peakSeconds?: number;
  frequencyHz?: number;
  cycleCount?: number;
  autocorrelationPeak?: number;
  spectralConcentration?: number;
  interEventIntervalSeconds?: number;
  intervalCoefficientOfVariation?: number;
  templateCorrelation?: number;
  amplitudeDeviation?: number;
  robustScaleRatio?: number;
  maxSlopePerSecond?: number;
  slowWaveFollowed?: boolean;
  supportingChannelCount?: number;
  supportingChannels?: string[];
  suppressionFraction?: number;
  burstFraction?: number;
  envelopeRatio?: number;
  waxingWaningRatio?: number;
}

export interface TemporalPhenomenon {
  detector: TemporalPhenomenonDetector;
  title: string;
  summary: string;
  channelIds: string[];
  evidence: PhenomenonEvidence;
  confidence: number;
  artifactProbability: number;
  limitations: string[];
}

export interface TemporalPhenomenonEvaluation {
  detector: TemporalPhenomenonDetector;
  evaluatedChannelCount: number;
  candidateCount: number;
  limitations: string[];
}

export interface TemporalPhenomenaResult {
  phenomena: TemporalPhenomenon[];
  evaluations: TemporalPhenomenonEvaluation[];
}

interface SpectrumPeak {
  frequencyHz: number;
  concentration: number;
  autocorrelation: number;
  cycleCount: number;
}

interface SharpCandidate {
  channelId: string;
  peakIndex: number;
  startIndex: number;
  endIndex: number;
  startSeconds: number;
  endSeconds: number;
  peakSeconds: number;
  amplitude: number;
  scaleRatio: number;
  maxSlope: number;
  slowWaveFollowed: boolean;
  waveform: number[];
}

const TEMPORAL_DETECTORS: readonly TemporalPhenomenonDetector[] = [
  "sharp-transient-candidate",
  "rhythmic-activity",
  "periodic-activity",
  "burst-suppression",
  "fast-activity",
  "sleep-spindle",
  "k-complex-candidate",
];

const ADJACENT: Readonly<Record<string, readonly string[]>> = {
  FP1: ["F7", "F3", "FP2"], FP2: ["F4", "F8", "FP1"],
  F7: ["FP1", "F3", "T7"], F3: ["FP1", "F7", "FZ", "C3"],
  FZ: ["F3", "F4", "CZ"], F4: ["FP2", "FZ", "F8", "C4"], F8: ["FP2", "F4", "T8"],
  T7: ["F7", "C3", "P7"], C3: ["F3", "T7", "CZ", "P3"], CZ: ["FZ", "C3", "C4", "PZ"],
  C4: ["F4", "CZ", "T8", "P4"], T8: ["F8", "C4", "P8"],
  P7: ["T7", "P3", "O1"], P3: ["C3", "P7", "PZ", "O1"], PZ: ["CZ", "P3", "P4", "O1", "O2"],
  P4: ["C4", "PZ", "P8", "O2"], P8: ["T8", "P4", "O2"], O1: ["P7", "P3", "PZ", "O2"], O2: ["P8", "P4", "PZ", "O1"],
};

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finite(value) ? value : minimum));
}

function mean(values: readonly number[]): number {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function rms(values: readonly number[]): number {
  return Math.sqrt(mean(values.map((value) => value * value)));
}

function channelName(channel: PhenomenonChannel): string {
  return (channel.canonical ?? channel.label).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function areAdjacent(left: PhenomenonChannel, right: PhenomenonChannel): boolean {
  const a = channelName(left);
  const b = channelName(right);
  return a === b || ADJACENT[a]?.includes(b) === true || ADJACENT[b]?.includes(a) === true;
}

function valuesOf(channel: PhenomenonChannel, start = 0, end = channel.samples.length): number[] {
  const values: number[] = [];
  for (let index = Math.max(0, start); index < Math.min(channel.samples.length, end); index += 1) {
    const value = Number(channel.samples[index]);
    if (finite(value)) values.push(value);
  }
  return values;
}

function robustStats(values: readonly number[]): { center: number; scale: number } | null {
  if (values.length < 16) return null;
  const center = median(values);
  const deviations = values.map((value) => Math.abs(value - center));
  const madScale = median(deviations) * 1.4826;
  // Sparse transients can legitimately have a zero MAD because their local
  // baseline occupies most samples. Preserve that baseline while deriving a
  // bounded non-zero reference from the largest observed deflection.
  const scale = madScale > 1e-9 ? madScale : Math.max(...deviations) / 10;
  return finite(scale) && scale > 1e-9 ? { center, scale } : null;
}

function resample(values: readonly number[], targetLength: number): number[] {
  if (values.length <= targetLength) return [...values];
  return Array.from({ length: targetLength }, (_, index) => values[Math.floor(index * values.length / targetLength)]!);
}

function normalizedCorrelation(left: readonly number[], right: readonly number[]): number {
  const length = Math.min(left.length, right.length);
  if (length < 4) return 0;
  const a = resample(left, length);
  const b = resample(right, length);
  const ma = mean(a);
  const mb = mean(b);
  let numerator = 0;
  let da = 0;
  let db = 0;
  for (let index = 0; index < length; index += 1) {
    const x = a[index]! - ma;
    const y = b[index]! - mb;
    numerator += x * y;
    da += x * x;
    db += y * y;
  }
  return da > 0 && db > 0 ? numerator / Math.sqrt(da * db) : 0;
}

function spectrumPeak(values: readonly number[], sampleRate: number, lowHz: number, highHz: number): SpectrumPeak | null {
  if (values.length < 32 || sampleRate <= 0 || highHz <= lowHz) return null;
  const data = resample(values, 1024);
  const effectiveRate = sampleRate * data.length / values.length;
  const center = mean(data);
  const powers: Array<{ frequency: number; power: number }> = [];
  let total = 0;
  for (let bin = 1; bin <= Math.floor(data.length / 2); bin += 1) {
    const frequency = bin * effectiveRate / data.length;
    if (frequency < Math.max(0.5, lowHz / 2) || frequency > Math.min(effectiveRate / 2, Math.max(40, highHz))) continue;
    let real = 0;
    let imaginary = 0;
    const angle = 2 * Math.PI * bin / data.length;
    for (let index = 0; index < data.length; index += 1) {
      const tapered = (data[index]! - center) * (0.5 - 0.5 * Math.cos(2 * Math.PI * index / Math.max(1, data.length - 1)));
      real += tapered * Math.cos(angle * index);
      imaginary -= tapered * Math.sin(angle * index);
    }
    const power = real * real + imaginary * imaginary;
    powers.push({ frequency, power });
    if (frequency >= 0.5 && frequency <= 40) total += power;
  }
  const eligible = powers.filter((entry) => entry.frequency >= lowHz && entry.frequency <= highHz);
  if (!eligible.length || total <= 1e-12) return null;
  const peak = eligible.reduce((best, entry) => entry.power > best.power ? entry : best);
  const radius = Math.max(0.5, peak.frequency * 0.12);
  const concentrated = powers
    .filter((entry) => Math.abs(entry.frequency - peak.frequency) <= radius)
    .reduce((sum, entry) => sum + entry.power, 0);
  const lag = Math.max(1, Math.round(sampleRate / peak.frequency));
  const originalCenter = mean(values);
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index + lag < values.length; index += 1) {
    numerator += (values[index]! - originalCenter) * (values[index + lag]! - originalCenter);
    denominator += (values[index]! - originalCenter) ** 2;
  }
  return {
    frequencyHz: peak.frequency,
    concentration: clamp(concentrated / total, 0, 1),
    autocorrelation: denominator > 0 ? clamp(numerator / denominator, -1, 1) : 0,
    cycleCount: values.length / sampleRate * peak.frequency,
  };
}

function waveformSnippet(channel: PhenomenonChannel, peak: number, radiusSeconds = 0.15): number[] {
  const radius = Math.max(2, Math.round(radiusSeconds * channel.sampleRate));
  return valuesOf(channel, peak - radius, peak + radius + 1);
}

function sharpCandidates(channel: PhenomenonChannel): SharpCandidate[] {
  const values = valuesOf(channel);
  const stats = robustStats(values);
  if (!stats || channel.sampleRate < 20) return [];
  const result: SharpCandidate[] = [];
  const maxRadius = Math.max(2, Math.round(0.2 * channel.sampleRate));
  const slowFrom = Math.round(0.08 * channel.sampleRate);
  const slowTo = Math.round(0.5 * channel.sampleRate);
  for (let index = 1; index < channel.samples.length - 1; index += 1) {
    const value = Number(channel.samples[index]);
    const before = Number(channel.samples[index - 1]);
    const after = Number(channel.samples[index + 1]);
    const deviation = value - stats.center;
    const amplitude = Math.abs(deviation);
    if (!finite(value) || !finite(before) || !finite(after) || amplitude < 5 * stats.scale) continue;
    if (amplitude < Math.abs(before - stats.center) || amplitude < Math.abs(after - stats.center)) continue;
    let left = index - 1;
    let right = index + 1;
    while (left > Math.max(0, index - maxRadius) && (Number(channel.samples[left]) - stats.center) * deviation > 0) left -= 1;
    while (right < Math.min(channel.samples.length - 1, index + maxRadius) && (Number(channel.samples[right]) - stats.center) * deviation > 0) right += 1;
    const duration = (right - left) / channel.sampleRate;
    if (duration < 0.02 || duration > 0.2) continue;
    const maxSlope = Math.max(
      Math.abs(value - before) * channel.sampleRate,
      Math.abs(after - value) * channel.sampleRate,
      amplitude / Math.max(duration / 2, 1 / channel.sampleRate),
    );
    if (maxSlope < 40 * stats.scale) continue;
    let opposite = 0;
    for (let look = index + slowFrom; look <= Math.min(channel.samples.length - 1, index + slowTo); look += 1) {
      const next = (Number(channel.samples[look]) - stats.center) * (deviation < 0 ? 1 : -1);
      if (finite(next)) opposite = Math.max(opposite, next);
    }
    result.push({
      channelId: channel.id,
      peakIndex: index,
      startIndex: left,
      endIndex: right,
      startSeconds: left / channel.sampleRate,
      endSeconds: right / channel.sampleRate,
      peakSeconds: index / channel.sampleRate,
      amplitude,
      scaleRatio: amplitude / stats.scale,
      maxSlope,
      slowWaveFollowed: opposite >= 2 * stats.scale,
      waveform: waveformSnippet(channel, index),
    });
    index = Math.max(index, right + Math.round(0.08 * channel.sampleRate));
  }
  return result;
}

function fieldSharpEvents(channels: readonly PhenomenonChannel[], candidates: readonly SharpCandidate[]): Array<{ members: SharpCandidate[] }> {
  const ordered = [...candidates].sort((a, b) => a.peakSeconds - b.peakSeconds);
  const clusters: Array<{ members: SharpCandidate[] }> = [];
  for (const candidate of ordered) {
    let cluster: { members: SharpCandidate[] } | undefined;
    for (let index = clusters.length - 1; index >= 0; index -= 1) {
      const item = clusters[index]!;
      if (Math.abs(mean(item.members.map((member) => member.peakSeconds)) - candidate.peakSeconds) > 0.06) break;
      if (!item.members.some((member) => member.channelId === candidate.channelId)) {
        cluster = item;
        break;
      }
    }
    if (cluster) cluster.members.push(candidate);
    else clusters.push({ members: [candidate] });
  }
  return clusters.filter((cluster) => {
    if (cluster.members.length < 2) return false;
    return cluster.members.some((left) => cluster.members.some((right) => {
      if (left === right) return false;
      const a = channels.find((channel) => channel.id === left.channelId);
      const b = channels.find((channel) => channel.id === right.channelId);
      return Boolean(a && b && areAdjacent(a, b));
    }));
  });
}

function rhythmicPhenomena(channels: readonly PhenomenonChannel[]): TemporalPhenomenon[] {
  const output: TemporalPhenomenon[] = [];
  for (const channel of channels) {
    const seconds = channel.samples.length / channel.sampleRate;
    const windowSeconds = Math.min(6, seconds);
    if (windowSeconds < 3) continue;
    const windowSamples = Math.round(windowSeconds * channel.sampleRate);
    const hop = Math.max(1, Math.round(2 * channel.sampleRate));
    const hits: Array<{ start: number; end: number; peak: SpectrumPeak }> = [];
    for (let start = 0; start + windowSamples <= channel.samples.length; start += hop) {
      const peak = spectrumPeak(valuesOf(channel, start, start + windowSamples), channel.sampleRate, 0.5, 15);
      if (peak && peak.autocorrelation >= 0.5 && peak.concentration >= 0.35 && peak.cycleCount >= 4) {
        hits.push({ start: start / channel.sampleRate, end: (start + windowSamples) / channel.sampleRate, peak });
      }
    }
    if (!hits.length) continue;
    const frequency = median(hits.map((hit) => hit.peak.frequencyHz));
    const autocorrelation = median(hits.map((hit) => hit.peak.autocorrelation));
    const concentration = median(hits.map((hit) => hit.peak.concentration));
    const start = hits[0]!.start;
    const end = hits[hits.length - 1]!.end;
    output.push({
      detector: "rhythmic-activity",
      title: `Rhythmic ${frequency.toFixed(1)} Hz activity`,
      summary: `Sustained repetitive activity measured at ${frequency.toFixed(1)} Hz in ${channel.label}; this is a descriptive signal tag, not a seizure classification.`,
      channelIds: [channel.id],
      evidence: { startSeconds: start, endSeconds: end, durationSeconds: end - start, frequencyHz: frequency, cycleCount: (end - start) * frequency, autocorrelationPeak: autocorrelation, spectralConcentration: concentration },
      confidence: clamp(0.45 + 0.25 * autocorrelation + 0.25 * concentration, 0, 0.94),
      artifactProbability: frequency >= 12 ? 0.35 : 0.15,
      limitations: ["Rhythmicity can be physiologic, artifactual, or pathologic; evolution and clinical context are not inferred."],
    });
  }
  return output;
}

function periodicPhenomena(channels: readonly PhenomenonChannel[], fields: readonly { members: SharpCandidate[] }[]): TemporalPhenomenon[] {
  if (fields.length < 3) return [];
  const peaks = fields.map((field) => mean(field.members.map((member) => member.peakSeconds)));
  const intervals = peaks.slice(1).map((peak, index) => peak - peaks[index]!);
  const interval = median(intervals);
  const coefficientOfVariation = interval > 0 ? Math.sqrt(mean(intervals.map((value) => (value - mean(intervals)) ** 2))) / interval : Infinity;
  const correlations: number[] = [];
  for (let index = 1; index < fields.length; index += 1) {
    const previous = fields[index - 1]!;
    const current = fields[index]!;
    const shared = previous.members.find((member) => current.members.some((candidate) => candidate.channelId === member.channelId));
    const match = shared && current.members.find((candidate) => candidate.channelId === shared.channelId);
    if (shared && match) correlations.push(Math.abs(normalizedCorrelation(shared.waveform, match.waveform)));
  }
  const templateCorrelation = median(correlations);
  if (interval < 0.25 || interval > 4 || coefficientOfVariation > 0.25 || correlations.length < 2 || templateCorrelation < 0.65) return [];
  const channelIds = [...new Set(fields.flatMap((field) => field.members.map((member) => member.channelId)))];
  const frequency = 1 / interval;
  return [{
    detector: "periodic-activity",
    title: `Periodic discharges ~${frequency.toFixed(1)} Hz`,
    summary: `Repeating field-supported waveform templates recur every ${interval.toFixed(2)} s (${frequency.toFixed(1)} Hz).`,
    channelIds,
    evidence: { startSeconds: fields[0]!.members[0]!.startSeconds, endSeconds: fields[fields.length - 1]!.members[0]!.endSeconds, durationSeconds: fields[fields.length - 1]!.members[0]!.endSeconds - fields[0]!.members[0]!.startSeconds, frequencyHz: frequency, interEventIntervalSeconds: interval, intervalCoefficientOfVariation: coefficientOfVariation, templateCorrelation, supportingChannelCount: channelIds.length, supportingChannels: channelIds },
    confidence: clamp(0.55 + 0.2 * templateCorrelation + 0.15 * (1 - coefficientOfVariation), 0, 0.95),
    artifactProbability: 0.2,
    limitations: ["Periodicity is a waveform-timing measurement and does not assign ACNS terminology or clinical significance."],
  }];
}

function burstSuppressionPhenomena(channels: readonly PhenomenonChannel[]): TemporalPhenomenon[] {
  const output: TemporalPhenomenon[] = [];
  for (const channel of channels) {
    const block = Math.max(8, Math.round(0.25 * channel.sampleRate));
    const envelopes: number[] = [];
    for (let start = 0; start + block <= channel.samples.length; start += block) envelopes.push(rms(valuesOf(channel, start, start + block)));
    if (envelopes.length < 12) continue;
    const low = median([...envelopes].sort((a, b) => a - b).slice(0, Math.max(1, Math.floor(envelopes.length * 0.35))));
    const high = median([...envelopes].sort((a, b) => b - a).slice(0, Math.max(1, Math.floor(envelopes.length * 0.35))));
    const threshold = Math.max(5, low * 2.5);
    const states = envelopes.map((value) => value <= threshold ? 0 : value >= Math.max(10, threshold * 1.8) ? 1 : -1);
    let transitions = 0;
    let previous = -1;
    for (const state of states) {
      if (state < 0) continue;
      if (previous >= 0 && state !== previous) transitions += 1;
      previous = state;
    }
    const suppressionFraction = states.filter((state) => state === 0).length / states.length;
    const burstFraction = states.filter((state) => state === 1).length / states.length;
    const envelopeRatio = high / Math.max(low, 1e-9);
    if (transitions < 2 || suppressionFraction < 0.2 || burstFraction < 0.1 || envelopeRatio < 4) continue;
    const duration = channel.samples.length / channel.sampleRate;
    output.push({ detector: "burst-suppression", title: "Alternating suppression and bursts", summary: `Envelope states alternate between very-low amplitude and higher-amplitude bursts in ${channel.label}.`, channelIds: [channel.id], evidence: { startSeconds: 0, endSeconds: duration, durationSeconds: duration, suppressionFraction, burstFraction, envelopeRatio }, confidence: clamp(0.55 + Math.min(0.2, transitions / 20) + Math.min(0.2, envelopeRatio / 40), 0, 0.95), artifactProbability: 0.2, limitations: ["The envelope rule does not establish anesthetic depth, etiology, or clinical burst-suppression criteria."] });
  }
  return output;
}

function fastActivityPhenomena(channels: readonly PhenomenonChannel[]): TemporalPhenomenon[] {
  const output: TemporalPhenomenon[] = [];
  for (const channel of channels) {
    const duration = channel.samples.length / channel.sampleRate;
    if (duration < 1 || channel.sampleRate < 90) continue;
    const peak = spectrumPeak(valuesOf(channel), channel.sampleRate, 20, 40);
    if (!peak || peak.concentration < 0.35 || peak.cycleCount < 20) continue;
    output.push({ detector: "fast-activity", title: `Elevated ${peak.frequencyHz.toFixed(1)} Hz fast activity`, summary: `Sustained 20–40 Hz spectral concentration measured in ${channel.label}; muscle contamination remains a competing explanation.`, channelIds: [channel.id], evidence: { startSeconds: 0, endSeconds: duration, durationSeconds: duration, frequencyHz: peak.frequencyHz, cycleCount: peak.cycleCount, autocorrelationPeak: peak.autocorrelation, spectralConcentration: peak.concentration }, confidence: clamp(0.5 + 0.35 * peak.concentration, 0, 0.9), artifactProbability: 0.55, limitations: ["Scalp fast activity and muscle artifact overlap spectrally; this tag intentionally does not resolve the source."] });
  }
  return output;
}

function spindlePhenomena(channels: readonly PhenomenonChannel[]): TemporalPhenomenon[] {
  const output: TemporalPhenomenon[] = [];
  for (const channel of channels) {
    if (!/(^|[^A-Z])(FZ|CZ|PZ|C3|C4|F3|F4)([^A-Z]|$)/i.test(`${channel.canonical ?? ""} ${channel.label}`)) continue;
    const window = Math.max(32, Math.round(channel.sampleRate));
    const hop = Math.max(1, Math.round(channel.sampleRate * 0.25));
    const hits: Array<{ start: number; peak: SpectrumPeak; waxing: number }> = [];
    for (let start = 0; start + window <= channel.samples.length; start += hop) {
      const values = valuesOf(channel, start, start + window);
      const peak = spectrumPeak(values, channel.sampleRate, 11, 16);
      const quarter = Math.max(1, Math.floor(values.length / 4));
      const edges = (rms(values.slice(0, quarter)) + rms(values.slice(-quarter))) / 2;
      const middle = rms(values.slice(quarter, -quarter));
      const waxing = middle / Math.max(edges, 1e-9);
      if (peak && peak.concentration >= 0.4 && peak.autocorrelation >= 0.35 && waxing >= 1.05) hits.push({ start: start / channel.sampleRate, peak, waxing });
    }
    if (!hits.length) continue;
    const start = hits[0]!.start;
    const end = hits[hits.length - 1]!.start + 1;
    const duration = end - start;
    if (duration < 0.5 || duration > 3.5) continue;
    const frequency = median(hits.map((hit) => hit.peak.frequencyHz));
    const waxing = median(hits.map((hit) => hit.waxing));
    output.push({ detector: "sleep-spindle", title: `${frequency.toFixed(1)} Hz spindle candidate`, summary: `An ${duration.toFixed(2)} s waxing–waning 11–16 Hz run was measured in ${channel.label}.`, channelIds: [channel.id], evidence: { startSeconds: start, endSeconds: end, durationSeconds: duration, frequencyHz: frequency, cycleCount: duration * frequency, autocorrelationPeak: median(hits.map((hit) => hit.peak.autocorrelation)), spectralConcentration: median(hits.map((hit) => hit.peak.concentration)), waxingWaningRatio: waxing }, confidence: clamp(0.5 + 0.25 * median(hits.map((hit) => hit.peak.concentration)) + 0.1 * Math.min(2, waxing), 0, 0.92), artifactProbability: 0.2, limitations: ["A spindle-like signal feature is not a sleep-stage determination; staging requires epoch context and additional channels."] });
  }
  return output;
}

function kComplexPhenomena(channels: readonly PhenomenonChannel[]): TemporalPhenomenon[] {
  const output: TemporalPhenomenon[] = [];
  for (const channel of channels) {
    if (!/(^|[^A-Z])(FZ|CZ|F3|F4|C3|C4)([^A-Z]|$)/i.test(`${channel.canonical ?? ""} ${channel.label}`)) continue;
    const values = valuesOf(channel);
    const stats = robustStats(values);
    if (!stats) continue;
    const minimumGap = Math.round(0.1 * channel.sampleRate);
    const maximumGap = Math.round(1 * channel.sampleRate);
    for (let index = 0; index < values.length; index += 1) {
      const first = values[index]! - stats.center;
      if (Math.abs(first) < 4 * stats.scale) continue;
      let oppositeIndex = -1;
      let oppositeAmplitude = 0;
      for (let next = index + minimumGap; next <= Math.min(values.length - 1, index + maximumGap); next += 1) {
        const candidate = values[next]! - stats.center;
        if (candidate * first < 0 && Math.abs(candidate) > oppositeAmplitude) {
          oppositeIndex = next;
          oppositeAmplitude = Math.abs(candidate);
        }
      }
      if (oppositeIndex < 0 || oppositeAmplitude < 2.5 * stats.scale) continue;
      const start = Math.max(0, index - Math.round(0.1 * channel.sampleRate)) / channel.sampleRate;
      const end = Math.min(values.length - 1, oppositeIndex + Math.round(0.2 * channel.sampleRate)) / channel.sampleRate;
      const duration = end - start;
      if (duration < 0.5 || duration > 1.5) continue;
      output.push({ detector: "k-complex-candidate", title: "K-complex candidate", summary: `A high-amplitude biphasic 0.5–1.5 s waveform was measured in ${channel.label}.`, channelIds: [channel.id], evidence: { startSeconds: start, endSeconds: end, durationSeconds: duration, peakSeconds: index / channel.sampleRate, amplitudeDeviation: Math.max(Math.abs(first), oppositeAmplitude), robustScaleRatio: Math.max(Math.abs(first), oppositeAmplitude) / stats.scale }, confidence: 0.65, artifactProbability: 0.25, limitations: ["This morphology tag is not a sleep-stage determination and may overlap with movement, electrode, or other slow transients."] });
      index = oppositeIndex + Math.round(0.5 * channel.sampleRate);
    }
  }
  return output;
}

export function detectTemporalPhenomena(channels: readonly PhenomenonChannel[]): TemporalPhenomenaResult {
  const eeg = channels.filter((channel) => (channel.kind === "eeg" || channel.kind === "unknown") && channel.sampleRate > 0 && channel.samples.length >= 16);
  const sharpByChannel = eeg.flatMap((channel) => sharpCandidates(channel));
  const fields = fieldSharpEvents(eeg, sharpByChannel);
  const sharp: TemporalPhenomenon[] = fields.map((field) => {
    const strongest = field.members.reduce((best, candidate) => candidate.scaleRatio > best.scaleRatio ? candidate : best);
    const channelIds = field.members.map((member) => member.channelId);
    const start = Math.min(...field.members.map((member) => member.startSeconds));
    const end = Math.max(...field.members.map((member) => member.endSeconds));
    return {
      detector: "sharp-transient-candidate",
      title: "Sharp transient candidate",
      summary: `${Math.round((end - start) * 1000)} ms high-slope transient with a plausible field across ${channelIds.length} adjacent derivations${strongest.slowWaveFollowed ? ", followed by an opposite slow deflection" : ""}.`,
      channelIds,
      evidence: { startSeconds: start, endSeconds: end, durationSeconds: end - start, peakSeconds: strongest.peakSeconds, amplitudeDeviation: strongest.amplitude, robustScaleRatio: strongest.scaleRatio, maxSlopePerSecond: strongest.maxSlope, slowWaveFollowed: strongest.slowWaveFollowed, supportingChannelCount: channelIds.length, supportingChannels: channelIds },
      confidence: clamp(0.55 + Math.min(0.2, (strongest.scaleRatio - 5) / 20) + (strongest.slowWaveFollowed ? 0.1 : 0) + Math.min(0.1, (channelIds.length - 2) * 0.04), 0, 0.95),
      artifactProbability: 0.25,
      limitations: ["Field adjacency is a deterministic 10–20 topology check, not source localization or an epileptiform classification."],
    };
  });
  const groups: Record<TemporalPhenomenonDetector, TemporalPhenomenon[]> = {
    "sharp-transient-candidate": sharp,
    "rhythmic-activity": rhythmicPhenomena(eeg),
    "periodic-activity": periodicPhenomena(eeg, fields),
    "burst-suppression": burstSuppressionPhenomena(eeg),
    "fast-activity": fastActivityPhenomena(eeg),
    "sleep-spindle": spindlePhenomena(eeg),
    "k-complex-candidate": kComplexPhenomena(eeg),
  };
  return {
    phenomena: TEMPORAL_DETECTORS.flatMap((detector) => groups[detector]),
    evaluations: TEMPORAL_DETECTORS.map((detector) => ({
      detector,
      evaluatedChannelCount: eeg.length,
      candidateCount: groups[detector].length,
      limitations: groups[detector][0]?.limitations ?? [],
    })),
  };
}
