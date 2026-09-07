/**
 * Local, user-supplied SPaRCNet integration.
 *
 * This file deliberately contains no model weights and no network loader. A
 * caller must provide a compatible, already-loaded model implementation. The
 * adapter is consequently useful in an offline review workflow without
 * suggesting that the application ships or downloads a SPaRCNet checkpoint.
 *
 * SPaRCNet is treated here as a segment-level abnormality classifier. Its
 * output is not an electrode-level onset localizer. Electrode assignments are
 * only included when the caller supplies separate evidence derived from the
 * input recording; those assignments remain experimental and ambiguous.
 */

import type {
  AbnormalityInferenceBatchRequest,
  AbnormalityInferenceResult,
  AbnormalityModelMetadata,
  UnifiedAbnormalityFinding,
  UserSuppliedLocalModelConfig,
} from "../types.ts";
import type { AbnormalityModelAdapter, ModelExecutionContext } from "../registry.ts";

/** The six event classes expected from a compatible SPaRCNet checkpoint. */
export const SPARCNET_CLASSES = [
  "Seizure",
  "LPD",
  "GPD",
  "LRDA",
  "GRDA",
  "Other",
] as const;

export type SparcnetClass = (typeof SPARCNET_CLASSES)[number];
export type SparcnetProbabilityDistribution = Record<SparcnetClass, number>;

/**
 * The longer context used by this adapter. A model may require a different
 * value, but it must declare it in its supplied manifest and the adapter will
 * reject a mismatch rather than silently resampling the context semantics.
 */
export const SPARCNET_WINDOW_SECONDS = 60;
export const SPARCNET_HOP_SECONDS = 30;
export const SPARCNET_OVERLAP_FRACTION = 0.5;

export interface SparcnetPreprocessingMetadata {
  /** Sample rate expected by the supplied checkpoint. */
  targetSampleRate: number;
  /** Explicitly declared channel convention, e.g. "10-20-19". */
  channelConvention: string;
  highpassHz: number | null;
  lowpassHz: number | null;
  notchHz: number | null;
  reference: string;
  normalization: string;
  /** Any model-specific preprocessing not represented by the fields above. */
  notes?: string;
}

export interface SparcnetModelManifest {
  modelId: string;
  modelVersion: string;
  classes: readonly SparcnetClass[];
  windowSeconds: number;
  hopSeconds: number;
  preprocessing: SparcnetPreprocessingMetadata;
}

export interface SparcnetChannelInput {
  label: string;
  /** Samples must be calibrated to the declared unit before inference. */
  samples: Float32Array | readonly number[];
  sampleRate: number;
  unit?: string;
  /** Optional mapping back to a source channel/derivation. */
  sourceLabel?: string;
}

export interface SparcnetSpatialEvidence {
  /** Label of an input channel or derivation, never a model-invented label. */
  channel: string;
  /** Optional input-derived score; its scale is owned by the caller. */
  score?: number;
  basis: string;
  derivedFromInput: true;
  ambiguous?: boolean;
}

export interface SparcnetInput {
  channels: readonly SparcnetChannelInput[];
  startTimeSeconds?: number;
  /** Optional input-derived spatial evidence; never inferred by this adapter. */
  spatialEvidence?: readonly SparcnetSpatialEvidence[];
  /** Optional source/recording identifier for provenance only. */
  sourceId?: string;
}

export interface SparcnetWindowInput {
  channels: readonly SparcnetChannelInput[];
  startTimeSeconds: number;
  durationSeconds: number;
  sampleRate: number;
}

export interface SparcnetUncertainty {
  /** Model-supplied scalar uncertainty, if the checkpoint exposes one. */
  score?: number;
  /** Model-supplied per-class uncertainty, retained without reduction. */
  perClass?: Partial<SparcnetProbabilityDistribution>;
  method?: string;
  details?: string;
}

export interface SparcnetModelPrediction {
  probabilities: SparcnetProbabilityDistribution;
  uncertainty?: SparcnetUncertainty;
  /** Retained as provenance; never used as localization evidence. */
  modelOutput?: unknown;
}

export interface SparcnetModelContext {
  signal: AbortSignal;
  windowIndex: number;
  windowCount: number;
  manifest: SparcnetModelManifest;
}

/** A model implementation supplied by the user/application host. */
export interface SparcnetModel {
  manifest: SparcnetModelManifest;
  predict(
    input: SparcnetWindowInput,
    context: SparcnetModelContext,
  ): SparcnetModelPrediction | Promise<SparcnetModelPrediction>;
}

export interface SparcnetProgress {
  completedWindows: number;
  totalWindows: number;
  fraction: number;
  windowStartSeconds: number;
}

export interface SparcnetAdapterOptions {
  model?: SparcnetModel;
  signal?: AbortSignal;
  onProgress?: (progress: SparcnetProgress) => void;
}

export interface SparcnetDerivationMapping {
  inputChannels: Array<{
    inputLabel: string;
    modelLabel: string;
    sourceLabel: string | null;
  }>;
  modelChannelConvention: string;
  limitations: string[];
}

export interface SparcnetLocalization {
  status: "not-localized" | "experimental-ambiguous";
  electrodes: string[];
  limitations: string[];
  evidence: SparcnetSpatialEvidence[];
}

export interface SparcnetProvenance {
  adapter: "sparcnet";
  modelId: string;
  modelVersion: string;
  execution: "local-user-supplied-model";
  weights: "not-bundled";
  externalInference: "none";
  preprocessing: SparcnetPreprocessingMetadata;
  sourceId: string | null;
}

export interface SparcnetFinding {
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
  /** Full six-class distribution; do not replace this with only the winner. */
  probabilities: SparcnetProbabilityDistribution;
  uncertainty: SparcnetUncertainty | null;
  localization: SparcnetLocalization;
  derivationMapping: SparcnetDerivationMapping;
  provenance: SparcnetProvenance;
  modelOutput?: unknown;
}

export interface SparcnetResult {
  findings: SparcnetFinding[];
  classes: readonly SparcnetClass[];
  windowSeconds: number;
  hopSeconds: number;
  overlapFraction: number;
  derivationMapping: SparcnetDerivationMapping;
  localizationLimitations: string[];
  provenance: SparcnetProvenance;
}

export interface SparcnetAdapterConfig {
  /** A model object already loaded by the local application/runtime. */
  model?: SparcnetModel;
  /** Optional caller-facing provenance description for the loaded artifact. */
  provenanceDescription?: string;
}

export class SparcnetConfigurationError extends Error {
  override readonly name = "SparcnetConfigurationError";
}

export class SparcnetCompatibilityError extends Error {
  override readonly name = "SparcnetCompatibilityError";
}

export class SparcnetCancelledError extends Error {
  override readonly name = "SparcnetCancelledError";
}

function fail(message: string): never {
  throw new SparcnetConfigurationError(message);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new SparcnetCancelledError("SPaRCNet inference was cancelled.");
  }
}

function assertManifest(manifest: SparcnetModelManifest): void {
  if (!manifest || typeof manifest !== "object") {
    throw new SparcnetCompatibilityError("The supplied SPaRCNet model has no manifest.");
  }
  if (!manifest.modelId || !manifest.modelVersion) {
    throw new SparcnetCompatibilityError("The SPaRCNet manifest must declare modelId and modelVersion.");
  }
  if (
    manifest.classes.length !== SPARCNET_CLASSES.length ||
    manifest.classes.some((name, index) => name !== SPARCNET_CLASSES[index])
  ) {
    throw new SparcnetCompatibilityError(
      `The supplied model must expose exactly these classes: ${SPARCNET_CLASSES.join(", ")}.`,
    );
  }
  if (!isFiniteNumber(manifest.windowSeconds) || manifest.windowSeconds <= 0) {
    throw new SparcnetCompatibilityError("The SPaRCNet manifest must declare a positive windowSeconds value.");
  }
  if (!isFiniteNumber(manifest.hopSeconds) || manifest.hopSeconds <= 0 || manifest.hopSeconds > manifest.windowSeconds) {
    throw new SparcnetCompatibilityError(
      "The SPaRCNet manifest must declare hopSeconds in the interval (0, windowSeconds].",
    );
  }
  if (!manifest.preprocessing || !isFiniteNumber(manifest.preprocessing.targetSampleRate)) {
    throw new SparcnetCompatibilityError(
      "The SPaRCNet manifest must declare preprocessing.targetSampleRate.",
    );
  }
}

function assertInput(input: SparcnetInput): { sampleRate: number; sampleCount: number } {
  if (!input || !Array.isArray(input.channels) || input.channels.length === 0) {
    fail("SPaRCNet requires at least one calibrated input channel.");
  }

  const sampleRate = input.channels[0]?.sampleRate;
  if (!isFiniteNumber(sampleRate) || sampleRate <= 0) {
    fail("SPaRCNet input channels must declare a positive sampleRate.");
  }

  const sampleCount = input.channels[0]?.samples.length ?? 0;
  if (sampleCount === 0) {
    fail("SPaRCNet input channels must contain samples.");
  }

  const labels = new Set<string>();
  for (const channel of input.channels) {
    if (!channel.label || labels.has(channel.label)) {
      fail("SPaRCNet input channel labels must be non-empty and unique.");
    }
    labels.add(channel.label);
    if (!isFiniteNumber(channel.sampleRate) || channel.sampleRate !== sampleRate) {
      fail("All SPaRCNet input channels must have the same sample rate.");
    }
    if (channel.samples.length !== sampleCount) {
      fail("All SPaRCNet input channels must have the same sample count.");
    }
    for (const value of channel.samples) {
      if (!isFiniteNumber(value)) {
        fail(`SPaRCNet channel ${channel.label} contains a non-finite sample.`);
      }
    }
  }

  return { sampleRate, sampleCount };
}

function assertProbabilityDistribution(
  probabilities: SparcnetProbabilityDistribution,
): SparcnetProbabilityDistribution {
  let total = 0;
  for (const className of SPARCNET_CLASSES) {
    const value = probabilities?.[className];
    if (!isFiniteNumber(value) || value < 0) {
      throw new SparcnetCompatibilityError(
        `SPaRCNet prediction is missing a finite non-negative probability for ${className}.`,
      );
    }
    total += value;
  }
  if (!(total > 0) || Math.abs(total - 1) > 1e-3) {
    throw new SparcnetCompatibilityError(
      `SPaRCNet probabilities must sum to 1 (received ${total}).`,
    );
  }
  // Preserve the model's distribution exactly; do not renormalize or collapse it.
  return { ...probabilities };
}

function makeDerivationMapping(input: SparcnetInput, manifest: SparcnetModelManifest): SparcnetDerivationMapping {
  return {
    inputChannels: input.channels.map((channel) => ({
      inputLabel: channel.label,
      modelLabel: channel.label,
      sourceLabel: channel.sourceLabel ?? null,
    })),
    modelChannelConvention: manifest.preprocessing.channelConvention,
    limitations: [
      "The adapter preserves the supplied channel/derivation labels; it does not infer missing electrodes or montage equivalence.",
      "A segment-level class probability is not an electrode-level onset localization.",
    ],
  };
}

function makeLocalization(input: SparcnetInput): SparcnetLocalization {
  const evidence = input.spatialEvidence ? [...input.spatialEvidence] : [];
  if (evidence.length === 0) {
    return {
      status: "not-localized",
      electrodes: [],
      limitations: [
        "SPaRCNet output is segment-level and does not localize seizure onset to an electrode.",
        "No separate input-derived spatial evidence was supplied.",
      ],
      evidence: [],
    };
  }

  const inputLabels = new Set(input.channels.map((channel) => channel.label));
  const validEvidence = evidence.filter((item) => item.derivedFromInput && inputLabels.has(item.channel));
  if (validEvidence.length === 0) {
    return {
      status: "not-localized",
      electrodes: [],
      limitations: [
        "Spatial evidence was supplied but did not reference an input channel with derivedFromInput=true.",
        "SPaRCNet output remains non-localizing.",
      ],
      evidence: [],
    };
  }

  return {
    status: "experimental-ambiguous",
    electrodes: [...new Set(validEvidence.map((item) => item.channel))],
    limitations: [
      "Electrode labels come only from separate input-derived spatial evidence, not from SPaRCNet.",
      "This assignment is experimental and ambiguous; it is not an exact onset localizer.",
    ],
    evidence: validEvidence,
  };
}

function makeWindow(
  input: SparcnetInput,
  startSample: number,
  sampleCount: number,
  sampleRate: number,
): SparcnetWindowInput {
  return {
    channels: input.channels.map((channel) => ({
      ...channel,
      samples: channel.samples.slice(startSample, startSample + sampleCount),
    })),
    startTimeSeconds: (input.startTimeSeconds ?? 0) + startSample / sampleRate,
    durationSeconds: sampleCount / sampleRate,
    sampleRate,
  };
}

function modelClassType(label: SparcnetClass): UnifiedAbnormalityFinding["type"] {
  if (label === "Seizure") return "seizure-like";
  if (label === "LPD" || label === "GPD") return "periodic-discharge";
  if (label === "LRDA" || label === "GRDA") return "rhythmic-pattern";
  return "other";
}

function sharedFinding(
  rich: SparcnetFinding,
  request: AbnormalityInferenceBatchRequest["recording"],
  index: number,
  metadata: AbnormalityModelMetadata,
): UnifiedAbnormalityFinding {
  const entries = SPARCNET_CLASSES.map((label) => ({
    label,
    probability: rich.probabilities[label],
  }));
  const top = [...entries].sort((left, right) => right.probability - left.probability)[0];
  const evidence = rich.localization.evidence;
  const electrodeProbabilities = evidence
    .filter((item) => item.score !== undefined && Number.isFinite(item.score) && item.score >= 0 && item.score <= 1)
    .map((item) => ({ electrode: item.channel, probability: item.score as number }));
  const candidateElectrodes = evidence.map((item, evidenceIndex) => ({
    electrode: item.channel,
    rank: evidenceIndex + 1,
  }));

  return {
    id: `${request.id}:sparcnet:${index}:${rich.startTimeSeconds.toFixed(3)}`,
    recording: request,
    interval: { start: rich.startTimeSeconds, end: rich.endTimeSeconds },
    type: modelClassType(top.label as SparcnetClass),
    label: top.label,
    confidence: top.probability,
    // These arrays are intentionally empty when no separate input-derived
    // evidence exists. SPaRCNet itself is not an onset localizer.
    electrodeProbabilities,
    candidateElectrodes,
    displayedDerivations: [],
    distribution: { kind: "categorical", entries },
    spatialDistribution: rich.localization.status === "not-localized"
      ? "not localized"
      : `experimental candidates: ${rich.localization.electrodes.join(", ")}`,
    laterality: "unknown",
    artifactProbability: null,
    detector: metadata,
    reviewStatus: "unreviewed",
    limitations: [
      ...rich.localization.limitations,
      ...rich.derivationMapping.limitations,
      "This SPaRCNet adapter does not estimate artifact probability; the value is unavailable.",
      "Uncertainty is retained on the rich SparcnetFinding returned by analyze/run; the shared finding contract has no uncertainty field.",
    ],
  };
}

function assertLocalModel(value: unknown): asserts value is SparcnetModel {
  if (!value || typeof value !== "object" || typeof (value as SparcnetModel).predict !== "function") {
    throw new SparcnetConfigurationError(
      "The supplied local SPaRCNet configuration did not load a compatible model with predict().",
    );
  }
  assertManifest((value as SparcnetModel).manifest);
}

/**
 * Run a supplied SPaRCNet implementation over longer, overlapping windows.
 *
 * The function is intentionally strict: absent/incompatible models, malformed
 * predictions, sample-rate mismatches, and incomplete distributions all fail
 * explicitly. There is no heuristic, mock, random, or remote fallback.
 */
export async function runSparcnet(
  input: SparcnetInput,
  options: SparcnetAdapterOptions = {},
): Promise<SparcnetResult> {
  const model = options.model;
  if (!model) {
    fail("SPaRCNet requires a locally supplied compatible model; no model was provided.");
  }
  if (typeof model.predict !== "function") {
    throw new SparcnetCompatibilityError("The supplied SPaRCNet model does not implement predict().");
  }

  const signal = options.signal ?? new AbortController().signal;
  assertNotAborted(signal);
  assertManifest(model.manifest);
  const { sampleRate, sampleCount } = assertInput(input);
  if (Math.abs(sampleRate - model.manifest.preprocessing.targetSampleRate) > 1e-6) {
    throw new SparcnetCompatibilityError(
      `SPaRCNet expects ${model.manifest.preprocessing.targetSampleRate} Hz but received ${sampleRate} Hz.`,
    );
  }
  if (Math.abs(model.manifest.windowSeconds - SPARCNET_WINDOW_SECONDS) > 1e-6 ||
      Math.abs(model.manifest.hopSeconds - SPARCNET_HOP_SECONDS) > 1e-6) {
    throw new SparcnetCompatibilityError(
      `This adapter requires the declared ${SPARCNET_WINDOW_SECONDS}s/${SPARCNET_HOP_SECONDS}s overlapping window configuration.`,
    );
  }

  const windowSamples = Math.round(model.manifest.windowSeconds * sampleRate);
  const hopSamples = Math.round(model.manifest.hopSeconds * sampleRate);
  if (windowSamples <= 0 || hopSamples <= 0) {
    throw new SparcnetCompatibilityError("SPaRCNet window configuration produced an invalid sample count.");
  }
  if (sampleCount < windowSamples) {
    throw new SparcnetCompatibilityError(
      `SPaRCNet requires at least ${model.manifest.windowSeconds} seconds of input for one window.`,
    );
  }

  const starts: number[] = [];
  for (let start = 0; start + windowSamples <= sampleCount; start += hopSamples) {
    starts.push(start);
  }
  const lastStart = sampleCount - windowSamples;
  if (starts[starts.length - 1] !== lastStart) starts.push(lastStart);

  const derivationMapping = makeDerivationMapping(input, model.manifest);
  const localization = makeLocalization(input);
  const provenance: SparcnetProvenance = {
    adapter: "sparcnet",
    modelId: model.manifest.modelId,
    modelVersion: model.manifest.modelVersion,
    execution: "local-user-supplied-model",
    weights: "not-bundled",
    externalInference: "none",
    preprocessing: model.manifest.preprocessing,
    sourceId: input.sourceId ?? null,
  };

  const findings: SparcnetFinding[] = [];
  for (let index = 0; index < starts.length; index += 1) {
    assertNotAborted(signal);
    const startSample = starts[index];
    const window = makeWindow(input, startSample, windowSamples, sampleRate);
    const prediction = await model.predict(window, {
      signal,
      windowIndex: index,
      windowCount: starts.length,
      manifest: model.manifest,
    });
    assertNotAborted(signal);
    if (!prediction || typeof prediction !== "object") {
      throw new SparcnetCompatibilityError(`SPaRCNet returned no prediction for window ${index + 1}.`);
    }
    const probabilities = assertProbabilityDistribution(prediction.probabilities);
    const startTimeSeconds = window.startTimeSeconds;
    findings.push({
      startTimeSeconds,
      endTimeSeconds: startTimeSeconds + window.durationSeconds,
      durationSeconds: window.durationSeconds,
      probabilities,
      uncertainty: prediction.uncertainty ?? null,
      localization,
      derivationMapping,
      provenance,
      ...(prediction.modelOutput === undefined ? {} : { modelOutput: prediction.modelOutput }),
    });
    options.onProgress?.({
      completedWindows: index + 1,
      totalWindows: starts.length,
      fraction: (index + 1) / starts.length,
      windowStartSeconds: startTimeSeconds,
    });
  }

  return {
    findings,
    classes: SPARCNET_CLASSES,
    windowSeconds: model.manifest.windowSeconds,
    hopSeconds: model.manifest.hopSeconds,
    overlapFraction: SPARCNET_OVERLAP_FRACTION,
    derivationMapping,
    localizationLimitations: localization.limitations,
    provenance,
  };
}

/**
 * Registry-compatible wrapper around the rich local SPaRCNet runner above.
 * `analyze`/`run` should be preferred when callers need model-supplied
 * uncertainty; `infer` projects into the repository's shared finding type.
 */
export class SparcnetAdapter implements AbnormalityModelAdapter {
  readonly metadata: AbnormalityModelMetadata;
  private readonly model: SparcnetModel;

  constructor(config: SparcnetAdapterConfig) {
    if (!config?.model) {
      throw new SparcnetConfigurationError(
        "SPaRCNet cannot be configured without a locally supplied model; weights are not bundled or downloaded.",
      );
    }
    assertLocalModel(config.model);
    this.model = config.model;
    this.metadata = {
      id: "sparcnet",
      displayName: "SPaRCNet",
      name: "SPaRCNet",
      version: this.model.manifest.modelVersion,
      preprocessingVersion: [
        `window-${this.model.manifest.windowSeconds}s-hop-${this.model.manifest.hopSeconds}s`,
        this.model.manifest.preprocessing.channelConvention,
        this.model.manifest.preprocessing.normalization,
      ].join(";"),
      classification: "experimental",
      provenance: {
        kind: "user-supplied",
        description: config.provenanceDescription ?? "User-supplied local SPaRCNet model; no checkpoint is bundled.",
        artifactId: this.model.manifest.modelId,
      },
      capabilities: {
        batching: false,
        cancellation: true,
        backends: ["wasm"],
      },
    };
  }

  get manifest(): SparcnetModelManifest {
    return this.model.manifest;
  }

  async analyze(input: SparcnetInput, options: Omit<SparcnetAdapterOptions, "model"> = {}): Promise<SparcnetResult> {
    return runSparcnet(input, { ...options, model: this.model });
  }

  run(input: SparcnetInput, options: Omit<SparcnetAdapterOptions, "model"> = {}): Promise<SparcnetResult> {
    return this.analyze(input, options);
  }

  async infer(
    request: AbnormalityInferenceBatchRequest,
    context: ModelExecutionContext,
  ): Promise<AbnormalityInferenceResult> {
    if (!request?.recording?.id || !Array.isArray(request.inputs) || request.inputs.length === 0) {
      throw new SparcnetConfigurationError("SPaRCNet requires a recording and at least one inference input window.");
    }
    const findings: UnifiedAbnormalityFinding[] = [];
    let completed = 0;
    for (const input of request.inputs) {
      if (context.signal.aborted) throw new SparcnetCancelledError("SPaRCNet inference was cancelled.");
      const rich = await this.analyze(
        {
          channels: input.signals.map((signal) => ({
            label: signal.electrode,
            sourceLabel: signal.electrode,
            samples: signal.samples,
            sampleRate: signal.sampleRate,
          })),
          startTimeSeconds: input.interval.start,
        },
        {
          signal: context.signal,
          onProgress: (progress) => {
            context.reportProgress({
              completed: completed + progress.completedWindows / Math.max(1, progress.totalWindows),
              total: request.inputs.length,
              phase: "inference",
              message: `SPaRCNet window ${progress.completedWindows}/${progress.totalWindows}`,
            });
          },
        },
      );
      rich.findings.forEach((finding, index) => {
        findings.push(sharedFinding(finding, request.recording, findings.length + index, this.metadata));
      });
      completed += 1;
      context.reportProgress({
        completed,
        total: request.inputs.length,
        phase: completed === request.inputs.length ? "complete" : "inference",
      });
    }
    return { findings };
  }
}

/** Load a user-supplied local model config without adding a network path. */
export async function createSparcnetAdapterFromConfig(
  config: UserSuppliedLocalModelConfig,
  signal: AbortSignal = new AbortController().signal,
): Promise<SparcnetAdapter> {
  if (!config) {
    throw new SparcnetConfigurationError(
      "SPaRCNet must be registered as an experimental or imported-local user-supplied model.",
    );
  }
  if (signal.aborted) throw new SparcnetCancelledError("SPaRCNet model loading was cancelled.");
  const loaded = await config.load(config.artifact);
  if (signal.aborted) throw new SparcnetCancelledError("SPaRCNet model loading was cancelled.");
  assertLocalModel(loaded);
  return new SparcnetAdapter({
    model: loaded,
    provenanceDescription: config.provenance.description,
  });
}

/** Adapter metadata/progress helper for hosts that register models lazily. */
export function sparcnetMetadata(model: SparcnetModel): AbnormalityModelMetadata {
  return new SparcnetAdapter({ model }).metadata;
}

/** Alias with an adapter-shaped name for registries that use `analyze`. */
export const sparcnetAdapter = {
  id: "sparcnet",
  label: "SPaRCNet",
  classes: SPARCNET_CLASSES,
  windowSeconds: SPARCNET_WINDOW_SECONDS,
  hopSeconds: SPARCNET_HOP_SECONDS,
  overlapFraction: SPARCNET_OVERLAP_FRACTION,
  run: runSparcnet,
  analyze: runSparcnet,
  limitations: [
    "Requires a compatible user-supplied local model and declared preprocessing manifest.",
    "Does not bundle weights, call external inference APIs, or infer electrode-level onset.",
  ],
} as const;
