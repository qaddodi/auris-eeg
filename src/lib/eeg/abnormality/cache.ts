import type {
  AbnormalityInferenceResult,
  RecordingIdentity,
  TimeInterval,
} from "./types.ts";
import { assertValidInferenceResult } from "./validation.ts";

export interface InferenceCacheKeyInput {
  recording: RecordingIdentity;
  modelId: string;
  modelVersion: string;
  preprocessingVersion: string;
  interval: TimeInterval;
}

export type InferenceCacheKey = string;

const encode = (value: string | number | undefined): string => encodeURIComponent(String(value ?? ""));

/**
 * The cache key intentionally includes every identity that can change a finding.
 * It contains no EEG samples and is safe to keep in memory for the current tab.
 */
export function createInferenceCacheKey(input: InferenceCacheKeyInput): InferenceCacheKey {
  const recording = input.recording;
  return [
    "auris-abnormality-v1",
    encode(recording.id),
    encode(recording.checksum),
    encode(recording.sizeBytes),
    encode(recording.modifiedAt),
    encode(input.modelId),
    encode(input.modelVersion),
    encode(input.preprocessingVersion),
    encode(input.interval.start),
    encode(input.interval.end),
  ].join(":");
}

interface CacheEntry {
  result: AbnormalityInferenceResult;
  savedAt: number;
}

const copyResult = (result: AbnormalityInferenceResult): AbnormalityInferenceResult => ({
  findings: result.findings.map((finding) => ({
    ...finding,
    recording: { ...finding.recording },
    interval: { ...finding.interval },
    electrodeProbabilities: finding.electrodeProbabilities.map((entry) => ({ ...entry })),
    candidateElectrodes: finding.candidateElectrodes.map((entry) => ({ ...entry })),
    displayedDerivations: finding.displayedDerivations.map((entry) => ({ ...entry, electrodes: [...entry.electrodes] })),
    distribution: {
      ...finding.distribution,
      entries: finding.distribution.entries.map((entry) => ({ ...entry })),
    },
    detector: {
      ...finding.detector,
      provenance: { ...finding.detector.provenance },
    },
    limitations: [...finding.limitations],
    evidence: finding.evidence
      ? {
          ...finding.evidence,
          features: finding.evidence.features.map((entry) => ({ ...entry })),
          thresholds: finding.evidence.thresholds.map((entry) => ({ ...entry })),
        }
      : undefined,
  })),
});

export class LocalInferenceCache {
  private readonly entries = new Map<InferenceCacheKey, CacheEntry>();

  constructor(private readonly maxEntries = 128) {}

  get(key: InferenceCacheKey): AbnormalityInferenceResult | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    // Touch the entry to make eviction least-recently-used.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return copyResult(entry.result);
  }

  set(key: InferenceCacheKey, result: AbnormalityInferenceResult): void {
    assertValidInferenceResult(result);
    this.entries.delete(key);
    this.entries.set(key, { result: copyResult(result), savedAt: Date.now() });
    while (this.entries.size > Math.max(1, this.maxEntries)) {
      const oldest = this.entries.keys().next().value as InferenceCacheKey | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  has(key: InferenceCacheKey): boolean {
    return this.entries.has(key);
  }

  delete(key: InferenceCacheKey): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
