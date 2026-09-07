import {
  SPIKENET2_MANIFEST,
  SPIKENET2_MODEL_ID,
  SPIKENET2_SUPPORTED_BACKENDS,
  type SpikeNet2Manifest,
  validateSpikeNet2Manifest,
} from "./spikenet2-manifest";
import type {
  AbnormalityInferenceBatchRequest,
  AbnormalityModelMetadata,
  AbnormalityInferenceResult,
  ModelProgress,
  UnifiedAbnormalityFinding,
} from "../types.ts";
import { AbnormalityModelError, type AbnormalityModelAdapter, type ModelExecutionContext } from "../registry.ts";

/**
 * SpikeNet2 is a local, user-supplied-weight adapter.  This file deliberately
 * contains no checkpoint bytes and makes no network requests.  Its structural
 * input/output types are compatible with the abnormality contracts in
 * ../types.ts while keeping this adapter usable before a backend is installed.
 */

export const SPIKENET2_PREPROCESSING = Object.freeze({
  targetSampleRate: 256,
  bandpassHz: [0.5, 70] as readonly [number, number],
  notchHz: 60,
  channelStandardization: "median-mad-clipped-8" as const,
  missingChannelPolicy: "reject" as const,
  calibration: "input samples are assumed to be calibrated physical units" as const,
});

export const SPIKENET2_WINDOW_CONTRACT = Object.freeze({
  windowSeconds: 2,
  hopSeconds: 0.5,
  boundary: "left-closed-right-open" as const,
  eventMergeGapSeconds: 0.5,
});
export const SPIKENET2_WINDOW_SECONDS = SPIKENET2_WINDOW_CONTRACT.windowSeconds;
export const SPIKENET2_HOP_SECONDS = SPIKENET2_WINDOW_CONTRACT.hopSeconds;

export const SPIKENET2_LIMITATIONS = Object.freeze([
  "This research integration is not a diagnosis or a seizure detector.",
  "A model score indicates similarity to the model's IED training target; it does not establish clinical significance.",
  "Electrode probabilities are model outputs, not proof of an epileptogenic source.",
  "Attention or saliency maps, when supplied by a backend, are not used as proof of localization.",
  "Bipolar-only displays can be ambiguous because a voltage difference does not uniquely identify the source electrode.",
  "Results depend on the user-supplied checkpoint, preprocessing, montage, calibration, and backend implementation.",
] as const);

export type SpikeNet2ErrorCode =
  | "model-not-installed"
  | "unsupported-backend"
  | "invalid-manifest"
  | "credential-required"
  | "incompatible-input"
  | "invalid-model-output";

export class SpikeNet2AdapterError extends Error {
  readonly code: SpikeNet2ErrorCode;

  constructor(code: SpikeNet2ErrorCode, message: string) {
    super(message);
    this.name = "SpikeNet2AdapterError";
    this.code = code;
  }
}

export interface SpikeNet2InputChannel {
  id?: string;
  label: string;
  samples: Float32Array | readonly number[];
  sampleRate: number;
  laterality?: "left" | "right" | "midline" | "unknown";
  /** True when this is a bipolar derivation rather than a source electrode. */
  isBipolar?: boolean;
}

export interface SpikeNet2DisplayedDerivation {
  id: string;
  label: string;
  sources: readonly string[];
  isBipolar?: boolean;
}

export interface SpikeNet2AnalysisInput {
  channels: readonly SpikeNet2InputChannel[];
  /** Absolute recording time of channels[0].samples[0], in seconds. */
  startSeconds?: number;
  displayedDerivations?: readonly SpikeNet2DisplayedDerivation[];
  /** Explicitly marks a view where all supplied signals are bipolar. */
  bipolarOnly?: boolean;
}

export interface SpikeNet2Tensor {
  data: Float32Array;
  channels: number;
  samples: number;
  sampleRate: number;
  windowStartSeconds: number;
}

export interface SpikeNet2ModelWindowOutput {
  startSeconds?: number;
  durationSeconds?: number;
  probabilities: readonly number[];
}

export interface SpikeNet2ModelOutput {
  /** One probability vector for each input window, in manifest electrode order. */
  windows?: readonly SpikeNet2ModelWindowOutput[];
  /** Convenience matrix form accepted from simple local runners. */
  probabilities?: readonly (readonly number[])[];
}

export interface SpikeNet2ModelRunner {
  readonly backend: string;
  predict(input: SpikeNet2Tensor): Promise<SpikeNet2ModelOutput>;
}

export type SpikeNet2CheckpointSource =
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | (() => Promise<Blob | ArrayBuffer | ArrayBufferView>);

export interface SpikeNet2CheckpointLoader {
  load(
    checkpoint: ArrayBuffer,
    manifest: SpikeNet2Manifest,
  ): Promise<SpikeNet2ModelRunner>;
}

export interface SpikeNet2LocalModelOptions {
  manifest?: unknown;
  checkpoint?: SpikeNet2CheckpointSource;
  /** The provider's credential gate is intentionally a boolean, not a secret. */
  credentialedAccess?: boolean;
  loader?: SpikeNet2CheckpointLoader;
  runner?: SpikeNet2ModelRunner;
}

export interface SpikeNet2Provenance {
  adapter: typeof SPIKENET2_MODEL_ID;
  modelVersion: string;
  backend: string;
  checkpointSha256: string;
  preprocessing: typeof SPIKENET2_PREPROCESSING;
  window: typeof SPIKENET2_WINDOW_CONTRACT;
  source: "local-user-supplied-checkpoint";
  generatedAt: string;
}

export interface SpikeNet2DisplayedEvidence {
  derivationId: string;
  label: string;
  probability: number;
  sourceElectrodes: readonly string[];
  localization: "displayed-derivation-projection" | "ambiguous-bipolar";
}

export interface SpikeNet2Finding {
  kind: "interictal-epileptiform-discharge";
  startSeconds: number;
  endSeconds: number;
  probability: number;
  confidence: number;
  electrodeProbabilities: Readonly<Record<string, number>>;
  distribution: "focal" | "generalized" | "indeterminate";
  localization: "electrode-probability" | "ambiguous-bipolar" | "none";
  displayedDerivations: readonly SpikeNet2DisplayedEvidence[];
  provenance: SpikeNet2Provenance;
  limitations: readonly string[];
}

export interface SpikeNet2AnalysisResult {
  findings: readonly SpikeNet2Finding[];
  provenance: SpikeNet2Provenance;
  limitations: readonly string[];
}

/** Shared-contract view used by the local model registry. */
export interface SpikeNet2AdapterOptions {
  adapter?: SpikeNet2Adapter;
  signal?: AbortSignal;
  onProgress?: (progress: ModelProgress) => void;
}

const SUPPORTED_BACKENDS = new Set<string>(SPIKENET2_SUPPORTED_BACKENDS);

function bytesFromSource(source: Blob | ArrayBuffer | ArrayBufferView): Promise<ArrayBuffer> {
  if (source instanceof Blob) return source.arrayBuffer();
  if (source instanceof ArrayBuffer) return Promise.resolve(source.slice(0));
  const view = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  return Promise.resolve(view.slice().buffer);
}

/**
 * Lazy local loading keeps a File/Blob out of memory until analysis is
 * requested. A loader is the only place that may know how to initialize a
 * particular local runtime (ONNX, TensorFlow.js, or a custom adapter).
 */
export class LazySpikeNet2Model {
  private loaded: SpikeNet2ModelRunner | null = null;
  private pending: Promise<SpikeNet2ModelRunner> | null = null;

  constructor(
    private readonly source: SpikeNet2CheckpointSource,
    private readonly manifest: SpikeNet2Manifest,
    private readonly loader: SpikeNet2CheckpointLoader,
  ) {}

  async load(): Promise<SpikeNet2ModelRunner> {
    if (this.loaded) return this.loaded;
    if (!this.pending) {
      this.pending = (async () => {
        const raw = typeof this.source === "function" ? await this.source() : this.source;
        const bytes = await bytesFromSource(raw);
        const runner = await this.loader.load(bytes, this.manifest);
        if (!SUPPORTED_BACKENDS.has(runner.backend)) {
          throw new SpikeNet2AdapterError(
            "unsupported-backend",
            `SpikeNet2 backend ${runner.backend} is not supported for local execution.`,
          );
        }
        this.loaded = runner;
        return runner;
      })();
    }
    try {
      return await this.pending;
    } finally {
      this.pending = null;
    }
  }
}

export function createLazySpikeNet2Model(
  source: SpikeNet2CheckpointSource,
  manifest: SpikeNet2Manifest,
  loader: SpikeNet2CheckpointLoader,
): LazySpikeNet2Model {
  return new LazySpikeNet2Model(source, manifest, loader);
}

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function resample(values: readonly number[], fromRate: number, toRate: number): Float32Array {
  if (values.length === 0) return new Float32Array();
  if (Math.abs(fromRate - toRate) < 1e-9) return Float32Array.from(values);
  const length = Math.max(1, Math.round((values.length - 1) * toRate / fromRate) + 1);
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const position = index * fromRate / toRate;
    const left = Math.min(values.length - 1, Math.floor(position));
    const right = Math.min(values.length - 1, left + 1);
    const fraction = position - left;
    output[index] = values[left] * (1 - fraction) + values[right] * fraction;
  }
  return output;
}

function normalizeChannel(values: readonly number[]): Float32Array {
  const finite = values.filter((value) => Number.isFinite(value));
  const center = median(finite);
  const deviations = finite.map((value) => Math.abs(value - center));
  const scale = Math.max(1e-9, median(deviations) * 1.4826);
  const output = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    const value = Number.isFinite(values[index]) ? (values[index] - center) / scale : 0;
    output[index] = Math.max(-8, Math.min(8, value));
  }
  return output;
}

function canonicalLabel(label: string): string {
  return label.trim().toUpperCase().replace(/\s+/g, " ");
}

function makeProvenance(manifest: SpikeNet2Manifest): SpikeNet2Provenance {
  return {
    adapter: SPIKENET2_MODEL_ID,
    modelVersion: manifest.modelVersion,
    backend: manifest.backend,
    checkpointSha256: manifest.checkpointSha256,
    preprocessing: SPIKENET2_PREPROCESSING,
    window: SPIKENET2_WINDOW_CONTRACT,
    source: "local-user-supplied-checkpoint",
    generatedAt: new Date().toISOString(),
  };
}

function probability(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function distributions(
  labels: readonly string[],
  channels: readonly SpikeNet2InputChannel[],
  probabilities: readonly number[],
  bipolarOnly: boolean,
): { distribution: SpikeNet2Finding["distribution"]; localization: SpikeNet2Finding["localization"] } {
  if (bipolarOnly) return { distribution: "indeterminate", localization: "ambiguous-bipolar" };
  const channelByLabel = new Map(channels.map((channel) => [canonicalLabel(channel.label), channel]));
  const ranked = labels
    .map((label, index) => ({ label, score: probability(probabilities[index] ?? 0), channel: channelByLabel.get(canonicalLabel(label)) }))
    .sort((a, b) => b.score - a.score);
  const total = ranked.reduce((sum, item) => sum + item.score, 0);
  if (ranked.length === 0 || total < 0.5) return { distribution: "indeterminate", localization: "none" };
  const top = ranked[0];
  const active = ranked.filter((item) => item.score >= 0.5);
  const hemispheres = new Set(active.map((item) => item.channel?.laterality).filter(Boolean));
  if (top.score >= 0.7 && top.score / total >= 0.45 && active.length <= Math.max(2, Math.ceil(labels.length / 3))) {
    return { distribution: "focal", localization: "electrode-probability" };
  }
  if (active.length >= Math.max(2, Math.ceil(labels.length * 0.5)) || hemispheres.size >= 2) {
    return { distribution: "generalized", localization: "electrode-probability" };
  }
  return { distribution: "indeterminate", localization: "electrode-probability" };
}

/** Map model-electrode probabilities into what the user can actually see. */
export function mapSpikeNet2ToDisplayedDerivations(
  labels: readonly string[],
  probabilities: readonly number[],
  displayedDerivations: readonly SpikeNet2DisplayedDerivation[] | undefined,
  bipolarOnly: boolean,
): SpikeNet2DisplayedEvidence[] {
  if (!displayedDerivations) return [];
  const scoreByLabel = new Map(labels.map((label, index) => [canonicalLabel(label), probability(probabilities[index] ?? 0)]));
  return displayedDerivations.map((derivation) => {
    const sourceScores = derivation.sources.map((source) => scoreByLabel.get(canonicalLabel(source)) ?? 0);
    const score = sourceScores.length === 0 ? 0 : sourceScores.reduce((sum, value) => sum + value, 0) / sourceScores.length;
    const ambiguous = bipolarOnly || derivation.isBipolar === true || derivation.sources.length > 1;
    return {
      derivationId: derivation.id,
      label: derivation.label,
      probability: score,
      sourceElectrodes: derivation.sources,
      localization: ambiguous ? "ambiguous-bipolar" : "displayed-derivation-projection",
    };
  });
}

function extractWindows(output: SpikeNet2ModelOutput): readonly SpikeNet2ModelWindowOutput[] {
  if (Array.isArray(output.windows)) return output.windows;
  if (Array.isArray(output.probabilities)) {
    return output.probabilities.map((probabilities) => ({ probabilities }));
  }
  throw new SpikeNet2AdapterError("invalid-model-output", "SpikeNet2 runner returned no probability windows.");
}

function validateProbabilities(probabilities: readonly number[], electrodeCount: number): number[] {
  if (probabilities.length !== electrodeCount) {
    throw new SpikeNet2AdapterError(
      "invalid-model-output",
      `SpikeNet2 runner returned ${probabilities.length} probabilities for ${electrodeCount} electrodes.`,
    );
  }
  if (probabilities.some((value) => !Number.isFinite(value))) {
    throw new SpikeNet2AdapterError("invalid-model-output", "SpikeNet2 runner returned a non-finite probability.");
  }
  return probabilities.map(probability);
}

interface EventAccumulator {
  startSeconds: number;
  endSeconds: number;
  probability: number;
  electrodeProbabilities: number[];
}

function backendCapabilities(backend: string): AbnormalityModelMetadata["capabilities"]["backends"] {
  if (backend === "onnx-webgpu") return ["webgpu"];
  if (backend === "onnx-wasm" || backend === "tensorflowjs") return ["wasm"];
  return ["wasm"];
}

function sharedDistribution(kind: SpikeNet2Finding["distribution"]): UnifiedAbnormalityFinding["distribution"] {
  const entries = ["focal", "generalized", "indeterminate"].map((label) => ({
    label,
    probability: label === kind ? 1 : 0,
  }));
  return { kind: "categorical", entries };
}

function sharedFinding(
  finding: SpikeNet2Finding,
  recording: AbnormalityInferenceBatchRequest["recording"],
  index: number,
  metadata: AbnormalityModelMetadata,
): UnifiedAbnormalityFinding {
  const probabilities = Object.entries(finding.electrodeProbabilities)
    .map(([electrode, probability]) => ({ electrode, probability }));
  const candidates = [...probabilities]
    .sort((left, right) => right.probability - left.probability)
    .map((entry, candidateIndex) => ({ electrode: entry.electrode, rank: candidateIndex + 1, probability: entry.probability }));
  const top = candidates[0]?.electrode;
  const laterality: UnifiedAbnormalityFinding["laterality"] = "unknown";
  return {
    id: `${recording.id}:spikenet2:${index}:${finding.startSeconds.toFixed(3)}`,
    recording,
    interval: { start: finding.startSeconds, end: finding.endSeconds },
    type: "spike",
    label: "interictal epileptiform discharge",
    confidence: finding.confidence,
    electrodeProbabilities: probabilities,
    candidateElectrodes: candidates,
    displayedDerivations: finding.displayedDerivations.map((derivation) => ({
      id: derivation.derivationId,
      label: derivation.label,
      electrodes: [...derivation.sourceElectrodes],
      laterality: "unknown",
      contribution: derivation.probability,
    })),
    distribution: sharedDistribution(finding.distribution),
    spatialDistribution: finding.distribution,
    laterality: top ? laterality : "unknown",
    artifactProbability: null,
    detector: metadata,
    reviewStatus: "unreviewed",
    limitations: [...finding.limitations, "This SpikeNet2 adapter does not estimate artifact probability; the value is unavailable."],
  };
}

/**
 * SpikeNet2 local adapter. It refuses to analyze until both a validated
 * manifest and compatible local execution are configured.
 */
export class SpikeNet2Adapter implements AbnormalityModelAdapter {
  readonly manifest: SpikeNet2Manifest;
  readonly provenance: SpikeNet2Provenance;
  readonly metadata: AbnormalityModelMetadata;
  private readonly model: LazySpikeNet2Model | null;
  private readonly directRunner: SpikeNet2ModelRunner | null;

  constructor(options: SpikeNet2LocalModelOptions = {}) {
    if (options.manifest === undefined && options.checkpoint === undefined && options.runner === undefined) {
      throw new SpikeNet2AdapterError(
        "model-not-installed",
        "SpikeNet2 is not installed. Supply an authorized local checkpoint, its real manifest and checksum, and a compatible local loader.",
      );
    }
    const validation = validateSpikeNet2Manifest(options.manifest ?? SPIKENET2_MANIFEST);
    if (!validation.valid || !validation.manifest) {
      const unsupportedBackend = validation.errors.some((error) => error.startsWith("Unsupported SpikeNet2 backend:"));
      throw new SpikeNet2AdapterError(unsupportedBackend ? "unsupported-backend" : "invalid-manifest", validation.errors.join(" "));
    }
    this.manifest = validation.manifest;
    this.provenance = makeProvenance(this.manifest);
    this.metadata = {
      id: SPIKENET2_MODEL_ID,
      displayName: "SpikeNet2 (local checkpoint)",
      name: "SpikeNet2",
      version: this.manifest.modelVersion,
      classification: "experimental",
      preprocessingVersion: "spikenet2-v2-0.5-70hz-median-mad",
      provenance: {
        kind: "user-supplied",
        description: "Credentialed SpikeNet2 checkpoint supplied and executed locally; weights are not bundled.",
        artifactId: this.manifest.checkpointSha256,
        checksum: this.manifest.checkpointSha256,
      },
      capabilities: {
        batching: false,
        cancellation: true,
        backends: backendCapabilities(this.manifest.backend),
      },
    };
    // Even a direct in-memory runner is considered configured only after the
    // caller has passed the provider's credential gate explicitly.
    this.directRunner = options.credentialedAccess === true ? options.runner ?? null : null;
    if (this.manifest.backend !== "custom-local" && !SUPPORTED_BACKENDS.has(this.manifest.backend)) {
      throw new SpikeNet2AdapterError("unsupported-backend", `Unsupported SpikeNet2 backend: ${this.manifest.backend}.`);
    }
    if (options.credentialedAccess !== true) {
      this.model = null;
    } else if (options.checkpoint && options.loader) {
      this.model = createLazySpikeNet2Model(options.checkpoint, this.manifest, options.loader);
    } else {
      this.model = null;
    }
  }

  /** True only when a local runner or lazy local checkpoint is configured. */
  get isExecutionConfigured(): boolean {
    return this.directRunner !== null || this.model !== null;
  }

  async infer(
    request: AbnormalityInferenceBatchRequest,
    context: ModelExecutionContext,
  ): Promise<AbnormalityInferenceResult> {
    const findings: UnifiedAbnormalityFinding[] = [];
    for (let inputIndex = 0; inputIndex < request.inputs.length; inputIndex += 1) {
      if (context.signal.aborted) {
        throw new AbnormalityModelError("model-cancelled", "SpikeNet2 inference was cancelled.", { modelId: SPIKENET2_MODEL_ID });
      }
      const input = request.inputs[inputIndex];
      let rich: SpikeNet2AnalysisResult;
      try {
        rich = await this.analyze({
          channels: input.signals.map((signal) => ({
            label: signal.electrode,
            samples: signal.samples,
            sampleRate: signal.sampleRate,
            isBipolar: /(?:-|–|—|to)/i.test(signal.electrode),
          })),
          startSeconds: input.interval.start,
        });
      } catch (error) {
        if (error instanceof SpikeNet2AdapterError && error.code === "model-not-installed") {
          throw new AbnormalityModelError("model-not-installed", error.message, { modelId: SPIKENET2_MODEL_ID });
        }
        if (error instanceof SpikeNet2AdapterError && error.code === "unsupported-backend") {
          throw new AbnormalityModelError("unsupported-model", error.message, { modelId: SPIKENET2_MODEL_ID });
        }
        throw error;
      }
      rich.findings.forEach((finding, findingIndex) => {
        findings.push(sharedFinding(finding, request.recording, inputIndex + findingIndex, this.metadata));
      });
      context.reportProgress({
        completed: inputIndex + 1,
        total: request.inputs.length,
        phase: "inference",
        message: `SpikeNet2 local window ${inputIndex + 1} of ${request.inputs.length}`,
      });
    }
    return { findings };
  }

  private async runner(): Promise<SpikeNet2ModelRunner> {
    const runner = this.directRunner ?? (this.model ? await this.model.load() : null);
    if (!runner) {
      throw new SpikeNet2AdapterError(
        "model-not-installed",
        "SpikeNet2 model is not installed. Supply a credentialed local checkpoint and compatible local backend.",
      );
    }
    if (!SUPPORTED_BACKENDS.has(runner.backend)) {
      throw new SpikeNet2AdapterError("unsupported-backend", `SpikeNet2 backend ${runner.backend} is not supported.`);
    }
    if (runner.backend !== this.manifest.backend && this.manifest.backend !== "custom-local") {
      throw new SpikeNet2AdapterError(
        "unsupported-backend",
        `Manifest backend ${this.manifest.backend} does not match runner backend ${runner.backend}.`,
      );
    }
    return runner;
  }

  private prepare(input: SpikeNet2AnalysisInput): { tensorWindows: SpikeNet2Tensor[]; channels: SpikeNet2InputChannel[]; bipolarOnly: boolean } {
    if (!Array.isArray(input.channels) || input.channels.length === 0) {
      throw new SpikeNet2AdapterError("incompatible-input", "SpikeNet2 requires at least one EEG channel.");
    }
    const labels = new Set(input.channels.map((channel) => canonicalLabel(channel.label)));
    const required = this.manifest.electrodes.map(canonicalLabel);
    const missing = required.filter((label) => !labels.has(label));
    if (missing.length > 0) {
      throw new SpikeNet2AdapterError("incompatible-input", `Input is missing model electrodes: ${missing.join(", ")}.`);
    }
    const channels = this.manifest.electrodes.map((label) => {
      const channel = input.channels.find((candidate) => canonicalLabel(candidate.label) === canonicalLabel(label));
      if (!channel) throw new SpikeNet2AdapterError("incompatible-input", `Input is missing model electrode ${label}.`);
      if (!Number.isFinite(channel.sampleRate) || channel.sampleRate <= 0) {
        throw new SpikeNet2AdapterError("incompatible-input", `Invalid sample rate for channel ${channel.label}.`);
      }
      return {
        ...channel,
        samples: normalizeChannel(resample(channel.samples, channel.sampleRate, this.manifest.sampleRate)),
        sampleRate: this.manifest.sampleRate,
      };
    });
    const sampleCount = Math.min(...channels.map((channel) => channel.samples.length));
    const windowSamples = Math.max(1, Math.round(this.manifest.windowSeconds * this.manifest.sampleRate));
    const hopSamples = Math.max(1, Math.round(this.manifest.hopSeconds * this.manifest.sampleRate));
    const windows: SpikeNet2Tensor[] = [];
    if (sampleCount >= windowSamples) {
      for (let start = 0; start + windowSamples <= sampleCount; start += hopSamples) {
        const data = new Float32Array(channels.length * windowSamples);
        for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
          data.set(channels[channelIndex].samples.slice(start, start + windowSamples), channelIndex * windowSamples);
        }
        windows.push({
          data,
          channels: channels.length,
          samples: windowSamples,
          sampleRate: this.manifest.sampleRate,
          windowStartSeconds: (input.startSeconds ?? 0) + start / this.manifest.sampleRate,
        });
      }
    }
    const bipolarOnly = input.bipolarOnly === true || channels.every((channel) => channel.isBipolar === true || /(?:-|–|—|to)/i.test(channel.label));
    return { tensorWindows: windows, channels, bipolarOnly };
  }

  async analyze(input: SpikeNet2AnalysisInput): Promise<SpikeNet2AnalysisResult> {
    const runner = await this.runner();
    const prepared = this.prepare(input);
    const eventAccumulators: EventAccumulator[] = [];
    for (const tensor of prepared.tensorWindows) {
      const output = await runner.predict(tensor);
      const windows = extractWindows(output);
      const window = windows[0];
      if (!window) continue;
      const probabilities = validateProbabilities(window.probabilities, this.manifest.electrodes.length);
      const startSeconds = tensor.windowStartSeconds + (window.startSeconds ?? 0);
      const endSeconds = startSeconds + finitePositive(window.durationSeconds ?? 0, this.manifest.windowSeconds);
      const eventProbability = Math.max(...probabilities);
      if (eventProbability < 0.5) continue;
      const previous = eventAccumulators[eventAccumulators.length - 1];
      if (previous && startSeconds - previous.endSeconds <= SPIKENET2_WINDOW_CONTRACT.eventMergeGapSeconds) {
        previous.endSeconds = Math.max(previous.endSeconds, endSeconds);
        previous.probability = Math.max(previous.probability, eventProbability);
        previous.electrodeProbabilities = previous.electrodeProbabilities.map((value, index) => Math.max(value, probabilities[index]));
      } else {
        eventAccumulators.push({ startSeconds, endSeconds, probability: eventProbability, electrodeProbabilities: probabilities });
      }
    }
    const findings = eventAccumulators.map((event) => {
      const mapped = mapSpikeNet2ToDisplayedDerivations(
        this.manifest.electrodes,
        event.electrodeProbabilities,
        input.displayedDerivations,
        prepared.bipolarOnly,
      );
      const classification = distributions(this.manifest.electrodes, prepared.channels, event.electrodeProbabilities, prepared.bipolarOnly);
      return {
        kind: "interictal-epileptiform-discharge" as const,
        startSeconds: event.startSeconds,
        endSeconds: event.endSeconds,
        probability: event.probability,
        confidence: event.probability,
        electrodeProbabilities: Object.fromEntries(this.manifest.electrodes.map((label, index) => [label, event.electrodeProbabilities[index]])),
        distribution: classification.distribution,
        localization: classification.localization,
        displayedDerivations: mapped,
        provenance: this.provenance,
        limitations: SPIKENET2_LIMITATIONS,
      } satisfies SpikeNet2Finding;
    });
    return { findings, provenance: this.provenance, limitations: SPIKENET2_LIMITATIONS };
  }

  /** Alias used by generic abnormality adapter callers. */
  run(input: SpikeNet2AnalysisInput): Promise<SpikeNet2AnalysisResult> {
    return this.analyze(input);
  }
}

export function createSpikeNet2Adapter(options: SpikeNet2LocalModelOptions = {}): SpikeNet2Adapter {
  return new SpikeNet2Adapter(options);
}

/** Rich adapter-shaped entry point for callers that do not use the registry. */
export async function runSpikeNet2(
  input: SpikeNet2AnalysisInput,
  options: SpikeNet2LocalModelOptions = {},
): Promise<SpikeNet2AnalysisResult> {
  return createSpikeNet2Adapter(options).analyze(input);
}

export const spikenet2Adapter = {
  id: SPIKENET2_MODEL_ID,
  label: "SpikeNet2",
  windowSeconds: SPIKENET2_WINDOW_SECONDS,
  hopSeconds: SPIKENET2_HOP_SECONDS,
  run: runSpikeNet2,
  analyze: runSpikeNet2,
  limitations: SPIKENET2_LIMITATIONS,
} as const;

export type { SpikeNet2Backend, SpikeNet2Manifest } from "./spikenet2-manifest";
