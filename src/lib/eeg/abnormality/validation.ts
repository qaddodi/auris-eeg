import type {
  AbnormalityInferenceBatchRequest,
  AbnormalityModelMetadata,
  AbnormalityInferenceResult,
  CandidateElectrode,
  DisplayedDerivation,
  DistributionEntry,
  ElectrodeProbability,
  FindingDistribution,
  UnifiedAbnormalityFinding,
} from "./types.ts";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export class AbnormalityValidationError extends Error {
  readonly code = "invalid-model-output" as const;
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = "AbnormalityValidationError";
    this.issues = issues;
  }
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isProbability = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= 0 && value <= 1;

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const add = (issues: ValidationIssue[], path: string, message: string) => {
  issues.push({ path, message });
};

const validateInterval = (interval: unknown, path: string, issues: ValidationIssue[]) => {
  if (!interval || typeof interval !== "object") {
    add(issues, path, "an interval is required");
    return;
  }
  const value = interval as { start?: unknown; end?: unknown };
  if (!isFiniteNumber(value.start) || value.start < 0) add(issues, `${path}.start`, "must be a finite number >= 0");
  if (!isFiniteNumber(value.end)) add(issues, `${path}.end`, "must be a finite number");
  if (isFiniteNumber(value.start) && isFiniteNumber(value.end) && value.end <= value.start) {
    add(issues, path, "end must be greater than start");
  }
};

const validateRecording = (recording: unknown, path: string, issues: ValidationIssue[]) => {
  if (!recording || typeof recording !== "object" || !nonEmpty((recording as { id?: unknown }).id)) {
    add(issues, `${path}.id`, "a stable recording id is required");
  }
};

const validateElectrodeProbabilities = (
  probabilities: unknown,
  path: string,
  issues: ValidationIssue[],
) => {
  if (!Array.isArray(probabilities)) {
    add(issues, path, "must be an array");
    return;
  }
  const seen = new Set<string>();
  probabilities.forEach((entry: ElectrodeProbability, index) => {
    const entryPath = `${path}[${index}]`;
    if (!nonEmpty(entry?.electrode)) add(issues, `${entryPath}.electrode`, "must be a non-empty label");
    if (!isProbability(entry?.probability)) add(issues, `${entryPath}.probability`, "must be in [0, 1]");
    if (nonEmpty(entry?.electrode)) {
      if (seen.has(entry.electrode)) add(issues, `${entryPath}.electrode`, "electrode labels must be unique");
      seen.add(entry.electrode);
    }
  });
};

const validateCandidates = (candidates: unknown, path: string, issues: ValidationIssue[]) => {
  if (!Array.isArray(candidates)) {
    add(issues, path, "must be an array");
    return;
  }
  const seen = new Set<string>();
  candidates.forEach((entry: CandidateElectrode, index) => {
    const entryPath = `${path}[${index}]`;
    if (!nonEmpty(entry?.electrode)) add(issues, `${entryPath}.electrode`, "must be a non-empty label");
    if (entry?.rank !== undefined && (!Number.isInteger(entry.rank) || entry.rank < 1)) {
      add(issues, `${entryPath}.rank`, "must be a positive integer");
    }
    if (entry?.probability !== undefined && !isProbability(entry.probability)) {
      add(issues, `${entryPath}.probability`, "must be in [0, 1]");
    }
    if (nonEmpty(entry?.electrode)) {
      if (seen.has(entry.electrode)) add(issues, `${entryPath}.electrode`, "electrode labels must be unique");
      seen.add(entry.electrode);
    }
  });
};

const validateDerivations = (derivations: unknown, path: string, issues: ValidationIssue[]) => {
  if (!Array.isArray(derivations)) {
    add(issues, path, "must be an array");
    return;
  }
  derivations.forEach((entry: DisplayedDerivation, index) => {
    const entryPath = `${path}[${index}]`;
    if (!nonEmpty(entry?.id)) add(issues, `${entryPath}.id`, "must be non-empty");
    if (!nonEmpty(entry?.label)) add(issues, `${entryPath}.label`, "must be non-empty");
    if (!Array.isArray(entry?.electrodes) || entry.electrodes.length === 0) {
      add(issues, `${entryPath}.electrodes`, "must contain at least one electrode");
    } else if (entry.electrodes.some((electrode) => !nonEmpty(electrode))) {
      add(issues, `${entryPath}.electrodes`, "must contain non-empty electrode labels");
    }
    if (!["left", "right", "midline", "unknown"].includes(entry?.laterality)) {
      add(issues, `${entryPath}.laterality`, "must be a supported laterality");
    }
    if (entry?.contribution !== undefined && !isProbability(entry.contribution)) {
      add(issues, `${entryPath}.contribution`, "must be in [0, 1]");
    }
  });
};

const validateDistribution = (distribution: unknown, path: string, issues: ValidationIssue[]) => {
  if (!distribution || typeof distribution !== "object" || (distribution as FindingDistribution).kind !== "categorical") {
    add(issues, path, "must be a categorical distribution");
    return;
  }
  const entries = (distribution as FindingDistribution).entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    add(issues, `${path}.entries`, "must contain at least one class");
    return;
  }
  const seen = new Set<string>();
  let sum = 0;
  entries.forEach((entry: DistributionEntry, index) => {
    const entryPath = `${path}.entries[${index}]`;
    if (!nonEmpty(entry?.label)) add(issues, `${entryPath}.label`, "must be non-empty");
    if (!isProbability(entry?.probability)) add(issues, `${entryPath}.probability`, "must be in [0, 1]");
    if (isProbability(entry?.probability)) sum += entry.probability;
    if (nonEmpty(entry?.label)) {
      if (seen.has(entry.label)) add(issues, `${entryPath}.label`, "class labels must be unique");
      seen.add(entry.label);
    }
  });
  if (Math.abs(sum - 1) > 0.01) add(issues, `${path}.entries`, "probabilities must sum to 1 (±0.01)");
};

const validateDetector = (detector: unknown, path: string, issues: ValidationIssue[]) => {
  if (!detector || typeof detector !== "object") {
    add(issues, path, "detector metadata is required");
    return;
  }
  const value = detector as AbnormalityModelMetadata;
  if (!nonEmpty(value.name)) add(issues, `${path}.name`, "must be non-empty");
  if (!nonEmpty(value.version)) add(issues, `${path}.version`, "must be non-empty");
  if (!nonEmpty(value.preprocessingVersion)) add(issues, `${path}.preprocessingVersion`, "must be non-empty");
  if (!["validated-model", "experimental", "deterministic-screening"].includes(value.classification)) {
    add(issues, `${path}.classification`, "must be a supported detector classification");
  }
  const provenance = value.provenance;
  if (!provenance || !["builtin", "user-supplied", "imported-local"].includes(provenance.kind)) {
    add(issues, `${path}.provenance.kind`, "must identify local provenance");
  }
  if (!provenance || !nonEmpty(provenance.description)) add(issues, `${path}.provenance.description`, "must be non-empty");
};

export function validateFinding(finding: UnifiedAbnormalityFinding): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!finding || typeof finding !== "object") {
    add(issues, "finding", "a finding is required");
    return { valid: false, issues };
  }
  if (!nonEmpty(finding.id)) add(issues, "id", "must be non-empty");
  validateRecording(finding.recording, "recording", issues);
  validateInterval(finding.interval, "interval", issues);
  if (!nonEmpty(finding.type)) add(issues, "type", "must be non-empty");
  if (!nonEmpty(finding.label)) add(issues, "label", "must be non-empty");
  if (!isProbability(finding.confidence)) add(issues, "confidence", "must be in [0, 1]");
  validateElectrodeProbabilities(finding.electrodeProbabilities, "electrodeProbabilities", issues);
  validateCandidates(finding.candidateElectrodes, "candidateElectrodes", issues);
  validateDerivations(finding.displayedDerivations, "displayedDerivations", issues);
  validateDistribution(finding.distribution, "distribution", issues);
  if (!nonEmpty(finding.spatialDistribution)) add(issues, "spatialDistribution", "must be non-empty");
  if (!["left", "right", "midline", "unknown"].includes(finding.laterality)) {
    add(issues, "laterality", "must be a supported laterality");
  }
  if (finding.artifactProbability !== null && !isProbability(finding.artifactProbability)) {
    add(issues, "artifactProbability", "must be null or in [0, 1]");
  }
  validateDetector(finding.detector, "detector", issues);
  if (!["unreviewed", "reviewed", "confirmed", "dismissed"].includes(finding.reviewStatus)) {
    add(issues, "reviewStatus", "must be a supported review status");
  }
  if (!Array.isArray(finding.limitations) || finding.limitations.some((item) => !nonEmpty(item))) {
    add(issues, "limitations", "must be an array of non-empty statements");
  }
  return { valid: issues.length === 0, issues };
}

export function validateInferenceResult(result: AbnormalityInferenceResult): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!result || !Array.isArray(result.findings)) {
    add(issues, "findings", "must be an array");
    return { valid: false, issues };
  }
  result.findings.forEach((finding, index) => {
    const validation = validateFinding(finding);
    validation.issues.forEach((issue) => add(issues, `findings[${index}].${issue.path}`, issue.message));
  });
  return { valid: issues.length === 0, issues };
}

export function assertValidInferenceResult(result: AbnormalityInferenceResult): void {
  const validation = validateInferenceResult(result);
  if (!validation.valid) throw new AbnormalityValidationError("The local model returned an invalid finding result", validation.issues);
}

export function validateInferenceRequest(request: AbnormalityInferenceBatchRequest): ValidationResult {
  const issues: ValidationIssue[] = [];
  validateRecording(request?.recording, "recording", issues);
  if (!Array.isArray(request?.inputs) || request.inputs.length === 0) {
    add(issues, "inputs", "at least one input window is required");
  } else {
    request.inputs.forEach((input, index) => {
      validateInterval(input?.interval, `inputs[${index}].interval`, issues);
      if (!Array.isArray(input?.signals) || input.signals.length === 0) {
        add(issues, `inputs[${index}].signals`, "at least one signal is required");
      } else {
        input.signals.forEach((signal, signalIndex) => {
          const path = `inputs[${index}].signals[${signalIndex}]`;
          if (!nonEmpty(signal?.electrode)) add(issues, `${path}.electrode`, "must be non-empty");
          if (!isFiniteNumber(signal?.sampleRate) || signal.sampleRate <= 0) add(issues, `${path}.sampleRate`, "must be > 0");
          if (!(signal?.samples instanceof Float32Array)) add(issues, `${path}.samples`, "must be a Float32Array");
        });
      }
    });
  }
  return { valid: issues.length === 0, issues };
}

export function assertValidInferenceRequest(request: AbnormalityInferenceBatchRequest): void {
  const validation = validateInferenceRequest(request);
  if (!validation.valid) throw new AbnormalityValidationError("Invalid local model input", validation.issues);
}
