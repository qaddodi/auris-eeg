import type { ProcessedTrack } from "./types.ts";

export const BAND_COLORS = {
  delta: "#5b8def",
  theta: "#4ec4c0",
  alpha: "#7dce8a",
  beta: "#e0b070",
  gamma: "#e07a7a",
} as const;

export const BAND_LABELS: { id: BandName; glyph: string; range: string }[] = [
  { id: "delta", glyph: "Δ", range: "<4" },
  { id: "theta", glyph: "θ", range: "4–8" },
  { id: "alpha", glyph: "α", range: "8–13" },
  { id: "beta", glyph: "β", range: "13–30" },
  { id: "gamma", glyph: "γ", range: ">30" },
];

export type BandName = keyof typeof BAND_COLORS;

export interface DsaFrame {
  l: Float32Array;
  r: Float32Array;
  nTime: number;
  nFreq: number;
  fMax: number;
  duration: number;
  sampleRate: number;
  logMax: number;
}

export interface BandPowers {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
  peakHz: number;
  total: number;
}

export function bandFromHz(hz: number): BandName {
  if (hz < 4) return "delta";
  if (hz < 8) return "theta";
  if (hz < 13) return "alpha";
  if (hz < 30) return "beta";
  return "gamma";
}

export function colorForHz(hz: number): string {
  return BAND_COLORS[bandFromHz(hz)];
}

/** Instantaneous frequency via zero-crossings in each display column. */
export function freqWindow(
  samples: Float32Array,
  sampleRate: number,
  t0: number,
  t1: number,
  nPix: number,
): Float32Array {
  const hz = new Float32Array(Math.max(0, nPix));
  if (samples.length === 0 || nPix <= 0 || t1 <= t0 || sampleRate <= 0) return hz;
  const span = t1 - t0;
  for (let p = 0; p < nPix; p++) {
    const a = t0 + (p / nPix) * span;
    const b = t0 + ((p + 1) / nPix) * span;
    let i0 = Math.max(0, Math.floor(a * sampleRate));
    let i1 = Math.min(samples.length, Math.floor(b * sampleRate));
    if (i1 <= i0) i1 = Math.min(samples.length, i0 + 1);
    let zc = 0;
    let prev = samples[i0] ?? 0;
    for (let i = i0 + 1; i < i1; i++) {
      const v = samples[i]!;
      if (prev <= 0 && v > 0) zc++;
      prev = v;
    }
    hz[p] = zc / Math.max(1e-6, (i1 - i0) / sampleRate);
  }
  return smoothHz(hz, 2);
}

export function smoothHz(hz: Float32Array, k = 2): Float32Array {
  const y = new Float32Array(hz.length);
  for (let i = 0; i < hz.length; i++) {
    let s = 0;
    let n = 0;
    for (let j = i - k; j <= i + k; j++) {
      if (j < 0 || j >= hz.length) continue;
      s += hz[j]!;
      n++;
    }
    y[i] = n ? s / n : 0;
  }
  return y;
}

export function dominantHz(samples: Float32Array, fs: number, t: number, winSec = 1): number {
  if (samples.length === 0 || fs <= 0) return 0;
  const i0 = Math.max(0, Math.floor((t - winSec / 2) * fs));
  const i1 = Math.min(samples.length, Math.floor((t + winSec / 2) * fs));
  if (i1 - i0 < 8) return 0;
  let zc = 0;
  let prev = samples[i0] ?? 0;
  for (let i = i0 + 1; i < i1; i++) {
    const v = samples[i]!;
    if (prev <= 0 && v > 0) zc++;
    prev = v;
  }
  return zc / Math.max(1e-6, (i1 - i0) / fs);
}

export function rmsAbs(samples: Float32Array, fs: number, t: number, winSec = 0.25): number {
  if (samples.length === 0 || fs <= 0) return 0;
  const i0 = Math.max(0, Math.floor((t - winSec / 2) * fs));
  const i1 = Math.min(samples.length, Math.floor((t + winSec / 2) * fs));
  if (i1 <= i0) return 0;
  let s = 0;
  for (let i = i0; i < i1; i++) s += samples[i]! * samples[i]!;
  return Math.sqrt(s / (i1 - i0));
}

function bitReverseFft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]!;
      re[i] = re[j]!;
      re[j] = tr;
      const ti = im[i]!;
      im[i] = im[j]!;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j++) {
        const ur = re[i + j]!;
        const ui = im[i + j]!;
        const vr = re[i + j + half]! * wRe - im[i + j + half]! * wIm;
        const vi = re[i + j + half]! * wIm + im[i + j + half]! * wRe;
        re[i + j] = ur + vr;
        im[i + j] = ui + vi;
        re[i + j + half] = ur - vr;
        im[i + j + half] = ui - vi;
        const nRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nRe;
      }
    }
  }
}

function hann(n: number, i: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, n - 1));
}

export function fftPower(frame: Float32Array): Float32Array {
  const n = frame.length;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let i = 0; i < n; i++) re[i] = frame[i]!;
  bitReverseFft(re, im);
  const half = n >> 1;
  const mag = new Float32Array(half);
  for (let k = 0; k < half; k++) mag[k] = re[k]! * re[k]! + im[k]! * im[k]!;
  return mag;
}

export function spectrogram(x: Float32Array, fs: number, win = 256, hop = 64, fMax = 30): Float32Array {
  const nFreq = Math.max(2, Math.floor((fMax * win) / fs) + 1);
  const nTime = Math.max(1, Math.round((x.length - win) / hop) + 1);
  const out = new Float32Array(nTime * nFreq);
  const frame = new Float32Array(win);
  for (let t = 0; t < nTime; t++) {
    const i0 = t * hop;
    for (let i = 0; i < win; i++) {
      frame[i] = (x[i0 + i] ?? 0) * hann(win, i);
    }
    const mag = fftPower(frame);
    for (let f = 0; f < nFreq; f++) out[t * nFreq + f] = mag[f] ?? 0;
  }
  return out;
}

function meanPowerSpec(
  tracks: ProcessedTrack[],
  side: "left" | "right" | "all",
  win: number,
  hop: number,
  fMax: number,
): { spec: Float32Array; nTime: number; nFreq: number; fs: number } | null {
  const list = tracks.filter((t) => {
    if (t.kind !== "eeg" || !t.samples.length) return false;
    if (side === "all") return true;
    return t.laterality === side;
  });
  if (list.length === 0) return null;
  const fs = list[0]!.sampleRate;
  const nFreq = Math.max(2, Math.floor((fMax * win) / fs) + 1);
  let acc: Float32Array | null = null;
  let nTime = 1;
  for (const t of list) {
    const spec = spectrogram(t.samples, t.sampleRate, win, hop, fMax);
    nTime = Math.max(1, Math.round((t.samples.length - win) / hop) + 1);
    if (!acc) acc = spec;
    else {
      const m = Math.min(acc.length, spec.length);
      for (let i = 0; i < m; i++) acc[i]! += spec[i]!;
    }
  }
  const n = list.length;
  if (acc && n > 1) for (let i = 0; i < acc.length; i++) acc[i]! /= n;
  return acc ? { spec: acc, nTime, nFreq, fs } : null;
}

function logMaxOf(a: Float32Array, b: Float32Array): number {
  let m = 1e-18;
  const step = Math.max(1, Math.floor((a.length + b.length) / 4000));
  const samples: number[] = [];
  for (let i = 0; i < a.length; i += step) if (a[i]! > 0) samples.push(a[i]!);
  for (let i = 0; i < b.length; i += step) if (b[i]! > 0) samples.push(b[i]!);
  if (samples.length === 0) return 0;
  samples.sort((x, y) => x - y);
  m = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.96))] ?? m;
  return Math.log10(m + 1e-12);
}

export function buildDsa(tracks: ProcessedTrack[], duration: number): DsaFrame | null {
  const eeg = tracks.filter((t) => t.kind === "eeg" && t.samples.length);
  if (eeg.length === 0) return null;
  const fs = eeg[0]!.sampleRate;
  const win = 256;
  let hop = 64;
  const fMax = 30;
  const nTimeGuess = Math.max(1, Math.round((eeg[0]!.samples.length - win) / hop) + 1);
  if (nTimeGuess > 1400) hop = Math.max(64, Math.ceil((eeg[0]!.samples.length - win) / 1399));
  let left = meanPowerSpec(eeg, "left", win, hop, fMax);
  let right = meanPowerSpec(eeg, "right", win, hop, fMax);
  if (!left && !right) {
    const all = meanPowerSpec(eeg, "all", win, hop, fMax);
    if (!all) return null;
    left = all;
    right = all;
  }
  if (!left) left = right;
  if (!right) right = left;
  return {
    l: left!.spec,
    r: right!.spec,
    nTime: left!.nTime,
    nFreq: left!.nFreq,
    fMax,
    duration,
    sampleRate: fs,
    logMax: logMaxOf(left!.spec, right!.spec),
  };
}

export function dsaColumn(frame: DsaFrame, t: number, side: "l" | "r"): Float32Array {
  const col = new Float32Array(frame.nFreq);
  if (frame.duration <= 0 || frame.nTime <= 0) return col;
  const i = Math.max(0, Math.min(frame.nTime - 1, Math.floor((t / frame.duration) * frame.nTime)));
  const src = side === "l" ? frame.l : frame.r;
  col.set(src.subarray(i * frame.nFreq, i * frame.nFreq + frame.nFreq));
  return col;
}

export function bandPowersFromColumn(col: Float32Array, fMax: number): BandPowers {
  const n = col.length;
  const hzPerBin = fMax / Math.max(1, n - 1);
  let delta = 0;
  let theta = 0;
  let alpha = 0;
  let beta = 0;
  let gamma = 0;
  let peak = 0;
  let peakHz = 0;
  let total = 0;
  for (let i = 1; i < n; i++) {
    const p = col[i]!;
    const hz = i * hzPerBin;
    total += p;
    if (p > peak) {
      peak = p;
      peakHz = hz;
    }
    if (hz < 4) delta += p;
    else if (hz < 8) theta += p;
    else if (hz < 13) alpha += p;
    else if (hz < 30) beta += p;
    else gamma += p;
  }
  const s = Math.max(1e-12, total);
  return {
    delta: delta / s,
    theta: theta / s,
    alpha: alpha / s,
    beta: beta / s,
    gamma: gamma / s,
    peakHz,
    total,
  };
}

export function peakBand(p: BandPowers): BandName {
  const entries: [BandName, number][] = [
    ["delta", p.delta],
    ["theta", p.theta],
    ["alpha", p.alpha],
    ["beta", p.beta],
    ["gamma", p.gamma],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]![0];
}

/** Classic DSA ramp: black → teal → gold → white. `u` is 0–1 log power. */
export function dsaRgb(u: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, u));
  if (x < 0.33) {
    const t = x / 0.33;
    return [8 + t * 20, 16 + t * 110, 24 + t * 90];
  }
  if (x < 0.66) {
    const t = (x - 0.33) / 0.33;
    return [28 + t * 180, 126 + t * 70, 114 - t * 40];
  }
  const t = (x - 0.66) / 0.34;
  return [208 + t * 36, 196 + t * 40, 74 + t * 160];
}

export function dsaUnit(p: number, logMax: number): number {
  const u = Math.log10(p + 1e-12) / Math.max(1e-6, logMax);
  const x = Math.max(0, Math.min(1, (u + 0.12) / 1.12));
  return Math.pow(x, 0.7);
}

export interface CursorReadout {
  hz: number;
  band: BandName;
  uv: number;
  l: BandPowers | null;
  r: BandPowers | null;
}

export function readoutAt(tracks: ProcessedTrack[], t: number, dsa: DsaFrame | null): CursorReadout {
  const eeg = tracks.filter((tr) => tr.kind === "eeg" && tr.samples.length);
  let hz = 0;
  let uv = 0;
  let n = 0;
  for (const tr of eeg) {
    hz += dominantHz(tr.samples, tr.sampleRate, t, 1);
    uv += rmsAbs(tr.samples, tr.sampleRate, t, 0.25);
    n++;
  }
  const nSafe = Math.max(1, n);
  hz /= nSafe;
  uv /= nSafe;
  return {
    hz,
    band: bandFromHz(hz),
    uv,
    l: dsa ? bandPowersFromColumn(dsaColumn(dsa, t, "l"), dsa.fMax) : null,
    r: dsa ? bandPowersFromColumn(dsaColumn(dsa, t, "r"), dsa.fMax) : null,
  };
}
