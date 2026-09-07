import { classifyLaterality } from "../channels.ts";
import { LocalInferenceCache, createInferenceCacheKey } from "./cache.ts";
import {
  AbnormalityModelError,
  AbnormalityModelRegistry,
  type AbnormalityModelAdapter,
} from "./registry.ts";
import {
  DETERMINISTIC_SCREENING_VERSION,
  SCREENING_PREPROCESSING_VERSION,
  runDeterministicScreening,
  type DeterministicScreeningResult,
  type ScreeningFinding,
} from "./screening.ts";
import type {
  AbnormalityInferenceRequest,
  AbnormalityInferenceResult,
  AbnormalityModelMetadata,
  ModelProgress,
  RecordingIdentity,
  UnifiedAbnormalityFinding,
} from "./types.ts";

export const DETERMINISTIC_SCREENING_METADATA: AbnormalityModelMetadata = {
  id: "deterministic-screening",
  displayName: "Deterministic signal screen",
  name: "Auris deterministic signal screen",
  version: DETERMINISTIC_SCREENING_VERSION,
  preprocessingVersion: SCREENING_PREPROCESSING_VERSION,
  classification: "deterministic-screening",
  provenance: {
    kind: "builtin",
    description: "Auditable local signal measurements and thresholds; not clinically validated.",
  },
  capabilities: {
    batching: false,
    cancellation: true,
    backends: ["deterministic-screening"],
  },
};

export const UNINSTALLED_MODEL_METADATA: readonly AbnormalityModelMetadata[] = [
  {
    id: "spikenet2",
    displayName: "SpikeNet2 (model not installed)",
    name: "SpikeNet2",
    version: "user-supplied",
    preprocessingVersion: "declared-by-imported-manifest",
    classification: "experimental",
    provenance: {
      kind: "user-supplied",
      description: "Requires a credentialed, authorized local checkpoint; no weights are bundled or downloaded.",
    },
    capabilities: { batching: false, cancellation: true, backends: ["webgpu", "wasm"] },
  },
  {
    id: "sparcnet",
    displayName: "SPaRCNet (model not installed)",
    name: "SPaRCNet",
    version: "user-supplied",
    preprocessingVersion: "declared-by-imported-manifest",
    classification: "experimental",
    provenance: {
      kind: "user-supplied",
      description: "Requires a compatible authorized local model; no weights are bundled or downloaded.",
    },
    capabilities: { batching: false, cancellation: true, backends: ["webgpu", "wasm"] },
  },
];

function intervalForFinding(
  result: DeterministicScreeningResult,
  finding: ScreeningFinding,
): { start: number; end: number } {
  const ids = new Set(finding.channelIds);
  const windows = result.measurements
    .filter((measurement) => ids.has(measurement.provenance.channelId))
    .flatMap((measurement) => measurement.windows)
    .filter((window) => finding.contextWindowSeconds == null || window.contextWindowSeconds === finding.contextWindowSeconds);
  if (!windows.length) return { start: 0, end: Math.max(0.001, finding.contextWindowSeconds ?? 0.001) };
  const score = (window: (typeof windows)[number]): number => {
    switch (finding.detector) {
      case "focal-slowing":
      case "generalized-slowing":
        return window.relativeBandPower.delta + window.relativeBandPower.theta;
      case "hemispheric-asymmetry":
        return window.peakToPeak;
      case "suppression-attenuation":
        return -window.rms;
      case "flat-disconnected-electrode":
        return window.flatlineRatio + (1 - window.continuity);
      case "movement-artifact":
        return window.movementScore;
      case "eye-movement-contamination":
        return window.eyeMovementScore;
      case "muscle-contamination":
        return window.muscleScore;
      case "line-noise":
        return window.lineNoiseRatio;
      case "clipping-saturation":
        return window.clippingRatio;
    }
  };
  const selected = [...windows].sort((left, right) => score(right) - score(left))[0]!;
  return { start: selected.startSeconds, end: selected.endSeconds };
}

function findingLaterality(finding: ScreeningFinding): UnifiedAbnormalityFinding["laterality"] {
  const sides = new Set(finding.channelLabels.map(classifyLaterality));
  if (sides.size === 1) return [...sides][0] ?? "unknown";
  if (sides.has("left") && sides.has("right")) return "unknown";
  return sides.has("midline") ? "midline" : "unknown";
}

function projectScreeningFinding(
  result: DeterministicScreeningResult,
  finding: ScreeningFinding,
  recording: RecordingIdentity,
): UnifiedAbnormalityFinding {
  const interval = intervalForFinding(result, finding);
  const probability = Math.max(0, Math.min(1, finding.confidence));
  const electrodes = [...new Set(finding.channelLabels)];
  return {
    id: `${recording.id}:${finding.id}`,
    recording,
    interval,
    type: finding.detector,
    label: finding.title,
    confidence: probability,
    electrodeProbabilities: electrodes.map((electrode) => ({ electrode, probability })),
    candidateElectrodes: electrodes.map((electrode, index) => ({
      electrode,
      rank: index + 1,
      probability,
    })),
    displayedDerivations: [],
    distribution: { kind: "categorical", entries: [{ label: finding.detector, probability: 1 }] },
    spatialDistribution: finding.detector === "generalized-slowing"
      ? "generalized"
      : finding.channelLabels.length === 1
        ? `channel-local: ${finding.channelLabels[0]}`
        : `regional candidates: ${finding.channelLabels.join(", ")}`,
    laterality: findingLaterality(finding),
    artifactProbability: finding.artifactProbability,
    detector: DETERMINISTIC_SCREENING_METADATA,
    reviewStatus: "unreviewed",
    limitations: [
      finding.summary,
      "The reported interval is the detector context window with the strongest supporting bounded feature; it is not a precise physiologic onset boundary.",
      ...finding.limitations,
    ],
    evidence: {
      features: finding.featureEvidence.map((entry) => ({ ...entry })),
      thresholds: finding.thresholds.map((entry) => ({ ...entry })),
      polarity: finding.polarity,
      derivationEvidence: finding.derivationEvidence,
    },
  };
}

const deterministicAdapter: AbnormalityModelAdapter = {
  metadata: DETERMINISTIC_SCREENING_METADATA,
  async infer(request, context) {
    const findings: UnifiedAbnormalityFinding[] = [];
    for (let index = 0; index < request.inputs.length; index += 1) {
      if (context.signal.aborted) {
        throw new AbnormalityModelError("model-cancelled", "Deterministic screening was cancelled.", {
          modelId: DETERMINISTIC_SCREENING_METADATA.id,
        });
      }
      const input = request.inputs[index]!;
      const result = await runDeterministicScreening(
        {
          recordingId: request.recording.id,
          startTimeSeconds: input.interval.start,
          durationSeconds: input.interval.end - input.interval.start,
          channels: input.signals.map((signal) => ({
            id: signal.electrode,
            label: signal.electrode,
            canonical: signal.electrode,
            samples: signal.samples,
            sampleRate: signal.sampleRate,
            kind: "eeg",
            isEeg: true,
            laterality: classifyLaterality(signal.electrode),
            sources: [signal.electrode],
            unit: "µV",
          })),
        },
        {
          signal: context.signal,
          onProgress: (progress) => context.reportProgress({
            completed: index + progress.fraction,
            total: request.inputs.length,
            phase: progress.phase === "complete" ? "postprocessing" : "inference",
            message: `Deterministic screening ${Math.round(progress.fraction * 100)}%`,
          }),
        },
      );
      if (result.status === "cancelled") {
        throw new AbnormalityModelError("model-cancelled", "Deterministic screening was cancelled.", {
          modelId: DETERMINISTIC_SCREENING_METADATA.id,
        });
      }
      findings.push(...result.findings.map((finding) => projectScreeningFinding(result, finding, request.recording)));
    }
    return { findings };
  },
};

export const detectorRegistry = new AbnormalityModelRegistry();
detectorRegistry.register(deterministicAdapter);
const inferenceCache = new LocalInferenceCache(32);

export function registerLocalDetector(adapter: AbnormalityModelAdapter): void {
  detectorRegistry.register(adapter);
}

export function listDetectors(): AbnormalityModelMetadata[] {
  const installed = detectorRegistry.list();
  const installedIds = new Set(installed.map((model) => model.id));
  return [...installed, ...UNINSTALLED_MODEL_METADATA.filter((model) => !installedIds.has(model.id))];
}

export interface RunAbnormalityAnalysisRequest extends AbnormalityInferenceRequest {
  enabledDetectorIds: string[];
  signal?: AbortSignal;
  onProgress?: (progress: ModelProgress) => void;
}

export async function runAbnormalityAnalysis(
  request: RunAbnormalityAnalysisRequest,
): Promise<AbnormalityInferenceResult> {
  const ids = [...new Set(request.enabledDetectorIds)];
  if (!ids.length) throw new AbnormalityModelError("unsupported-model", "Select at least one local detector.");
  for (const id of ids) {
    if (!detectorRegistry.has(id)) {
      throw new AbnormalityModelError(
        "model-not-installed",
        `${id === "spikenet2" ? "SpikeNet2" : id === "sparcnet" ? "SPaRCNet" : id} is not installed. Import an authorized compatible model and manifest locally; no weights are bundled or downloaded.`,
        { modelId: id },
      );
    }
  }
  const findings: UnifiedAbnormalityFinding[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index]!;
    const metadata = detectorRegistry.metadata(id);
    const key = createInferenceCacheKey({
      recording: request.recording,
      modelId: id,
      modelVersion: metadata.version,
      preprocessingVersion: metadata.preprocessingVersion,
      interval: request.input.interval,
    });
    const cached = inferenceCache.get(key);
    if (cached) {
      findings.push(...cached.findings);
      request.onProgress?.({ completed: index + 1, total: ids.length, phase: "complete", message: `${metadata.displayName} loaded from local cache.` });
      continue;
    }
    const controller = new AbortController();
    const signal = request.signal ? AbortSignal.any([request.signal, controller.signal]) : controller.signal;
    const adapter = await detectorRegistry.resolve(id, signal);
    const result = await adapter.infer(
      { recording: request.recording, inputs: [request.input] },
      {
        signal,
        batchIndex: 0,
        batchCount: 1,
        reportProgress: (progress) => request.onProgress?.({
          ...progress,
          completed: index + progress.completed / Math.max(1, progress.total),
          total: ids.length,
        }),
      },
    );
    inferenceCache.set(key, result);
    findings.push(...result.findings);
  }
  return { findings };
}
