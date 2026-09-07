import type { Laterality } from "../types.ts";

/** A half-open interval in seconds from the beginning of a recording. */
export interface TimeInterval {
  start: number;
  end: number;
}

export type AbnormalityType =
  | "spike"
  | "sharp-wave"
  | "periodic-discharge"
  | "rhythmic-pattern"
  | "seizure-like"
  | "artifact"
  | "other";

export type DetectorClassification =
  | "validated-model"
  | "experimental"
  | "deterministic-screening";

export type FindingReviewStatus =
  | "unreviewed"
  | "reviewed"
  | "confirmed"
  | "dismissed";

export interface RecordingIdentity {
  /** Stable caller-supplied identifier. Do not use a filename alone. */
  id: string;
  /** Optional content identity, for example a local file checksum. */
  checksum?: string;
  sizeBytes?: number;
  modifiedAt?: number;
}

export interface ElectrodeProbability {
  electrode: string;
  probability: number;
}

export interface CandidateElectrode {
  electrode: string;
  /** Optional rank/probability when the detector supplies one. */
  rank?: number;
  probability?: number;
}

export interface DisplayedDerivation {
  id: string;
  label: string;
  /** Canonical electrode labels used to make this displayed derivation. */
  electrodes: string[];
  laterality: Laterality;
  /** Optional detector contribution in the range [0, 1]. */
  contribution?: number;
}

export interface DistributionEntry {
  label: string;
  probability: number;
}

/** A detector's class distribution. Probabilities are expected to sum to one. */
export interface FindingDistribution {
  kind: "categorical";
  entries: DistributionEntry[];
}

export interface DetectorProvenance {
  /** Where the model or screening implementation came from. */
  kind: "builtin" | "user-supplied" | "imported-local";
  /** Human-readable provenance, such as a paper, repository, or local file. */
  description: string;
  /** Local-only artifact identity when one exists. */
  artifactId?: string;
  checksum?: string;
}

export interface DetectorMetadata {
  name: string;
  version: string;
  classification: DetectorClassification;
  preprocessingVersion: string;
  provenance: DetectorProvenance;
}

export interface UnifiedAbnormalityFinding {
  id: string;
  recording: RecordingIdentity;
  interval: TimeInterval;
  type: AbnormalityType | string;
  label: string;
  confidence: number;
  electrodeProbabilities: ElectrodeProbability[];
  candidateElectrodes: CandidateElectrode[];
  displayedDerivations: DisplayedDerivation[];
  distribution: FindingDistribution;
  /** Human-readable spatial extent, separate from the detector class distribution. */
  spatialDistribution: string;
  laterality: Laterality;
  /** Null when the configured detector does not estimate artifact probability. */
  artifactProbability: number | null;
  detector: DetectorMetadata;
  reviewStatus: FindingReviewStatus;
  limitations: string[];
  /** Auditable detector-owned features; never interpreted as clinical proof. */
  evidence?: {
    features: Array<Record<string, unknown>>;
    thresholds: Array<Record<string, unknown>>;
    polarity?: string;
    derivationEvidence?: string;
  };
}

/** Short aliases for consumers that refer to the UI contract as a finding. */
export type UnifiedFinding = UnifiedAbnormalityFinding;
export type Finding = UnifiedAbnormalityFinding;

export interface ModelSignalInput {
  electrode: string;
  samples: Float32Array;
  sampleRate: number;
}

export interface AbnormalityInferenceInput {
  interval: TimeInterval;
  signals: ModelSignalInput[];
}

export interface AbnormalityInferenceRequest {
  recording: RecordingIdentity;
  input: AbnormalityInferenceInput;
}

export interface AbnormalityInferenceBatchRequest {
  recording: RecordingIdentity;
  inputs: AbnormalityInferenceInput[];
}

export interface AbnormalityInferenceResult {
  findings: UnifiedAbnormalityFinding[];
}

export interface ModelProgress {
  completed: number;
  total: number;
  phase: "loading" | "preprocessing" | "inference" | "postprocessing" | "complete";
  message?: string;
}

export interface ModelCapabilities {
  batching: boolean;
  cancellation: boolean;
  backends: Array<"local-onnx" | "webgpu" | "wasm" | "sidecar" | "deterministic-screening">;
}

export interface AbnormalityModelMetadata extends DetectorMetadata {
  id: string;
  displayName: string;
  capabilities: ModelCapabilities;
}

export interface UserSuppliedLocalModelConfig {
  id: string;
  displayName: string;
  version: string;
  preprocessingVersion: string;
  classification: Exclude<DetectorClassification, "validated-model">;
  provenance: DetectorProvenance;
  /** The adapter factory is intentionally dependency/backend neutral. */
  load: (artifact?: ArrayBuffer | Blob | File) => Promise<unknown>;
  capabilities?: Partial<ModelCapabilities>;
  /** Optional local artifact; remote URLs are intentionally not accepted. */
  artifact?: ArrayBuffer | Blob | File;
}
