export const MIN_VIEW_SEC = 0.5;
export const DEFAULT_VIEW_SEC = 10;
export const FOLLOW_FRAC = 0.3;
export const VIEW_PRESETS = [2, 5, 10, 15, 30, 60] as const;

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function clampView(
  start: number,
  duration: number,
  total: number,
): { start: number; duration: number } {
  const tot = Math.max(0, total);
  const minD = Math.min(MIN_VIEW_SEC, tot || MIN_VIEW_SEC);
  const dur = clamp(duration, minD, Math.max(tot, minD));
  const maxStart = Math.max(0, tot - dur);
  return { start: clamp(start, 0, maxStart), duration: dur };
}

/** Zoom `duration` by `factor`, keeping `anchor` (eeg seconds) fixed in the window. */
export function zoomView(
  start: number,
  duration: number,
  total: number,
  factor: number,
  anchor: number,
): { start: number; duration: number } {
  const nextDur = duration * Math.max(1e-3, factor);
  const rel = duration > 1e-9 ? (anchor - start) / duration : FOLLOW_FRAC;
  const { duration: d } = clampView(0, nextDur, total);
  return clampView(anchor - clamp(rel, 0, 1) * d, d, total);
}

export function followViewStart(
  playhead: number,
  viewDur: number,
  total: number,
  frac = FOLLOW_FRAC,
): number {
  return clampView(playhead - viewDur * frac, viewDur, total).start;
}

export function timeAtFraction(frac: number, start: number, duration: number): number {
  return start + clamp(frac, 0, 1) * duration;
}

export function eegToAudio(eegT: number, eegDur: number, audioDur: number): number {
  if (eegDur <= 0) return 0;
  return (clamp(eegT, 0, eegDur) / eegDur) * audioDur;
}

export function audioToEeg(audioT: number, eegDur: number, audioDur: number): number {
  if (audioDur <= 0) return 0;
  return (clamp(audioT, 0, audioDur) / audioDur) * eegDur;
}

/** Min/max envelope of samples in [t0, t1) mapped onto `nPix` columns. */
export function envelopeWindow(
  samples: Float32Array,
  sampleRate: number,
  t0: number,
  t1: number,
  nPix: number,
): { min: Float32Array; max: Float32Array } {
  const min = new Float32Array(Math.max(0, nPix));
  const max = new Float32Array(Math.max(0, nPix));
  if (samples.length === 0 || nPix <= 0 || t1 <= t0 || sampleRate <= 0) return { min, max };
  const span = t1 - t0;
  for (let p = 0; p < nPix; p++) {
    const a = t0 + (p / nPix) * span;
    const b = t0 + ((p + 1) / nPix) * span;
    let i0 = Math.floor(a * sampleRate);
    let i1 = Math.floor(b * sampleRate);
    if (i1 <= i0) i1 = i0 + 1;
    i0 = Math.max(0, i0);
    i1 = Math.min(samples.length, i1);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = i0; i < i1; i++) {
      const v = samples[i]!;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min[p] = lo === Infinity ? 0 : lo;
    max[p] = hi === -Infinity ? 0 : hi;
  }
  return { min, max };
}
