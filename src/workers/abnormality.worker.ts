import { detectorRegistry } from "../lib/eeg/abnormality/analysis.ts";
import type { AbnormalityModelRegistry } from "../lib/eeg/abnormality/registry.ts";
import { runLocalModelBatch } from "../lib/eeg/abnormality/runtime.ts";
import type { AbnormalityWorkerRequest, AbnormalityWorkerResponse } from "../lib/eeg/abnormality/worker-protocol.ts";
import {
  ABNORMALITY_WORKER_PROTOCOL_VERSION,
  isAbnormalityWorkerRequest,
  serializeModelError,
} from "../lib/eeg/abnormality/worker-protocol.ts";

export interface AbnormalityWorkerScope {
  postMessage(message: AbnormalityWorkerResponse): void;
  addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
}

export const abnormalityWorkerRegistry = detectorRegistry;

/** Register a local deterministic screen or backend adapter before installing the handler. */
export const registerAbnormalityWorkerModel = abnormalityWorkerRegistry.register.bind(abnormalityWorkerRegistry);
export const registerAbnormalityWorkerDeterministicScreening = abnormalityWorkerRegistry.registerDeterministicScreening.bind(
  abnormalityWorkerRegistry,
);

export function installAbnormalityWorkerHandler(
  registry: AbnormalityModelRegistry = abnormalityWorkerRegistry,
  scope: AbnormalityWorkerScope = globalThis as unknown as AbnormalityWorkerScope,
): void {
  const controllers = new Map<string, AbortController>();
  scope.addEventListener("message", (event) => {
    const message = event.data;
    if (!isAbnormalityWorkerRequest(message)) return;
    if (message.type === "cancel") {
      controllers.get(message.requestId)?.abort();
      return;
    }
    void handleRun(message, registry, scope, controllers);
  });
}

async function handleRun(
  message: Extract<AbnormalityWorkerRequest, { type: "run" }>,
  registry: AbnormalityModelRegistry,
  scope: AbnormalityWorkerScope,
  controllers: Map<string, AbortController>,
): Promise<void> {
  controllers.get(message.requestId)?.abort();
  const controller = new AbortController();
  controllers.set(message.requestId, controller);
  try {
    const result = await runLocalModelBatch(registry, message.modelId, message.request, {
      signal: controller.signal,
      batchSize: message.batchSize,
      onProgress: (progress) => {
        scope.postMessage({
          protocol: ABNORMALITY_WORKER_PROTOCOL_VERSION,
          type: "progress",
          requestId: message.requestId,
          progress,
        });
      },
    });
    if (controller.signal.aborted) return;
    scope.postMessage({
      protocol: ABNORMALITY_WORKER_PROTOCOL_VERSION,
      type: "result",
      requestId: message.requestId,
      result,
    });
  } catch (error) {
    if (controller.signal.aborted) return;
    scope.postMessage({
      protocol: ABNORMALITY_WORKER_PROTOCOL_VERSION,
      type: "error",
      requestId: message.requestId,
      error: serializeModelError(error),
    });
  } finally {
    if (controllers.get(message.requestId) === controller) controllers.delete(message.requestId);
  }
}

const defaultScope = globalThis as unknown as Partial<AbnormalityWorkerScope>;
if (typeof defaultScope.addEventListener === "function" && typeof defaultScope.postMessage === "function") {
  installAbnormalityWorkerHandler(abnormalityWorkerRegistry, defaultScope as AbnormalityWorkerScope);
}
