import type { FilterSettings } from "./types.ts";

export function subtractMean(x: Float32Array): Float32Array {
  if (x.length === 0) return x;
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i]!;
  const mean = sum / x.length;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i]! - mean;
  return out;
}

/** Direct-form II transposed biquad. coefs: [b0,b1,b2,a1,a2] (a0=1). */
function biquad(x: Float32Array, c: number[]): Float32Array {
  const [b0, b1, b2, a1, a2] = c as [number, number, number, number, number];
  const y = new Float32Array(x.length);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xn = x[i]!;
    const yn = b0 * xn + z1;
    z1 = b1 * xn - a1 * yn + z2;
    z2 = b2 * xn - a2 * yn;
    y[i] = yn;
  }
  return y;
}

function reverse(x: Float32Array): Float32Array {
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[x.length - 1 - i]!;
  return y;
}

function filtfilt(x: Float32Array, c: number[]): Float32Array {
  return reverse(biquad(reverse(biquad(x, c)), c));
}

function rbjLowpass(fs: number, f0: number, q = Math.SQRT1_2): number[] {
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * q);
  const cos = Math.cos(w0);
  const b0 = (1 - cos) / 2;
  const b1 = 1 - cos;
  const b2 = (1 - cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

function rbjHighpass(fs: number, f0: number, q = Math.SQRT1_2): number[] {
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * q);
  const cos = Math.cos(w0);
  const b0 = (1 + cos) / 2;
  const b1 = -(1 + cos);
  const b2 = (1 + cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

function rbjNotch(fs: number, f0: number, q = 30): number[] {
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * q);
  const cos = Math.cos(w0);
  const b0 = 1;
  const b1 = -2 * cos;
  const b2 = 1;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

export function bandpassRange(x: Float32Array, fs: number, lo: number, hi: number): Float32Array {
  if (x.length < 8) return new Float32Array(x);
  const nyquist = fs / 2 - 1;
  const l = Math.max(0.05, Math.min(lo, nyquist * 0.8));
  const h = Math.max(l + 0.2, Math.min(hi, nyquist));
  return filtfilt(filtfilt(x, rbjHighpass(fs, l)), rbjLowpass(fs, h));
}

/** Single-pass bandpass for sonify (phase not clinically meaningful in audio). */
export function bandpassForward(x: Float32Array, fs: number, lo: number, hi: number): Float32Array {
  if (x.length < 8) return new Float32Array(x);
  const nyquist = fs / 2 - 1;
  const l = Math.max(0.05, Math.min(lo, nyquist * 0.8));
  const h = Math.max(l + 0.2, Math.min(hi, nyquist));
  return biquad(biquad(x, rbjHighpass(fs, l)), rbjLowpass(fs, h));
}

/** One-pole rectifier envelope. `envHz` is the follow rate (higher = faster). */
export function envelopeFollow(x: Float32Array, fs: number, envHz: number): Float32Array {
  const y = new Float32Array(x.length);
  const a = Math.exp((-2 * Math.PI * Math.max(0.1, envHz)) / Math.max(1, fs));
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    const v = Math.abs(x[i]!);
    s = a * s + (1 - a) * v;
    y[i] = s;
  }
  return y;
}

export function applyFilters(x: Float32Array, fs: number, settings: FilterSettings): Float32Array {
  let y = settings.removeDc ? subtractMean(x) : new Float32Array(x);
  if (y.length < 8) return y;
  const nyquist = fs / 2 - 1;
  const lo =
    settings.lff > 0 ? settings.lff : settings.bandpass ? settings.bandpassLow : 0;
  const hi =
    settings.hff > 0 ? settings.hff : settings.bandpass ? settings.bandpassHigh : 0;
  if (lo > 0) {
    const f = Math.max(0.01, Math.min(lo, nyquist * 0.8));
    y = filtfilt(y, rbjHighpass(fs, f));
  }
  if (hi > 0) {
    const f = Math.max((lo || 0.1) + 1, Math.min(hi, nyquist));
    y = filtfilt(y, rbjLowpass(fs, f));
  }
  if (settings.notch60 && fs > 130) {
    y = filtfilt(y, rbjNotch(fs, 60));
  }
  return y;
}

export function percentileAbs(x: Float32Array, p: number): number {
  if (x.length === 0) return 1;
  const abs = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) abs[i] = Math.abs(x[i]!);
  abs.sort();
  const idx = Math.min(abs.length - 1, Math.max(0, Math.floor(p * (abs.length - 1))));
  const v = abs[idx]!;
  return v > 1e-12 ? v : 1;
}

export function robustNormalize(x: Float32Array, p = 0.995, target = 0.85): Float32Array {
  const scale = target / percentileAbs(x, p);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i]! * scale;
  return y;
}

export function softLimit(x: Float32Array, drive = 1): Float32Array {
  const y = new Float32Array(x.length);
  const k = Math.max(0.1, drive);
  for (let i = 0; i < x.length; i++) {
    y[i] = Math.tanh(x[i]! * k);
  }
  return y;
}

export function fadeEdges(x: Float32Array, sampleRate: number, ms = 8): Float32Array {
  const n = Math.min(x.length >> 1, Math.max(1, Math.round((ms / 1000) * sampleRate)));
  const y = new Float32Array(x);
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
    y[i]! *= w;
    y[x.length - 1 - i]! *= w;
  }
  return y;
}

export function peakAbs(x: Float32Array): number {
  let m = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]!);
    if (a > m) m = a;
  }
  return m;
}

export function hasNan(x: Float32Array): boolean {
  for (let i = 0; i < x.length; i++) {
    if (!Number.isFinite(x[i]!)) return true;
  }
  return false;
}

export function rms(x: Float32Array): number {
  if (x.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i]! * x[i]!;
  return Math.sqrt(s / x.length);
}
