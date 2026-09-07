import { LocalInferenceCache, createInferenceCacheKey } from "./cache.ts";
import {
  AbnormalityModelError,
  AbnormalityModelRegistry,
  type ModelExecutionContext,
} from "./registry.ts";
import type {
  AbnormalityInferenceBatchRequest,
  AbnormalityInferenceRequest,
  AbnormalityInferenceResult,
  ModelProgress,
} from "./types.ts";
import {
  assertValidInferenceRequest,
  assertValidInferenceResult,
} from "./validation.ts";

export interface ModelRunOptions {
  signal?: AbortSignal;
  batchSize?: number;
  onProgress?: (progress: ModelProgress) => void;
}

const throwIfAborted = (signal: AbortSignal, modelId?: string): void => {
  if (signal.aborted) throw new AbnormalityModelError("model-cancelled", "Local model execution was cancelled", { modelId });
};

const progress = (options: ModelRunOptions, value: ModelProgress) => options.onProgress?.(value);

export async function runLocalModelBatch(
  registry: AbnormalityModelRegistry,
  modelId: string,
  request: AbnormalityInferenceBatchRequest,
  options: ModelRunOptions = {},
): Promise<AbnormalityInferenceResult> {
  assertValidInferenceRequest(request);
  const controller = new AbortController();
  const signal = options.signal ?? controller.signal;
  throwIfAborted(signal, modelId);
  const metadata = registry.metadata(modelId);
  progress(options, { completed: 0, total: request.inputs.length, phase: "loading" });
  const adapter = await registry.resolve(modelId, signal);
  const requestedBatchSize = options.batchSize ?? (metadata.capabilities.batching ? request.inputs.length : 1);
  const batchSize = Number.isInteger(requestedBatchSize) && requestedBatchSize > 0 ? requestedBatchSize : 1;
  const findings = [] as AbnormalityInferenceResult["findings"];
  const totalBatches = Math.ceil(request.inputs.length / batchSize);
  for (let offset = 0; offset < request.inputs.length; offset += batchSize) {
    throwIfAborted(signal, modelId);
    const batch = request.inputs.slice(offset, offset + batchSize);
    const context: ModelExecutionContext = {
      signal,
      batchIndex: Math.floor(offset / batchSize),
      batchCount: totalBatches,
      reportProgress: (value) => progress(options, value),
    };
    progress(options, {
      completed: offset,
      total: request.inputs.length,
      phase: "inference",
      message: `Running local model batch ${context.batchIndex + 1} of ${totalBatches}`,
    });
    let result: AbnormalityInferenceResult;
    try {
      result = await adapter.infer({ recording: request.recording, inputs: batch }, context);
    } catch (error) {
      if (error instanceof AbnormalityModelError) throw error;
      if (signal.aborted) throw new AbnormalityModelError("model-cancelled", "Local model execution was cancelled", { modelId });
      throw new AbnormalityModelError("model-execution-failed", `Local model '${modelId}' failed during inference`, {
        modelId,
        details: error,
      });
    }
    try {
      assertValidInferenceResult(result);
    } catch (error) {
      if (error instanceof AbnormalityModelError) throw error;
      throw new AbnormalityModelError("invalid-model-output", `Local model '${modelId}' returned invalid findings`, {
        modelId,
        details: error,
      });
    }
    findings.push(...result.findings);
    progress(options, { completed: Math.min(offset + batch.length, request.inputs.length), total: request.inputs.length, phase: "postprocessing" });
  }
  progress(options, { completed: request.inputs.length, total: request.inputs.length, phase: "complete" });
  return { findings };
}

export async function runLocalModel(
  registry: AbnormalityModelRegistry,
  modelId: string,
  request: AbnormalityInferenceRequest,
  options: ModelRunOptions = {},
): Promise<AbnormalityInferenceResult> {
  return runLocalModelBatch(registry, modelId, { recording: request.recording, inputs: [request.input] }, options);
}

export interface CachedLocalRunOptions extends ModelRunOptions {
  cache?: LocalInferenceCache;
  staleRunGuard?: StaleRunGuardLike;
}

export interface StaleRunGuardLike {
  begin: () => number;
  current: () => number;
}

export async function runCachedLocalModel(
  registry: AbnormalityModelRegistry,
  modelId: string,
  request: AbnormalityInferenceRequest,
  options: CachedLocalRunOptions = {},
): Promise<AbnormalityInferenceResult> {
  const cache = options.cache ?? new LocalInferenceCache();
  const metadata = registry.metadata(modelId);
  const key = createInferenceCacheKey({
    recording: request.recording,
    modelId: metadata.id,
    modelVersion: metadata.version,
    preprocessingVersion: metadata.preprocessingVersion,
    interval: request.input.interval,
  });
  const cached = cache.get(key);
  if (cached) return cached;
  const guard = options.staleRunGuard;
  const token = guard?.begin();
  const result = await runLocalModel(registry, modelId, request, options);
  if (guard && token !== guard.current()) {
    throw new AbnormalityModelError("model-stale", "A newer local inference run superseded this result", { modelId });
  }
  cache.set(key, result);
  return result;
}

export class StaleRunGuard {
  private generation = 0;

  begin(): number {
    this.generation += 1;
    return this.generation;
  }

  current(): number {
    return this.generation;
  }

  isCurrent(token: number): boolean {
    return token === this.generation;
  }
}

/** Local orchestration with in-memory findings cache and stale-result protection. */
export class LocalInferenceOrchestrator {
  private readonly cache: LocalInferenceCache;
  private readonly staleRunGuard = new StaleRunGuard();
  private activeController: AbortController | undefined;

  constructor(private readonly registry: AbnormalityModelRegistry, cache?: LocalInferenceCache) {
    this.cache = cache ?? new LocalInferenceCache();
  }

  async run(modelId: string, request: AbnormalityInferenceRequest, options: ModelRunOptions = {}): Promise<AbnormalityInferenceResult> {
    this.activeController?.abort();
    const controller = new AbortController();
    this.activeController = controller;
    const token = this.staleRunGuard.begin();
    const signal = options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal;
    const result = await runCachedLocalModel(this.registry, modelId, request, {
      ...options,
      signal,
      cache: this.cache,
      staleRunGuard: { begin: () => token, current: () => this.staleRunGuard.current() },
    });
    if (!this.staleRunGuard.isCurrent(token)) {
      throw new AbnormalityModelError("model-stale", "A newer local inference run superseded this result", { modelId });
    }
    return result;
  }

  cancel(): void {
    this.activeController?.abort();
    this.activeController = undefined;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
