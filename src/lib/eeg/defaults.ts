import type { FilterSettings, MorphologyType, SonifySettings } from "./types.ts";

export const DEFAULT_FILTERS: FilterSettings = {
  bandpass: false,
  bandpassLow: 0.5,
  bandpassHigh: 70,
  lff: 0,
  hff: 0,
  notch60: false,
  removeDc: true,
};

export const DEFAULT_SONIFY: SonifySettings = {
  mode: "contour",
  compression: 50,
  carrierHz: 180,
  depth: 0.72,
  amTimeScale: 4,
  timeScale: 2,
  outputRate: 44100,
  hybridMix: 0.35,
  brightness: 0,
  percentile: 0.995,
  scale: "pentatonic",
  rootMidi: 50,
  rangeSemitones: 8,
  quantize: true,
  // Internal master safety gain. User-facing volume controls are intentionally
  // omitted so playback starts at a consistent, conservative level.
  volume: 0.88,
};

export const COMPRESSION_PRESETS = [20, 50, 100, 200] as const;
export const TIME_SCALE_PRESETS = [1, 2, 4] as const;
export const VIEW_PRESETS = [2, 5, 10, 15, 30, 60] as const;
export const PAGE_PRESETS = [10, 15, 30] as const;
export const DURATION_PRESETS = VIEW_PRESETS;
export const SENSITIVITY_PRESETS = [
  15, 20, 30, 50, 70, 100, 150, 200, 300, 500, 1000, 2000,
] as const;
export const MIN_SENSITIVITY_UV = 10;
export const MAX_SENSITIVITY_UV = 2000;
export const DEFAULT_SENSITIVITY_UV = 70;
/** Fraction of a channel lane filled by `sensitivityUv` peak-to-peak. */
export const LANE_FILL = 0.92;

export function clampSensitivity(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_SENSITIVITY_UV;
  return Math.min(MAX_SENSITIVITY_UV, Math.max(MIN_SENSITIVITY_UV, Math.round(n)));
}

/** dir −1 = more sensitive (bigger waves); +1 = less sensitive. */
export function stepSensitivity(current: number, dir: -1 | 1): number {
  const cur = clampSensitivity(current);
  if (dir < 0) {
    for (let i = SENSITIVITY_PRESETS.length - 1; i >= 0; i--) {
      if (SENSITIVITY_PRESETS[i]! < cur) return SENSITIVITY_PRESETS[i]!;
    }
    return SENSITIVITY_PRESETS[0]!;
  }
  for (const v of SENSITIVITY_PRESETS) {
    if (v > cur) return v;
  }
  return SENSITIVITY_PRESETS[SENSITIVITY_PRESETS.length - 1]!;
}

export function snapSensitivity(n: number): number {
  const c = clampSensitivity(n);
  let best: number = SENSITIVITY_PRESETS[0]!;
  let bestD = Math.abs(best - c);
  for (const p of SENSITIVITY_PRESETS) {
    const d = Math.abs(p - c);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

export function voltagePxPerUv(laneH: number, sensitivityUv: number): number {
  return (laneH * LANE_FILL) / Math.max(MIN_SENSITIVITY_UV, sensitivityUv);
}

export const LFF_PRESETS = [0, 0.5, 1, 1.6, 5] as const;
export const HFF_PRESETS = [0, 15, 35, 70, 100] as const;
export const ROOT_NOTES: { midi: number; label: string }[] = [
  { midi: 45, label: "A" },
  { midi: 47, label: "B" },
  { midi: 48, label: "C" },
  { midi: 50, label: "D" },
  { midi: 52, label: "E" },
  { midi: 53, label: "F" },
  { midi: 55, label: "G" },
];

export const ANNOTATION_TYPES: { id: MorphologyType; label: string }[] = [
  { id: "spike", label: "Spike" },
  { id: "sharp", label: "Sharp" },
  { id: "spike-wave", label: "Spike-and-wave" },
  { id: "polyspike", label: "Polyspike" },
  { id: "periodic", label: "Periodic (LPD/GPD)" },
  { id: "triphasic", label: "Triphasic" },
  { id: "slow", label: "Slow wave" },
  { id: "spindle", label: "Spindle" },
  { id: "alpha", label: "Alpha" },
  { id: "burst-suppression", label: "Burst-suppression" },
  { id: "blink", label: "Blink / lid" },
  { id: "qrs", label: "EKG" },
  { id: "muscle", label: "Muscle" },
  { id: "comment", label: "Comment" },
];

export const MORPH_COLOR: Record<MorphologyType, string> = {
  spike: "#e8a0a0",
  sharp: "#e0b070",
  slow: "#8bb8c8",
  "spike-wave": "#7ec8d9",
  polyspike: "#d98989",
  periodic: "#c4a0d9",
  "burst-suppression": "#9aa3ad",
  spindle: "#a0c4a8",
  alpha: "#7eaea0",
  triphasic: "#d4b06a",
  blink: "#c4b48a",
  qrs: "#e07a7a",
  muscle: "#b8a3d4",
  comment: "#c8ccd4",
};
