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
  fMin: number;
  fMax: number;
  binHz: number;
  windowSamples: number;
  hopSamples: number;
  windowSec: number;
  hopSec: number;
  duration: number;
  sampleRate: number;
  dbMin: number;
  dbMax: number;
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
    const i0 = Math.max(0, Math.floor(a * sampleRate));
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

function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < Math.max(2, n)) size <<= 1;
  return size;
}

function hann(n: number, i: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, n - 1));
}

export function fftPower(frame: Float32Array): Float32Array {
  const n = nextPowerOfTwo(frame.length);
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let i = 0; i < frame.length; i++) re[i] = frame[i]!;
  bitReverseFft(re, im);
  const half = n >> 1;
  const mag = new Float32Array(half);
  for (let k = 0; k < half; k++) mag[k] = re[k]! * re[k]! + im[k]! * im[k]!;
  return mag;
}

export function spectrogram(
  x: Float32Array,
  fs: number,
  win = 256,
  hop = 64,
  fMax = 30,
): Float32Array {
  const fftN = nextPowerOfTwo(win);
  const nFreq = Math.max(2, Math.floor((fMax * fftN) / fs) + 1);
  const nTime = Math.max(1, Math.floor(Math.max(0, x.length - win) / Math.max(1, hop)) + 1);
  const out = new Float32Array(nTime * nFreq);
  const frame = new Float32Array(win);
  let windowEnergy = 0;
  for (let i = 0; i < win; i++) windowEnergy += hann(win, i) ** 2;
  const normalization = Math.max(1e-12, fs * windowEnergy);
  const center = (win - 1) / 2;
  let detrendDenominator = 0;
  for (let i = 0; i < win; i++) detrendDenominator += (i - center) ** 2;
  for (let t = 0; t < nTime; t++) {
    const i0 = t * hop;
    let mean = 0;
    for (let i = 0; i < win; i++) mean += x[i0 + i] ?? 0;
    mean /= win;
    let slopeNumerator = 0;
    for (let i = 0; i < win; i++) {
      slopeNumerator += (i - center) * ((x[i0 + i] ?? 0) - mean);
    }
    const slope = slopeNumerator / Math.max(1, detrendDenominator);
    for (let i = 0; i < win; i++) {
      // Remove the local baseline and linear drift before the FFT. Without
      // this, DC offsets and slow electrode drift can make delta/theta look
      // dominant even when the visible oscillation is elsewhere.
      const detrended = (x[i0 + i] ?? 0) - mean - slope * (i - center);
      frame[i] = detrended * hann(win, i);
    }
    const mag = fftPower(frame);
    for (let f = 0; f < nFreq; f++) {
      // One-sided PSD in physical units. Doubling non-DC bins preserves total
      // power while making the dB readout interpretable.
      const oneSided = f > 0 && f < mag.length - 1 ? 2 : 1;
      out[t * nFreq + f] = ((mag[f] ?? 0) * oneSided) / normalization;
    }
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
  const nFreq = Math.max(2, Math.floor((fMax * nextPowerOfTwo(win)) / fs) + 1);
  // A plain mean can erase a focal rhythm when only a subset of channels has
  // it. A gentle generalized mean preserves spatially localized power without
  // behaving like a noisy channel-wise maximum.
  const powerMeanExponent = 1.35;
  let acc: Float32Array | null = null;
  let nTime = Number.POSITIVE_INFINITY;
  for (const t of list) {
    const spec = spectrogram(t.samples, t.sampleRate, win, hop, fMax);
    const sourceNFreq = Math.max(2, Math.floor((fMax * nextPowerOfTwo(win)) / t.sampleRate) + 1);
    nTime = Math.min(nTime, Math.max(1, Math.floor(Math.max(0, t.samples.length - win) / hop) + 1));
    if (!acc) {
      acc = new Float32Array(Math.max(1, nTime) * nFreq);
      for (let ti = 0; ti < Math.max(1, nTime); ti++) {
        for (let fi = 0; fi < nFreq; fi++) {
          const hz = (fi * fs) / nextPowerOfTwo(win);
          const sourceFi = Math.min(
            sourceNFreq - 1,
            Math.round((hz * nextPowerOfTwo(win)) / t.sampleRate),
          );
          const power = spec[ti * sourceNFreq + sourceFi] ?? 0;
          acc[ti * nFreq + fi] = Math.pow(Math.max(0, power), powerMeanExponent);
        }
      }
    } else {
      const timeCount = Math.min(Math.max(1, nTime), Math.floor(spec.length / sourceNFreq));
      for (let ti = 0; ti < timeCount; ti++) {
        for (let fi = 0; fi < nFreq; fi++) {
          const hz = (fi * fs) / nextPowerOfTwo(win);
          const sourceFi = Math.min(
            sourceNFreq - 1,
            Math.round((hz * nextPowerOfTwo(win)) / t.sampleRate),
          );
          const power = spec[ti * sourceNFreq + sourceFi] ?? 0;
          acc[ti * nFreq + fi] =
            (acc[ti * nFreq + fi] ?? 0) + Math.pow(Math.max(0, power), powerMeanExponent);
        }
      }
    }
  }
  const n = list.length;
  const timeCount = Number.isFinite(nTime) ? Math.max(1, nTime) : 1;
  if (acc) {
    const validLength = timeCount * nFreq;
    for (let i = 0; i < validLength; i++) {
      acc[i] = Math.pow(Math.max(0, (acc[i] ?? 0) / n), 1 / powerMeanExponent);
    }
  }
  return acc ? { spec: acc, nTime: timeCount, nFreq, fs } : null;
}

function dbOfPower(power: number): number {
  return 10 * Math.log10(Math.max(1e-20, power));
}

function dbRangeOf(a: Float32Array, b: Float32Array): { min: number; max: number } {
  const step = Math.max(1, Math.floor((a.length + b.length) / 4000));
  const samples: number[] = [];
  for (let i = 0; i < a.length; i += step) samples.push(dbOfPower(a[i]!));
  for (let i = 0; i < b.length; i += step) samples.push(dbOfPower(b[i]!));
  if (samples.length === 0) return { min: -80, max: -20 };
  samples.sort((x, y) => x - y);
  const max = samples[Math.floor(samples.length * 0.98)] ?? -20;
  const low = samples[Math.floor(samples.length * 0.05)] ?? max - 48;
  return { min: Math.min(max - 12, Math.max(max - 54, low)), max };
}

function remapSpec(
  source: Float32Array,
  sourceTime: number,
  sourceFreq: number,
  targetTime: number,
  targetFreq: number,
): Float32Array {
  if (sourceTime === targetTime && sourceFreq === targetFreq) return source;
  const out = new Float32Array(targetTime * targetFreq);
  for (let ti = 0; ti < targetTime; ti++) {
    const sourceTi = Math.min(sourceTime - 1, ti);
    for (let fi = 0; fi < targetFreq; fi++) {
      const sourceFi = Math.min(
        sourceFreq - 1,
        Math.round((fi / Math.max(1, targetFreq - 1)) * (sourceFreq - 1)),
      );
      out[ti * targetFreq + fi] = source[sourceTi * sourceFreq + sourceFi] ?? 0;
    }
  }
  return out;
}

export function buildDsa(tracks: ProcessedTrack[], duration: number): DsaFrame | null {
  const eeg = tracks.filter((t) => t.kind === "eeg" && t.samples.length);
  if (eeg.length === 0) return null;
  // A DSA is a hemispheric summary, not a second full-resolution waveform
  // renderer. Evenly sample each side so large montages cannot monopolize the
  // main thread while preserving a representative view of the recording.
  const selectForDsa = (items: ProcessedTrack[], limit = 8) => {
    if (items.length <= limit) return items;
    return Array.from(
      { length: limit },
      (_, i) => items[Math.floor((i * (items.length - 1)) / (limit - 1))]!,
    );
  };
  const dsaEeg = [
    ...selectForDsa(eeg.filter((t) => t.laterality === "left")),
    ...selectForDsa(eeg.filter((t) => t.laterality === "right")),
  ];
  const sourceTracks = dsaEeg.length > 0 ? dsaEeg : selectForDsa(eeg, 12);
  const fs = eeg[0]!.sampleRate;
  const win = Math.min(1024, Math.max(256, nextPowerOfTwo(Math.round(fs * 2))));
  let hop = 64;
  const fMax = 45;
  hop = Math.max(1, Math.floor(win / 4));
  const nTimeGuess = Math.max(1, Math.floor(Math.max(0, eeg[0]!.samples.length - win) / hop) + 1);
  if (nTimeGuess > 1400) hop = Math.max(hop, Math.ceil((eeg[0]!.samples.length - win) / 1399));
  let left = meanPowerSpec(sourceTracks, "left", win, hop, fMax);
  let right = meanPowerSpec(sourceTracks, "right", win, hop, fMax);
  if (!left && !right) {
    const all = meanPowerSpec(sourceTracks, "all", win, hop, fMax);
    if (!all) return null;
    left = all;
    right = all;
  }
  if (!left) left = right;
  if (!right) right = left;
  const nTime = Math.min(left!.nTime, right!.nTime);
  const nFreq = left!.nFreq;
  const leftSpec = remapSpec(left!.spec, left!.nTime, left!.nFreq, nTime, nFreq);
  const rightSpec = remapSpec(right!.spec, right!.nTime, right!.nFreq, nTime, nFreq);
  const db = dbRangeOf(leftSpec, rightSpec);
  return {
    l: leftSpec,
    r: rightSpec,
    nTime,
    nFreq,
    fMin: 0,
    fMax,
    binHz: fMax / Math.max(1, left!.nFreq - 1),
    windowSamples: win,
    hopSamples: hop,
    windowSec: win / fs,
    hopSec: hop / fs,
    duration,
    sampleRate: fs,
    dbMin: db.min,
    dbMax: db.max,
  };
}

export function dsaColumn(frame: DsaFrame, t: number, side: "l" | "r"): Float32Array {
  const col = new Float32Array(frame.nFreq);
  if (frame.duration <= 0 || frame.nTime <= 0) return col;
  // DSA bins are anchored to the actual FFT hop, not a stretched pixel index.
  // This keeps the cursor and the band readout aligned when a frame is capped.
  const i = Math.max(
    0,
    Math.min(
      frame.nTime - 1,
      Math.floor((Math.max(0, t) - frame.windowSec / 2) / Math.max(1e-6, frame.hopSec)),
    ),
  );
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

/** Theme-aware, continuous DSA power ramp. Frequency is read from the axis;
 * this color scale intentionally does not segment the spectrum into bands. */
export function dsaRgb(u: number, theme: "dark" | "light" = "dark"): [number, number, number] {
  const x = Math.max(0, Math.min(1, u));
  const stops: [number, number, number, number][] = theme === "dark"
    ? [
      [0, 22, 36, 50],
      [0.25, 28, 78, 102],
      [0.5, 35, 130, 143],
      [0.75, 84, 193, 177],
      [1, 246, 202, 99],
    ]
    : [
      [0, 238, 245, 247],
      [0.25, 166, 211, 217],
      [0.5, 84, 166, 180],
      [0.75, 28, 108, 132],
      [1, 196, 91, 37],
    ];
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1]!;
    const b = stops[i]!;
    if (x <= b[0]) {
      const t = (x - a[0]) / Math.max(1e-6, b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
    }
  }
  return [253, 231, 37];
}

function hexRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  amount: number,
): [number, number, number] {
  const t = Math.max(0, Math.min(1, amount));
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Use the trace band hue for each frequency row while keeping PSD power as brightness. */
export function dsaBandRgb(
  u: number,
  hz: number,
  theme: "dark" | "light" = "dark",
  relativePower = 1,
): [number, number, number] {
  const base = hexRgb(BAND_COLORS[bandFromHz(hz)]);
  const background: [number, number, number] = theme === "dark" ? [7, 8, 10] : [248, 250, 251];
  const normalized = Math.max(0, Math.min(1, u));
  // Keep the low-power floor close to the canvas background so quiet rows do
  // not falsely read as strong delta/theta activity.
  const band = bandFromHz(hz);
  const floor =
    band === "delta" ? 0.24 : band === "theta" ? 0.22 : band === "alpha" ? 0.19 : band === "beta" ? 0.12 : 0.1;
  const contrast = Math.max(0, (normalized - floor) / Math.max(1e-6, 1 - floor));
  const relative = Math.max(0, Math.min(1, relativePower));
  const strength = Math.pow(contrast * Math.pow(relative, 1.15), 1.05);
  const colored = mixRgb(background, base, strength);
  return theme === "dark" ? mixRgb(colored, [255, 255, 255], 0.08 * strength) : colored;
}

export function dsaDb(power: number): number {
  return dbOfPower(power);
}

export function dsaUnit(power: number, dbMin: number, dbMax: number): number {
  const u = (dsaDb(power) - dbMin) / Math.max(1, dbMax - dbMin);
  return Math.max(0, Math.min(1, u));
}

export interface CursorReadout {
  hz: number;
  band: BandName;
  uv: number;
  l: BandPowers | null;
  r: BandPowers | null;
}

export function readoutAt(
  tracks: ProcessedTrack[],
  t: number,
  dsa: DsaFrame | null,
): CursorReadout {
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
