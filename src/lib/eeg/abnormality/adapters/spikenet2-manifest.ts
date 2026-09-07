/**
 * The public SpikeNet2 integration describes a model, it does not distribute
 * the model.  Checkpoints must be obtained by a user with the appropriate
 * credential and remain local to the browser/session.
 */

export const SPIKENET2_MODEL_ID = "spikenet2" as const;
export const SPIKENET2_MODEL_VERSION = "2" as const;

export const SPIKENET2_SUPPORTED_BACKENDS = [
  "onnx-webgpu",
  "onnx-wasm",
  "tensorflowjs",
  "custom-local",
] as const;

export type SpikeNet2Backend = (typeof SPIKENET2_SUPPORTED_BACKENDS)[number];

export interface SpikeNet2Manifest {
  modelId: typeof SPIKENET2_MODEL_ID;
  modelVersion: string;
  backend: string;
  task: "interictal-epileptiform-discharge";
  /** Model input rate, in samples per second. */
  sampleRate: number;
  /** Number of seconds represented by one model input window. */
  windowSeconds: number;
  /** Number of seconds between adjacent model windows. */
  hopSeconds: number;
  /** Canonical model electrode labels, in tensor channel order. */
  electrodes: readonly string[];
  /** Digest supplied by the credentialed model provider. */
  checkpointSha256: string;
  /** The checkpoint is intentionally not part of this repository. */
  checkpointUri?: string;
  license: "noncommercial";
  credentialedAccessRequired: true;
}

export const SPIKENET2_MANIFEST: SpikeNet2Manifest = {
  modelId: SPIKENET2_MODEL_ID,
  modelVersion: SPIKENET2_MODEL_VERSION,
  backend: "custom-local",
  task: "interictal-epileptiform-discharge",
  sampleRate: 256,
  windowSeconds: 2,
  hopSeconds: 0.5,
  // Canonical 10-20 order used by the credentialed model family. The actual
  // checkpoint remains user-supplied and is never bundled here.
  electrodes: [
    "FP1",
    "FP2",
    "F7",
    "F3",
    "FZ",
    "F4",
    "F8",
    "T3",
    "C3",
    "CZ",
    "C4",
    "T4",
    "T5",
    "P3",
    "PZ",
    "P4",
    "T6",
    "O1",
    "O2",
  ],
  // The authorized checkpoint's real digest must be supplied by the user.
  checkpointSha256: "",
  license: "noncommercial",
  credentialedAccessRequired: true,
};

export interface SpikeNet2ManifestValidation {
  valid: boolean;
  errors: string[];
  manifest?: SpikeNet2Manifest;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Validate an untrusted, user-supplied manifest before loading any bytes. */
export function validateSpikeNet2Manifest(value: unknown): SpikeNet2ManifestValidation {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { valid: false, errors: ["SpikeNet2 manifest must be an object."] };
  }

  if (value.modelId !== SPIKENET2_MODEL_ID) {
    errors.push(`Expected modelId ${SPIKENET2_MODEL_ID}.`);
  }
  if (typeof value.modelVersion !== "string" || value.modelVersion.length === 0) {
    errors.push("Manifest modelVersion is required.");
  }
  if (
    typeof value.backend !== "string" ||
    !(SPIKENET2_SUPPORTED_BACKENDS as readonly string[]).includes(value.backend)
  ) {
    errors.push(`Unsupported SpikeNet2 backend: ${String(value.backend)}.`);
  }
  if (value.task !== "interictal-epileptiform-discharge") {
    errors.push("Manifest task must be interictal-epileptiform-discharge.");
  }
  for (const [field, minimum] of [
    ["sampleRate", 1],
    ["windowSeconds", Number.EPSILON],
    ["hopSeconds", Number.EPSILON],
  ] as const) {
    if (typeof value[field] !== "number" || !Number.isFinite(value[field]) || value[field] < minimum) {
      errors.push(`Manifest ${field} must be a positive finite number.`);
    }
  }
  if (
    typeof value.windowSeconds === "number" &&
    typeof value.hopSeconds === "number" &&
    value.hopSeconds > value.windowSeconds
  ) {
    errors.push("Manifest hopSeconds cannot exceed windowSeconds.");
  }
  if (
    !Array.isArray(value.electrodes) ||
    value.electrodes.length === 0 ||
    value.electrodes.some((electrode) => typeof electrode !== "string" || electrode.trim().length === 0)
  ) {
    errors.push("Manifest electrodes must be a non-empty list of labels.");
  }
  if (typeof value.checkpointSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(value.checkpointSha256)) {
    errors.push("Manifest checkpointSha256 must be a SHA-256 hex digest.");
  }
  if (value.license !== "noncommercial") {
    errors.push("SpikeNet2 checkpoints are available only under the noncommercial license.");
  }
  if (value.credentialedAccessRequired !== true) {
    errors.push("Credentialed access is required for SpikeNet2 checkpoints.");
  }

  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    manifest: {
      modelId: SPIKENET2_MODEL_ID,
      modelVersion: value.modelVersion as string,
      backend: value.backend as string,
      task: "interictal-epileptiform-discharge",
      sampleRate: value.sampleRate as number,
      windowSeconds: value.windowSeconds as number,
      hopSeconds: value.hopSeconds as number,
      electrodes: [...(value.electrodes as string[])],
      checkpointSha256: value.checkpointSha256 as string,
      checkpointUri: typeof value.checkpointUri === "string" ? value.checkpointUri : undefined,
      license: "noncommercial",
      credentialedAccessRequired: true,
    },
  };
}
