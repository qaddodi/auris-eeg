import { LocalInferenceCache, createInferenceCacheKey } from "./cache.ts";
import { AbnormalityModelError } from "./registry.ts";
import type {
  AbnormalityInferenceBatchRequest,
  AbnormalityInferenceResult,
  ModelProgress,
} from "./types.ts";
import {
  deserializeModelError,
  type AbnormalityWorkerResponse,
  ABNORMALITY_WORKER_PROTOCOL_VERSION,
  type SerializedModelError,
} from "./worker-protocol.ts";

export interface WorkerLike {
  postMessage(message: unknown): void;
  addEventListener(type: "message" | "error", listener: EventListener): void;
  removeEventListener(type: "message" | "error", listener: EventListener): void;
  terminate(): void;
}

export interface WorkerRunOptions {
  signal?: AbortSignal;
  batchSize?: number;
  onProgress?: (progress: ModelProgress) => void;
  cache?: LocalInferenceCache;
  modelVersion?: string;
  preprocessingVersion?: string;
}

interface PendingRun {
  requestId: string;
  generation: number;
  resolve: (result: AbnormalityInferenceResult) => void;
  reject: (error: unknown) => void;
  onProgress?: (progress: ModelProgress) => void;
  abortListener?: () => void;
  cache?: LocalInferenceCache;
  cacheKey?: string;
}

const asEventListener = (listener: (event: MessageEvent<AbnormalityWorkerResponse>) => void): EventListener =>
  listener as unknown as EventListener;

let requestSequence = 0;
const createRequestId = (): string => `abnormality-${Date.now().toString(36)}-${(requestSequence += 1).toString(36)}`;

export class AbnormalityWorkerClient {
  private readonly pending = new Map<string, PendingRun>();
  private generation = 0;
  private activeRequestId: string | undefined;
  private readonly messageListener: EventListener;
  private readonly errorListener: EventListener;

  constructor(private readonly worker: WorkerLike) {
    this.messageListener = asEventListener((event) => this.handleMessage(event.data));
    this.errorListener = ((event: ErrorEvent) => this.handleWorkerError(event.error ?? event.message)) as EventListener;
    worker.addEventListener("message", this.messageListener);
    worker.addEventListener("error", this.errorListener);
  }

  static createDefault(): AbnormalityWorkerClient {
    const worker = new Worker(new URL("../../../workers/abnormality.worker.ts", import.meta.url), { type: "module" });
    return new AbnormalityWorkerClient(worker);
  }

  run(modelId: string, request: AbnormalityInferenceBatchRequest, options: WorkerRunOptions = {}): Promise<AbnormalityInferenceResult> {
    this.cancelActive(new AbnormalityModelError("model-stale", "A newer local inference run superseded this result", { modelId }));
    const requestId = createRequestId();
    const generation = ++this.generation;
    let cacheKey: string | undefined;
    if (options.cache && request.inputs.length === 1 && options.modelVersion && options.preprocessingVersion) {
      cacheKey = createInferenceCacheKey({
        recording: request.recording,
        modelId,
        modelVersion: options.modelVersion,
        preprocessingVersion: options.preprocessingVersion,
        interval: request.inputs[0].interval,
      });
      const cached = options.cache.get(cacheKey);
      if (cached) return Promise.resolve(cached);
    }
    return new Promise<AbnormalityInferenceResult>((resolve, reject) => {
      const pending: PendingRun = {
        requestId,
        generation,
        resolve,
        reject,
        onProgress: options.onProgress,
        cache: options.cache,
        cacheKey,
      };
      this.pending.set(requestId, pending);
      this.activeRequestId = requestId;
      if (options.signal) {
        const onAbort = () => this.cancel(requestId, new AbnormalityModelError("model-cancelled", "Worker inference was cancelled", { modelId }));
        pending.abortListener = onAbort;
        if (options.signal.aborted) {
          onAbort();
          return;
        }
        options.signal.addEventListener("abort", onAbort, { once: true });
      }
      this.worker.postMessage({
        protocol: ABNORMALITY_WORKER_PROTOCOL_VERSION,
        type: "run",
        requestId,
        modelId,
        request,
        batchSize: options.batchSize,
      });
    });
  }

  cancel(requestId = this.activeRequestId, error?: AbnormalityModelError): void {
    if (!requestId) return;
    const pending = this.pending.get(requestId);
    if (!pending) return;
    this.worker.postMessage({ protocol: ABNORMALITY_WORKER_PROTOCOL_VERSION, type: "cancel", requestId });
    this.pending.delete(requestId);
    if (this.activeRequestId === requestId) this.activeRequestId = undefined;
    pending.reject(error ?? new AbnormalityModelError("model-cancelled", "Worker inference was cancelled"));
  }

  dispose(): void {
    this.cancelActive(new AbnormalityModelError("model-cancelled", "Worker client was disposed"));
    this.worker.removeEventListener("message", this.messageListener);
    this.worker.removeEventListener("error", this.errorListener);
    this.worker.terminate();
  }

  private cancelActive(error: AbnormalityModelError): void {
    if (this.activeRequestId) this.cancel(this.activeRequestId, error);
  }

  private handleMessage(message: AbnormalityWorkerResponse): void {
    const pending = this.pending.get(message.requestId);
    if (!pending) return;
    if (message.type === "progress") {
      pending.onProgress?.(message.progress);
      return;
    }
    this.pending.delete(message.requestId);
    if (this.activeRequestId === message.requestId) this.activeRequestId = undefined;
    if (message.type === "error") {
      pending.reject(deserializeModelError(message.error));
      return;
    }
    if (pending.generation !== this.generation) {
      pending.reject(new AbnormalityModelError("model-stale", "A newer local inference run superseded this result"));
      return;
    }
    if (pending.cache && pending.cacheKey) pending.cache.set(pending.cacheKey, message.result);
    pending.resolve(message.result);
  }

  private handleWorkerError(error: unknown): void {
    const reason = new AbnormalityModelError("model-execution-failed", "The local inference worker failed", { details: error });
    for (const pending of this.pending.values()) pending.reject(reason);
    this.pending.clear();
    this.activeRequestId = undefined;
  }
}

export type { SerializedModelError };
