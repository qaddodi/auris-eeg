import { clamp } from "./view.ts";

export const SCRUB_GRAIN_SECONDS = 0.11;
export const SCRUB_THROTTLE_MS = 28;

export function scrubPreviewTime(
  eegTime: number,
  velocity: number,
  progress: number,
  timeScale: number,
  duration: number,
): number {
  const direction = velocity < 0 ? -1 : 1;
  const span = clamp((Math.max(0.25, timeScale) * SCRUB_GRAIN_SECONDS) / 2, 0.08, 0.42);
  return clamp(eegTime + direction * clamp(progress, 0, 1) * span, 0, Math.max(0, duration));
}
