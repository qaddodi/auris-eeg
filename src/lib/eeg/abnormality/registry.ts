import type {
  AbnormalityInferenceBatchRequest,
  AbnormalityInferenceResult,
  AbnormalityModelMetadata,
  ModelProgress,
  UserSuppliedLocalModelConfig,
} from "./types.ts";

export type ModelErrorCode =
  | "model-not-installed"
  | "model-load-failed"
  | "model-execution-failed"
  | "model-cancelled"
  | "model-stale"
  | "invalid-model-output"
  | "unsupported-model";

export class AbnormalityModelError extends Error {
  readonly code: ModelErrorCode;
  readonly modelId?: string;
  readonly details?: unknown;

  constructor(code: ModelErrorCode, message: string, options?: { modelId?: string; details?: unknown }) {
    super(message);
    this.name = "AbnormalityModelError";
    this.code = code;
    this.modelId = options?.modelId;
    this.details = options?.details;
  }
}

export interface ModelExecutionContext {
  signal: AbortSignal;
  batchIndex: number;
  batchCount: number;
  reportProgress: (progress: ModelProgress) => void;
}

export interface AbnormalityModelAdapter {
  readonly metadata: AbnormalityModelMetadata;
  /** Optional one-time lazy initialization for a local artifact/backend. */
  load?: (signal: AbortSignal) => Promise<void>;
  infer: (
    request: AbnormalityInferenceBatchRequest,
    context: ModelExecutionContext,
  ) => Promise<AbnormalityInferenceResult>;
  dispose?: () => Promise<void> | void;
}

export interface LazyModelRegistration {
  metadata: AbnormalityModelMetadata;
  load: () => Promise<AbnormalityModelAdapter>;
}

export interface DeterministicScreeningRegistration {
  metadata: Omit<AbnormalityModelMetadata, "classification"> & {
    classification: "deterministic-screening";
  };
  infer: AbnormalityModelAdapter["infer"];
}

const DEFAULT_CAPABILITIES: AbnormalityModelMetadata["capabilities"] = {
  batching: false,
  cancellation: true,
  backends: [],
};

const isAdapter = (value: unknown): value is AbnormalityModelAdapter => {
  if (!value || typeof value !== "object") return false;
  const adapter = value as Partial<AbnormalityModelAdapter>;
  return Boolean(adapter.metadata && typeof adapter.infer === "function");
};

export class AbnormalityModelRegistry {
  private readonly entries = new Map<string, LazyModelRegistration>();
  private readonly loaded = new Map<string, AbnormalityModelAdapter>();

  register(adapter: AbnormalityModelAdapter): void {
    if (!isAdapter(adapter)) throw new TypeError("A model adapter with metadata and infer() is required");
    this.registerLazy({ metadata: adapter.metadata, load: async () => adapter });
  }

  registerLazy(registration: LazyModelRegistration): void {
    if (!registration.metadata.id.trim()) throw new TypeError("A model id is required");
    if (this.entries.has(registration.metadata.id)) {
      throw new AbnormalityModelError("unsupported-model", `Model '${registration.metadata.id}' is already registered`, {
        modelId: registration.metadata.id,
      });
    }
    this.entries.set(registration.metadata.id, registration);
  }

  /** Register a local user model without adding a network or server dependency. */
  registerUserSuppliedLocalModel(config: UserSuppliedLocalModelConfig): void {
    const metadata: AbnormalityModelMetadata = {
      id: config.id,
      displayName: config.displayName,
      name: config.displayName,
      version: config.version,
      preprocessingVersion: config.preprocessingVersion,
      classification: config.classification,
      provenance: config.provenance,
      capabilities: {
        ...DEFAULT_CAPABILITIES,
        ...config.capabilities,
      },
    };
    this.registerLazy({
      metadata,
      load: async () => {
        const adapter = await config.load(config.artifact);
        if (!isAdapter(adapter)) {
          throw new AbnormalityModelError("model-load-failed", `Local model '${config.id}' did not provide a valid adapter`, {
            modelId: config.id,
          });
        }
        return adapter;
      },
    });
  }

  /** Alias used by import flows; the artifact remains local to the caller. */
  importLocalModel(config: UserSuppliedLocalModelConfig): void {
    this.registerUserSuppliedLocalModel(config);
  }

  registerDeterministicScreening(registration: DeterministicScreeningRegistration): void {
    this.register({
      metadata: registration.metadata,
      infer: registration.infer,
    });
  }

  has(modelId: string): boolean {
    return this.entries.has(modelId);
  }

  metadata(modelId: string): AbnormalityModelMetadata {
    const entry = this.entries.get(modelId);
    if (!entry) throw new AbnormalityModelError("model-not-installed", `Model '${modelId}' is not installed`, { modelId });
    return entry.metadata;
  }

  list(): AbnormalityModelMetadata[] {
    return [...this.entries.values()].map((entry) => entry.metadata);
  }

  async resolve(modelId: string, signal: AbortSignal): Promise<AbnormalityModelAdapter> {
    const cached = this.loaded.get(modelId);
    if (cached) return cached;
    const entry = this.entries.get(modelId);
    if (!entry) throw new AbnormalityModelError("model-not-installed", `Model '${modelId}' is not installed`, { modelId });
    if (signal.aborted) throw new AbnormalityModelError("model-cancelled", "Model loading was cancelled", { modelId });
    let adapter: AbnormalityModelAdapter;
    try {
      adapter = await entry.load();
    } catch (error) {
      if (error instanceof AbnormalityModelError) throw error;
      throw new AbnormalityModelError("model-load-failed", `Unable to load local model '${modelId}'`, {
        modelId,
        details: error,
      });
    }
    if (!isAdapter(adapter)) {
      throw new AbnormalityModelError("model-load-failed", `Local model '${modelId}' did not provide a valid adapter`, {
        modelId,
      });
    }
    if (adapter.metadata.id !== entry.metadata.id || adapter.metadata.version !== entry.metadata.version) {
      throw new AbnormalityModelError("unsupported-model", `Loaded model '${modelId}' metadata does not match its registration`, {
        modelId,
      });
    }
    if (adapter.load) {
      try {
        await adapter.load(signal);
      } catch (error) {
        if (error instanceof AbnormalityModelError) throw error;
        throw new AbnormalityModelError("model-load-failed", `Unable to initialize local model '${modelId}'`, {
          modelId,
          details: error,
        });
      }
    }
    this.loaded.set(modelId, adapter);
    return adapter;
  }

  async unregister(modelId: string): Promise<boolean> {
    const adapter = this.loaded.get(modelId);
    this.loaded.delete(modelId);
    const removed = this.entries.delete(modelId);
    if (adapter?.dispose) await adapter.dispose();
    return removed;
  }

  async dispose(): Promise<void> {
    const adapters = [...this.loaded.values()];
    this.loaded.clear();
    this.entries.clear();
    await Promise.all(adapters.map((adapter) => adapter.dispose?.()));
  }
}
