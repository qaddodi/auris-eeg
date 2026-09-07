import { AbnormalityModelError, type ModelErrorCode } from "./registry.ts";
import type {
  AbnormalityInferenceBatchRequest,
  AbnormalityInferenceResult,
  ModelProgress,
} from "./types.ts";
import { AbnormalityValidationError } from "./validation.ts";

export const ABNORMALITY_WORKER_PROTOCOL_VERSION = 1 as const;

export interface AbnormalityWorkerRunMessage {
  protocol: typeof ABNORMALITY_WORKER_PROTOCOL_VERSION;
  type: "run";
  requestId: string;
  modelId: string;
  request: AbnormalityInferenceBatchRequest;
  batchSize?: number;
}

export interface AbnormalityWorkerCancelMessage {
  protocol: typeof ABNORMALITY_WORKER_PROTOCOL_VERSION;
  type: "cancel";
  requestId: string;
}

export type AbnormalityWorkerRequest = AbnormalityWorkerRunMessage | AbnormalityWorkerCancelMessage;

export interface AbnormalityWorkerProgressMessage {
  protocol: typeof ABNORMALITY_WORKER_PROTOCOL_VERSION;
  type: "progress";
  requestId: string;
  progress: ModelProgress;
}

export interface AbnormalityWorkerResultMessage {
  protocol: typeof ABNORMALITY_WORKER_PROTOCOL_VERSION;
  type: "result";
  requestId: string;
  result: AbnormalityInferenceResult;
}

export interface SerializedModelError {
  name: string;
  code: ModelErrorCode | "invalid-model-output" | "worker-protocol-error";
  message: string;
  modelId?: string;
  details?: unknown;
}

export interface AbnormalityWorkerErrorMessage {
  protocol: typeof ABNORMALITY_WORKER_PROTOCOL_VERSION;
  type: "error";
  requestId: string;
  error: SerializedModelError;
}

export type AbnormalityWorkerResponse =
  | AbnormalityWorkerProgressMessage
  | AbnormalityWorkerResultMessage
  | AbnormalityWorkerErrorMessage;

export function serializeModelError(error: unknown): SerializedModelError {
  if (error instanceof AbnormalityModelError) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      modelId: error.modelId,
      details: error.details,
    };
  }
  if (error instanceof AbnormalityValidationError) {
    return { name: error.name, code: "invalid-model-output", message: error.message, details: error.issues };
  }
  if (error instanceof Error) return { name: error.name, code: "model-execution-failed", message: error.message };
  return { name: "Error", code: "model-execution-failed", message: String(error) };
}

export function deserializeModelError(error: SerializedModelError): AbnormalityModelError {
  const code: ModelErrorCode = error.code === "invalid-model-output"
    ? "invalid-model-output"
    : error.code === "worker-protocol-error"
      ? "model-execution-failed"
      : error.code;
  return new AbnormalityModelError(code, error.message, {
    modelId: error.modelId,
    details: error.details,
  });
}

export function isAbnormalityWorkerRequest(value: unknown): value is AbnormalityWorkerRequest {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<AbnormalityWorkerRequest>;
  return message.protocol === ABNORMALITY_WORKER_PROTOCOL_VERSION &&
    (message.type === "run" || message.type === "cancel") &&
    typeof message.requestId === "string";
}
