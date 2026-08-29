import { percentileAbs } from "./preprocessing.ts";
import type { ChannelKind } from "./types.ts";

/**
 * Display-only normalization for auxiliary cardiac traces.
 *
 * The profile is calculated from the whole processed EKG track, so zooming or
 * changing EEG sensitivity cannot make the cardiac trace pump. It deliberately
 * does not alter the samples used by sonification or export.
 */
export interface EkgDisplayProfile {
  baselineUv: number;
  robustPeakUv: number;
  clipUv: number;
}

function finiteValues(samples: Float32Array): number[] {
  const values: number[] = [];
  const step = Math.max(1, Math.floor(samples.length / 12000));
  for (let i = 0; i < samples.length; i += step) {
    const value = samples[i]!;
    if (Number.isFinite(value)) values.push(value);
  }
  return values;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.5)] ?? 0;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))] ?? 0;
}

export function ekgDisplayProfile(samples: Float32Array): EkgDisplayProfile {
  const values = finiteValues(samples);
  if (values.length === 0) return { baselineUv: 0, robustPeakUv: 1, clipUv: 1.8 };
  const baselineUv = median(values);
  const centered = values.map((value) => Math.abs(value - baselineUv));
  const p90 = percentile(centered, 0.9);
  const p995 = percentile(centered, 0.995);
  const robustPeakUv = Math.max(
    1e-6,
    p995 * 1.12,
    p90 * 1.65,
    percentileAbs(Float32Array.from(centered), 0.75) * 4,
  );
  return {
    baselineUv,
    robustPeakUv,
    // Keep extreme artifacts inside the lane instead of letting one sample
    // determine the whole display scale. The robust margin preserves QRS shape.
    clipUv: robustPeakUv * 1.45,
  };
}

export function displayScaleForChannel(
  laneHeight: number,
  sensitivityUv: number,
  kind: ChannelKind,
  ekg: EkgDisplayProfile | null = null,
): number {
  if (kind === "ekg" && ekg) {
    return (Math.max(1, laneHeight) * 0.36) / Math.max(1e-6, ekg.robustPeakUv);
  }
  return (Math.max(1, laneHeight) * 0.92) / Math.max(10, sensitivityUv);
}

export function normalizeEkgValue(value: number, profile: EkgDisplayProfile): number {
  const centered = Number.isFinite(value) ? value - profile.baselineUv : 0;
  return Math.max(-profile.clipUv, Math.min(profile.clipUv, centered));
}

export function normalizeEkgWindow(
  min: Float32Array,
  max: Float32Array,
  mid: Float32Array | null,
  profile: EkgDisplayProfile,
): { min: Float32Array; max: Float32Array; mid: Float32Array | null } {
  const nextMin = new Float32Array(min.length);
  const nextMax = new Float32Array(max.length);
  for (let i = 0; i < min.length; i++) {
    nextMin[i] = normalizeEkgValue(min[i]!, profile);
    nextMax[i] = normalizeEkgValue(max[i]!, profile);
  }
  const nextMid = mid ? Float32Array.from(mid, (value) => normalizeEkgValue(value, profile)) : null;
  return { min: nextMin, max: nextMax, mid: nextMid };
}
