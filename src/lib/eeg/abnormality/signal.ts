/**
 * Canonical input boundary for abnormality detectors.
 *
 * This module deliberately sits beside (rather than inside) the display and
 * sonification pipelines.  `readRecords` returns calibrated samples and this
 * module only copies, labels, and describes those samples.  In particular, it
 * does not apply the viewer's filters or manufacture a referential channel
 * from a bipolar source.
 */

import { listChannels, readRecords } from "../edf.ts";
import { canonicalElectrode } from "../channels.ts";
import type { ChannelInfo, EdfSignal, LoadedRecording } from "../types.ts";
import type { AbnormalityInferenceInput, ModelSignalInput } from "./types.ts";

export const DETECTOR_UNIT = "µV" as const;

/** Canonical scalp names used by the detector boundary (legacy names are aliases). */
export const DETECTOR_ELECTRODES = [
  "Fp1",
  "Fp2",
  "F7",
  "F3",
  "Fz",
  "F4",
  "F8",
  "T7",
  "C3",
  "Cz",
  "C4",
  "T8",
  "P7",
  "P3",
  "Pz",
  "P4",
  "P8",
  "O1",
  "O2",
  "A1",
  "A2",
] as const;

export type DetectorElectrode = (typeof DETECTOR_ELECTRODES)[number];
export type DetectorSourceKind = "referential" | "irreversible-bipolar" | "other";

export interface DetectorSignalRange {
  /** Start of the detector interval in seconds. Defaults to the recording start. */
  startSec?: number;
  /** Length of the detector interval in seconds. Defaults to the recording duration. */
  durationSec?: number;
  /** Short aliases accepted for callers that use the EDF/pipeline vocabulary. */
  start?: number;
  duration?: number;
}

export interface DetectorSignalProvenance {
  recordingName: string;
  signalIndex: number;
  originalLabel: string;
  sourceUnit: string;
  /** Unit after the boundary's canonical normalization. */
  unit: typeof DETECTOR_UNIT;
  sampleRate: number;
  sourceKind: "referential";
  /** The first electrode token in the source label, in canonical spelling. */
  sourceElectrode: string;
  sourceAliases: readonly string[];
}

export interface DetectorSignal {
  /** Stable detector key, e.g. `eeg:Fp1`. */
  id: string;
  electrode: string;
  canonicalName: string;
  aliases: readonly string[];
  samples: Float32Array;
  /** Unfiltered calibrated samples, retained separately from `samples`. */
  originalSamples: Float32Array;
  unit: typeof DETECTOR_UNIT;
  sampleRate: number;
  source: DetectorSignalProvenance;
}

export interface DetectorBipolarSource {
  signalIndex: number;
  originalLabel: string;
  /** Canonical electrode tokens found in the source label, when recognized. */
  electrodes: readonly string[];
  aliases: readonly string[];
  sourceUnit: string;
  sampleRate: number;
  sourceKind: "irreversible-bipolar";
  /** Bipolar samples are retained as copies for audit/diagnostic consumers. */
  samples: Float32Array;
  unit: typeof DETECTOR_UNIT;
}

export interface DetectorMissingChannel {
  electrode: string;
  aliases: readonly string[];
  reason: "not-present" | "bipolar-only";
  sourceLabels: readonly string[];
}

export interface DetectorSignalDiagnostics {
  missingChannels: readonly DetectorMissingChannel[];
  /** Convenience list for status surfaces that only need canonical names. */
  missing: readonly string[];
  duplicateReferentialChannels: readonly string[];
  ignoredNonEegChannels: readonly string[];
  bipolarSources: readonly DetectorBipolarSource[];
}

export interface DetectorAvailability {
  referential: {
    available: boolean;
    electrodes: readonly string[];
  };
  irreversibleBipolar: {
    available: boolean;
    sourceLabels: readonly string[];
    localizableToIndividualElectrodes: false;
  };
}

export type DetectorLocalizationMode = "referential" | "mixed" | "bipolar-only" | "none";

export interface DetectorLocalization {
  mode: DetectorLocalizationMode;
  canLocalizeToIndividualElectrodes: boolean;
  limitations: readonly string[];
}

export interface DetectorSignalInput {
  start: number;
  duration: number;
  unit: typeof DETECTOR_UNIT;
  /** Detector signals are copies; no display or audio branch owns these arrays. */
  signals: readonly DetectorSignal[];
  /** All irreversible bipolar sources are explicit rather than silently relabeled. */
  bipolarSources: readonly DetectorBipolarSource[];
  availability: DetectorAvailability;
  localization: DetectorLocalization;
  diagnostics: DetectorSignalDiagnostics;
  provenance: {
    recordingName: string;
    source: "LoadedRecording";
    interval: { start: number; duration: number };
    preprocessingApplied: false;
    viewerFiltersApplied: false;
  };
}

const LEGACY_ALIASES: Readonly<Record<string, string>> = {
  T7: "T3",
  T8: "T4",
  P7: "T5",
  P8: "T6",
};

const DETECTOR_ELECTRODE_KEYS = new Set(DETECTOR_ELECTRODES.map((name) => name.toUpperCase()));
const DETECTOR_ALIASES = new Map<string, string>([
  ["T3", "T7"],
  ["T4", "T8"],
  ["T5", "P7"],
  ["T6", "P8"],
]);

function aliasesFor(canonical: string): readonly string[] {
  const legacy = LEGACY_ALIASES[canonical.toUpperCase()];
  return legacy ? Object.freeze([canonical, legacy]) : Object.freeze([canonical]);
}

function canonicalDetectorElectrode(raw: string): string | null {
  const canonical = canonicalElectrode(raw);
  const aliased = DETECTOR_ALIASES.get(canonical.toUpperCase()) ?? canonical;
  return DETECTOR_ELECTRODE_KEYS.has(aliased.toUpperCase()) ? aliased : null;
}

/**
 * Extract recognizable electrode tokens without treating a reference suffix
 * (`-REF`, `-LE`, `-AVG`, ...) as a second electrode.  A second recognized
 * electrode means that the source is a bipolar difference, even when the
 * existing display classifier would strip that suffix.
 */
function electrodeTokens(label: string): string[] {
  const tokens = label.match(/[A-Za-z]+(?:\d+|z)/gi) ?? [];
  const canonical: string[] = [];
  for (const token of tokens) {
    const electrode = canonicalDetectorElectrode(token);
    if (electrode && !canonical.includes(electrode)) canonical.push(electrode);
  }
  return canonical;
}

function sourceKind(label: string): { kind: DetectorSourceKind; electrodes: string[] } {
  const electrodes = electrodeTokens(label);
  if (electrodes.length >= 2) return { kind: "irreversible-bipolar", electrodes };
  if (electrodes.length === 1) return { kind: "referential", electrodes };
  return { kind: "other", electrodes };
}

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase().replace(/μ/g, "µ");
}

function microvoltScale(unit: string): number | null {
  switch (normalizeUnit(unit)) {
    case "µv":
    case "uv":
    case "microvolt":
    case "microvolts":
      return 1;
    case "mv":
      return 1e3;
    case "v":
      return 1e6;
    case "nv":
      return 1e-3;
    default:
      return null;
  }
}

/**
 * `readRecords` already normalizes channels classified as EEG.  Bipolar
 * labels can be classified as `extra` by the legacy display classifier, so
 * apply the voltage scale exactly once for those sources here.
 */
function canonicalSamples(
  samples: Float32Array,
  signal: EdfSignal,
  channel: ChannelInfo | undefined,
  kind: DetectorSourceKind,
): Float32Array {
  const copy = new Float32Array(samples);
  const alreadyNormalized = channel?.kind === "eeg" ||
    channel?.kind === "eog" ||
    channel?.kind === "emg" ||
    channel?.kind === "ekg";
  if (alreadyNormalized || kind === "other") return copy;
  const scale = microvoltScale(signal.unit);
  if (scale == null || scale === 1) return copy;
  for (let i = 0; i < copy.length; i++) copy[i] = copy[i]! * scale;
  return copy;
}

function freezeReadonly<T extends object>(value: T): T {
  return Object.freeze(value);
}

function requestedInterval(recording: LoadedRecording, range?: DetectorSignalRange): { start: number; duration: number } {
  const startValue = range?.startSec ?? range?.start ?? 0;
  const durationValue = range?.durationSec ?? range?.duration ?? recording.header.duration;
  const start = Number.isFinite(startValue) ? Math.max(0, startValue) : 0;
  const duration = Number.isFinite(durationValue) && durationValue > 0
    ? durationValue
    : recording.header.duration;
  return { start, duration };
}

function buildMissing(
  electrode: DetectorElectrode,
  referentialLabels: Map<string, string[]>,
  bipolarLabels: Map<string, string[]>,
): DetectorMissingChannel {
  const aliases = aliasesFor(electrode);
  const key = electrode.toUpperCase();
  const bipolar = bipolarLabels.get(key) ?? [];
  if (bipolar.length > 0) {
    return {
      electrode,
      aliases,
      reason: "bipolar-only",
      sourceLabels: Object.freeze([...bipolar]),
    };
  }
  return {
    electrode,
    aliases,
    reason: "not-present",
    sourceLabels: Object.freeze([...(referentialLabels.get(key) ?? [])]),
  };
}

/**
 * Read and canonicalize one detector interval.
 *
 * This is intentionally independent of `FilterSettings`, display zoom, and
 * selected viewer channels.  Callers may preprocess `originalSamples` in a
 * model-specific branch while retaining this immutable-by-convention source.
 */
export function buildDetectorSignalInput(
  recording: LoadedRecording,
  range?: DetectorSignalRange,
): DetectorSignalInput {
  const interval = requestedInterval(recording, range);
  const records = readRecords(recording.buffer, recording.header, interval.start, interval.duration);
  const channels = listChannels(recording.header);
  const channelByIndex = new Map<number, ChannelInfo>(
    channels.map((channel) => [channel.index, channel] as const),
  );
  const referentialLabels = new Map<string, string[]>();
  const bipolarLabels = new Map<string, string[]>();
  const canonicalByElectrode = new Map<string, DetectorSignal>();
  const duplicateReferentialChannels: string[] = [];
  const ignoredNonEegChannels: string[] = [];
  const bipolarSources: DetectorBipolarSource[] = [];

  for (const signal of recording.header.signals) {
    if (signal.isAnnotation) continue;
    const channel = channelByIndex.get(signal.index);
    const shape = sourceKind(signal.label);
    if (shape.kind === "irreversible-bipolar") {
      const sourceSamples = canonicalSamples(records.samples[signal.index] ?? new Float32Array(0), signal, channel, shape.kind);
      const aliases = Object.freeze(shape.electrodes.flatMap((electrode) => aliasesFor(electrode)));
      const bipolar: DetectorBipolarSource = {
        signalIndex: signal.index,
        originalLabel: signal.label,
        electrodes: Object.freeze([...shape.electrodes]),
        aliases,
        sourceUnit: signal.unit,
        sampleRate: signal.sampleRate,
        sourceKind: "irreversible-bipolar",
        samples: sourceSamples,
        unit: DETECTOR_UNIT,
      };
      bipolarSources.push(freezeReadonly(bipolar));
      for (const electrode of shape.electrodes) {
        const key = electrode.toUpperCase();
        const labels = bipolarLabels.get(key) ?? [];
        labels.push(signal.label);
        bipolarLabels.set(key, labels);
      }
      continue;
    }

    if (shape.kind !== "referential" || !channel?.isEeg) {
      ignoredNonEegChannels.push(signal.label);
      continue;
    }

    const electrode = shape.electrodes[0]!;
    const key = electrode.toUpperCase();
    const labels = referentialLabels.get(key) ?? [];
    labels.push(signal.label);
    referentialLabels.set(key, labels);
    if (canonicalByElectrode.has(key)) {
      duplicateReferentialChannels.push(signal.label);
      continue;
    }

    const originalSamples = canonicalSamples(records.samples[signal.index] ?? new Float32Array(0), signal, channel, shape.kind);
    const sourceAliases = aliasesFor(electrode);
    const source: DetectorSignalProvenance = {
      recordingName: recording.name,
      signalIndex: signal.index,
      originalLabel: signal.label,
      sourceUnit: signal.unit,
      unit: DETECTOR_UNIT,
      sampleRate: signal.sampleRate,
      sourceKind: "referential",
      sourceElectrode: electrode,
      sourceAliases,
    };
    const detectorSignal: DetectorSignal = {
      id: `eeg:${electrode}`,
      electrode,
      canonicalName: electrode,
      aliases: sourceAliases,
      // Give consumers separate arrays: neither a model branch nor a caller
      // mutating `samples` can alter the preserved source copy.
      samples: new Float32Array(originalSamples),
      originalSamples,
      unit: DETECTOR_UNIT,
      sampleRate: signal.sampleRate,
      source: freezeReadonly(source),
    };
    canonicalByElectrode.set(key, freezeReadonly(detectorSignal));
  }

  const signals = DETECTOR_ELECTRODES
    .map((electrode) => canonicalByElectrode.get(electrode.toUpperCase()))
    .filter((signal): signal is DetectorSignal => signal != null);
  const missingChannels = DETECTOR_ELECTRODES
    .filter((electrode) => !canonicalByElectrode.has(electrode.toUpperCase()))
    .map((electrode) => buildMissing(electrode, referentialLabels, bipolarLabels));
  const missing = missingChannels.map((entry) => entry.electrode);
  const available = signals.map((signal) => signal.electrode);
  const hasBipolar = bipolarSources.length > 0;
  const hasReferential = signals.length > 0;
  const mode: DetectorLocalizationMode = hasReferential
    ? (hasBipolar ? "mixed" : "referential")
    : (hasBipolar ? "bipolar-only" : "none");
  const limitations: string[] = [
    "Only source labels that identify a referential electrode are exposed as electrode signals; no clinical localization inference is performed.",
  ];
  if (hasBipolar) {
    limitations.push(
      "Irreversible bipolar channels are retained as provenance but cannot be localized to either individual electrode without the original reference/montage.",
    );
  }
  if (missingChannels.length > 0) {
    limitations.push("Missing or bipolar-only channels reduce the available spatial coverage.");
  }

  const diagnostics: DetectorSignalDiagnostics = {
    missingChannels: Object.freeze(missingChannels),
    missing: Object.freeze(missing),
    duplicateReferentialChannels: Object.freeze(duplicateReferentialChannels),
    ignoredNonEegChannels: Object.freeze(ignoredNonEegChannels),
    bipolarSources: Object.freeze(bipolarSources),
  };
  const availability: DetectorAvailability = {
    referential: {
      available: hasReferential,
      electrodes: Object.freeze(available),
    },
    irreversibleBipolar: {
      available: hasBipolar,
      sourceLabels: Object.freeze(bipolarSources.map((source) => source.originalLabel)),
      localizableToIndividualElectrodes: false,
    },
  };
  const localization: DetectorLocalization = {
    mode,
    canLocalizeToIndividualElectrodes: hasReferential,
    limitations: Object.freeze(limitations),
  };
  const provenance = {
    recordingName: recording.name,
    source: "LoadedRecording" as const,
    interval: { start: records.start, duration: records.duration },
    preprocessingApplied: false as const,
    viewerFiltersApplied: false as const,
  };
  const output: DetectorSignalInput = {
    start: records.start,
    duration: records.duration,
    unit: DETECTOR_UNIT,
    signals: Object.freeze(signals),
    bipolarSources: Object.freeze(bipolarSources),
    availability: freezeReadonly(availability),
    localization: freezeReadonly(localization),
    diagnostics: freezeReadonly(diagnostics),
    provenance: freezeReadonly(provenance),
  };
  return freezeReadonly(output);
}

/** Descriptive aliases keep the boundary discoverable for detector callers. */
export const buildCanonicalDetectorSignals = buildDetectorSignalInput;
export const readDetectorSignals = buildDetectorSignalInput;
export const buildCanonicalSignalInput = buildDetectorSignalInput;
export const buildDetectorInput = buildDetectorSignalInput;

/**
 * Make model-facing copies from the canonical boundary.  Keeping this adapter
 * here prevents a model from accidentally receiving display-owned arrays or
 * mutating the detector boundary's preserved samples.
 */
export function modelSignalsFromDetectorInput(input: DetectorSignalInput): ModelSignalInput[] {
  return input.signals.map((signal) => ({
    electrode: signal.electrode,
    samples: new Float32Array(signal.originalSamples),
    sampleRate: signal.sampleRate,
  }));
}

export function inferenceInputFromDetectorInput(input: DetectorSignalInput): AbnormalityInferenceInput {
  return {
    interval: { start: input.start, end: input.start + input.duration },
    signals: modelSignalsFromDetectorInput(input),
  };
}
