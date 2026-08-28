import { bandpassForward, envelopeFollow, fadeEdges, robustNormalize, softLimit } from "./preprocessing.ts";
import type { ScaleName, SonifySettings } from "./types.ts";

export const SCALE_DEGREES: Record<ScaleName, number[]> = {
  pentatonic: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
};

export const SCALE_LABELS: Record<ScaleName, string> = {
  pentatonic: "Minor pentatonic",
  dorian: "Dorian",
  harmonic: "Harmonic minor",
  major: "Major",
};

/** Just-intonation choir: 1, 5/4, 3/2, 2 (unison, major third, fifth, octave). */
export const JUST_RATIOS = [1, 5 / 4, 3 / 2, 2] as const;

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(Math.max(1e-6, hz) / 440);
}

export function quantizeMidi(midi: number, degrees: number[], rootMidi: number): number {
  const rel = midi - rootMidi;
  const oct = Math.floor(rel / 12);
  const pc = rel - oct * 12;
  let best = degrees[0]!;
  let bestD = 99;
  for (const d of degrees) {
    const err = Math.abs(d - pc);
    const wrap = Math.abs(d + 12 - pc);
    if (err < bestD) {
      bestD = err;
      best = d;
    }
    if (wrap < bestD) {
      bestD = wrap;
      best = d;
    }
  }
  return rootMidi + oct * 12 + best;
}

/** Map EEG Hz (0.5–30) onto two octaves of a scale starting an octave below root. */
export function eegHzToScaleHz(eegHz: number, rootMidi: number, scale: ScaleName): number {
  const lo = Math.log(0.5);
  const hi = Math.log(30);
  const t = Math.max(0, Math.min(1, (Math.log(Math.max(0.25, eegHz)) - lo) / (hi - lo)));
  const midi = rootMidi - 12 + t * 24;
  return midiToHz(quantizeMidi(midi, SCALE_DEGREES[scale], rootMidi));
}

function interpolate(x: Float32Array, index: number): number {
  if (x.length === 0) return 0;
  if (index <= 0) return x[0]!;
  if (index >= x.length - 1) return x[x.length - 1]!;
  const i = Math.floor(index);
  const f = index - i;
  return x[i]! * (1 - f) + x[i + 1]! * f;
}

function resample(x: Float32Array, eegRate: number, audioRate: number, timeScale: number): Float32Array {
  const eegDur = x.length / Math.max(1, eegRate);
  const audioDur = Math.max(1 / audioRate, eegDur / Math.max(0.1, timeScale));
  const n = Math.max(1, Math.round(audioDur * audioRate));
  const out = new Float32Array(n);
  const step = (x.length - 1) / Math.max(1, n - 1);
  for (let i = 0; i < n; i++) out[i] = interpolate(x, i * step);
  return out;
}

function tone(n: number, rate: number, hz: number, env: Float32Array, harmonic = 0.14): Float32Array {
  const out = new Float32Array(n);
  const w = (2 * Math.PI * hz) / rate;
  const w2 = (2 * Math.PI * hz * 2) / rate;
  for (let i = 0; i < n; i++) {
    const e = env[i] ?? 0;
    out[i] = (Math.sin(w * i) + harmonic * Math.sin(w2 * i)) * e;
  }
  return out;
}

const BANDS: { lo: number; hi: number; envHz: number }[] = [
  { lo: 0.5, hi: 4, envHz: 6 },
  { lo: 4, hi: 8, envHz: 8 },
  { lo: 8, hi: 13, envHz: 10 },
  { lo: 13, hi: 30, envHz: 14 },
];

/**
 * Rhythm choir: each clinical band drives one just-intonation partial.
 * 1/f amplitudes (Wu 2009 scale-free brain-wave music) keep the chord warm.
 * 3 Hz spike-and-wave pulses the bass; 10 Hz alpha sings the fifth.
 */
export function choirVoice(eeg: Float32Array, eegRate: number, settings: SonifySettings): Float32Array {
  const norm = robustNormalize(eeg, settings.percentile, 0.9);
  const timeScale = settings.timeScale;
  const audioRate = settings.outputRate;
  const rootHz = midiToHz(settings.rootMidi);
  let mixed: Float32Array | null = null;
  for (let b = 0; b < BANDS.length; b++) {
    const band = BANDS[b]!;
    const bp = bandpassForward(norm, eegRate, band.lo, band.hi);
    const env = envelopeFollow(bp, eegRate, band.envHz);
    const audioEnv = resample(env, eegRate, audioRate, timeScale);
    const hz = rootHz * JUST_RATIOS[b]!;
    const oneOverF = 1 / (b + 1);
    const voice = tone(audioEnv.length, audioRate, hz, audioEnv, 0.08);
    if (!mixed) {
      mixed = new Float32Array(voice.length);
      for (let i = 0; i < voice.length; i++) mixed[i] = voice[i]! * oneOverF;
    } else {
      const n = Math.min(mixed.length, voice.length);
      for (let i = 0; i < n; i++) mixed[i]! += voice[i]! * oneOverF;
    }
  }
  const audio = mixed ?? new Float32Array(1);
  return fadeEdges(softLimit(audio, 0.85), audioRate, 12);
}

function dominantHz(x: Float32Array, fs: number, i0: number, i1: number): number {
  let zc = 0;
  let prev = x[i0] ?? 0;
  for (let i = i0 + 1; i < i1; i++) {
    const v = x[i]!;
    if (prev <= 0 && v > 0) zc++;
    prev = v;
  }
  return zc / Math.max(1e-6, (i1 - i0) / fs);
}

export function scaleVoice(eeg: Float32Array, eegRate: number, settings: SonifySettings): Float32Array {
  const norm = robustNormalize(eeg, settings.percentile, 0.9);
  const timeScale = settings.timeScale;
  const audioRate = settings.outputRate;
  const audio = resample(norm, eegRate, audioRate, timeScale);
  const n = audio.length;
  const out = new Float32Array(n);
  let phase = 0;
  let hz = midiToHz(settings.rootMidi);
  let env = 0;
  const win = Math.max(8, Math.round((eegRate * 0.12) / timeScale));
  for (let i = 0; i < n; i++) {
    const eegI = (i / n) * (eeg.length - 1);
    const i0 = Math.max(0, Math.floor(eegI - win / 2));
    const i1 = Math.min(eeg.length, Math.floor(eegI + win / 2));
    const inst = dominantHz(eeg, eegRate, i0, i1);
    const target = settings.quantize
      ? eegHzToScaleHz(inst || 8, settings.rootMidi, settings.scale)
      : midiToHz(settings.rootMidi + Math.max(-1, Math.min(1, audio[i]!)) * settings.rangeSemitones);
    hz += 0.04 * (target - hz);
    env += 0.05 * (Math.min(1, Math.abs(audio[i]!) * 1.4) - env);
    phase += (2 * Math.PI * hz) / audioRate;
    out[i] = Math.sin(phase) * env;
  }
  return fadeEdges(softLimit(out, 0.9), audioRate, 10);
}

export function ekgVoice(eeg: Float32Array, eegRate: number, settings: SonifySettings): Float32Array {
  const env = envelopeFollow(eeg, eegRate, 18);
  const timeScale = settings.mode === "direct" ? settings.compression : settings.timeScale;
  const audioRate = settings.outputRate;
  const audioEnv = resample(env, eegRate, audioRate, timeScale);
  const n = audioEnv.length;
  const out = new Float32Array(n);
  const w = (2 * Math.PI * 56) / audioRate;
  for (let i = 0; i < n; i++) {
    const e = audioEnv[i]!;
    out[i] = Math.sin(w * i) * e * e;
  }
  return fadeEdges(softLimit(out, 1.05), audioRate, 8);
}

export function eogVoice(eeg: Float32Array, eegRate: number, settings: SonifySettings): Float32Array {
  const slow = bandpassForward(eeg, eegRate, 0.1, 8);
  const env = envelopeFollow(slow, eegRate, 4);
  const timeScale = settings.mode === "direct" ? settings.compression : settings.timeScale;
  const audioRate = settings.outputRate;
  const audioEnv = resample(env, eegRate, audioRate, timeScale);
  const n = audioEnv.length;
  const out = new Float32Array(n);
  const w = (2 * Math.PI * 186) / audioRate;
  let noise = 0;
  for (let i = 0; i < n; i++) {
    noise = (noise * 0.96 + (Math.sin(i * 12.9898) * 43758.5453) % 1) % 1;
    const e = audioEnv[i]!;
    out[i] = (0.7 * Math.sin(w * i) + 0.35 * (noise * 2 - 1)) * e;
  }
  return fadeEdges(softLimit(out, 1.05), audioRate, 10);
}

export function timeScaleFor(settings: SonifySettings): number {
  if (settings.mode === "direct") return settings.compression;
  return settings.timeScale;
}
