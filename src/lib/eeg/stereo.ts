import { lateralityPan } from "./channels.ts";
import type { Laterality } from "./types.ts";

/** Equal-power pan: -1 left, 0 center, +1 right. */
export function equalPowerGains(pan: number): { l: number; r: number } {
  const p = Math.min(1, Math.max(-1, pan));
  const theta = ((p + 1) * Math.PI) / 4;
  return { l: Math.cos(theta), r: Math.sin(theta) };
}

export function panForLaterality(lat: Laterality): number {
  return lateralityPan(lat);
}

export function mixToStereo(
  tracks: { samples: Float32Array; pan: number; gain: number }[],
  length: number,
): { left: Float32Array; right: Float32Array } {
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (const t of tracks) {
    const { l, r } = equalPowerGains(t.pan);
    const gL = l * t.gain;
    const gR = r * t.gain;
    const n = Math.min(length, t.samples.length);
    for (let i = 0; i < n; i++) {
      const s = t.samples[i]!;
      left[i]! += s * gL;
      right[i]! += s * gR;
    }
  }
  return { left, right };
}

export function averageChannels(tracks: Float32Array[]): Float32Array {
  if (tracks.length === 0) return new Float32Array(0);
  const n = Math.min(...tracks.map((t) => t.length));
  const out = new Float32Array(n);
  const inv = 1 / tracks.length;
  for (const t of tracks) {
    for (let i = 0; i < n; i++) out[i]! += t[i]! * inv;
  }
  return out;
}
