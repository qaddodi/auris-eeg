import { SCALE_DEGREES, midiToHz, quantizeMidi } from "./musify.ts";
import { fadeEdges, hasNan, peakAbs, percentileAbs, softLimit } from "./preprocessing.ts";
import type { ControlTrack, MixResult, ScaleName, SonifySettings } from "./types.ts";

export function voltageToMidi(
  v: number,
  root: number,
  range: number,
  negativeUp: boolean,
  degrees: number[] | null,
): number {
  // Match the graph: y = mid + (negativeUp ? -v : v) * scale (canvas y grows down).
  // Graph-up is therefore +v when Neg-up is on, -v when it is off.
  const signed = negativeUp ? v : -v;
  const midi = root + Math.max(-1, Math.min(1, signed)) * range;
  if (!degrees) return midi;
  return quantizeMidi(midi, degrees, root);
}

/** Cheap morphology hint for piano mode — educational, not a diagnosis. */
export function waveAbnormality(
  abs: number,
  transient: number,
  slowAbs: number,
): "ok" | "spike" | "slow" | "grit" {
  if (transient > 0.22 && abs > 0.28) return "spike";
  if (slowAbs > 0.34 && transient < 0.08) return "slow";
  if (transient > 0.18 && slowAbs < 0.22) return "grit";
  return "ok";
}

function interp(x: Float32Array, idx: number): number {
  if (x.length === 0) return 0;
  if (idx <= 0) return x[0]!;
  if (idx >= x.length - 1) return x[x.length - 1]!;
  const i = Math.floor(idx);
  const f = idx - i;
  return x[i]! * (1 - f) + x[i + 1]! * f;
}

export interface ContourOpts {
  timeScale: number;
  rootMidi: number;
  rangeSemitones: number;
  scale: ScaleName;
  quantize: boolean;
  negativeUp: boolean;
  outputRate: number;
  mode:
    | "contour"
    | "ambient"
    | "choir"
    | "pulse"
    | "direct"
    | "piano"
    | "pen"
    | "loui"
    | "loui-hybrid";
}

export function settingsToOpts(s: SonifySettings, negativeUp: boolean): ContourOpts {
  return {
    timeScale: s.mode === "direct" ? s.compression : s.timeScale,
    rootMidi: s.rootMidi,
    rangeSemitones: s.rangeSemitones,
    scale: s.scale,
    quantize: s.quantize,
    negativeUp,
    outputRate: s.outputRate,
    mode: s.mode,
  };
}

/**
 * Warm realtime-style renderer: voltage → pitch (contour), |voltage| → loudness.
 * Used for tests and WAV bounce. The live path is the AudioWorklet copy.
 */
export function renderContour(
  tracks: ControlTrack[],
  eegDuration: number,
  opts: ContourOpts,
): MixResult {
  const audible = tracks.filter((t) => {
    if (t.mute || t.voltage.length === 0) return false;
    return true;
  });
  const anySolo = tracks.some((t) => t.solo);
  const voices = audible.filter((t) => (anySolo ? t.solo : true));
  const timeScale = Math.max(0.25, opts.timeScale);
  const audioDur = Math.max(0.05, eegDuration / timeScale);
  const n = Math.max(1, Math.round(audioDur * opts.outputRate));
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  if (voices.length === 0) {
    return {
      left,
      right,
      sampleRate: opts.outputRate,
      duration: 0,
      eegDuration,
      compressionUsed: timeScale,
      peak: 0,
      clipped: false,
    };
  }

  const degrees = opts.quantize ? SCALE_DEGREES[opts.scale] : null;
  const voiceGain = 0.72 / Math.sqrt(voices.length);
  const phases = voices.map(() => 0);
  const ampS = voices.map(() => 0);
  const hzS = voices.map(() => midiToHz(opts.rootMidi));
  const prevV = voices.map(() => 0);
  const scales = voices.map((tr) => 1 / Math.max(1e-6, percentileAbs(tr.voltage, 0.995)));
  let lpL = 0;
  let lpR = 0;
  const lpA = 1 - Math.exp((-2 * Math.PI * (opts.mode === "pen" ? 2800 : 1600)) / opts.outputRate);
  const spikeGain = 0.18;
  const spikeIdx = voices.map(() => 0);

  for (let i = 0; i < n; i++) {
    const eegT = (i / opts.outputRate) * timeScale;
    let l = 0;
    let r = 0;
    for (let v = 0; v < voices.length; v++) {
      const tr = voices[v]!;
      const idx = eegT * tr.sampleRate;
      const raw = interp(tr.voltage, idx);
      const vn = Math.max(-1, Math.min(1, raw * scales[v]!));
      const gL = (0.5 - 0.5 * tr.pan) * Math.SQRT2;
      const gR = (0.5 + 0.5 * tr.pan) * Math.SQRT2;
      if (opts.mode === "direct") {
        const sample = vn * voiceGain * tr.gain;
        l += sample * gL;
        r += sample * gR;
      } else if (opts.mode === "pen") {
        const vel = vn - prevV[v]!;
        prevV[v] = vn;
        const speed = Math.min(1, Math.abs(vel) * 14);
        ampS[v] = ampS[v]! + 0.08 * (0.1 + 0.9 * speed - ampS[v]!);
        const signed = opts.negativeUp ? vn : -vn;
        const thz = 620 + speed * 1480 + signed * 160;
        hzS[v] = hzS[v]! + 0.05 * (thz - hzS[v]!);
        phases[v] = phases[v]! + (2 * Math.PI * hzS[v]!) / opts.outputRate;
        const noise = ((Math.sin(i * 12.9898 + vn * 78.233) * 43758.5453) % 1) * 2 - 1;
        const scratch = Math.sin(phases[v]!) * speed;
        const paper = noise * (0.28 + 0.72 * speed);
        const s = (scratch * 0.58 + paper * 0.42) * ampS[v]! * voiceGain * tr.gain;
        l += s * gL;
        r += s * gR;
      } else {
        const targetAmp = Math.min(1, Math.abs(vn) * 1.35);
        ampS[v] = ampS[v]! + 0.04 * (targetAmp - ampS[v]!);
        let targetHz: number;
        if (opts.mode === "pulse") targetHz = midiToHz(opts.rootMidi - 12);
        else {
          const midi = voltageToMidi(
            vn,
            opts.rootMidi,
            opts.rangeSemitones,
            opts.negativeUp,
            degrees,
          );
          targetHz = midiToHz(midi);
        }
        hzS[v] = hzS[v]! + 0.08 * (targetHz - hzS[v]!);
        phases[v] = phases[v]! + (2 * Math.PI * hzS[v]!) / opts.outputRate;
        const s = Math.sin(phases[v]!) * ampS[v]! * voiceGain * tr.gain;
        const sub = Math.sin(phases[v]! * 0.5) * ampS[v]! * 0.12 * voiceGain * tr.gain;
        l += (s + sub) * gL;
        r += (s + sub) * gR;
      }
      const spikes = tr.spikes;
      let si = spikeIdx[v]!;
      while (si < spikes.length && spikes[si]! < eegT - 0.05) si++;
      spikeIdx[v] = si;
      if (si < spikes.length) {
        const dt = eegT - spikes[si]!;
        if (dt >= 0 && dt < 0.045) {
          const env = Math.exp(-dt * 55);
          const tap =
            Math.sin(2 * Math.PI * 168 * (i / opts.outputRate)) * env * spikeGain * tr.gain;
          l += tap * gL;
          r += tap * gR;
        }
      }
    }
    lpL += lpA * (l - lpL);
    lpR += lpA * (r - lpR);
    left[i] = Math.tanh(lpL * 0.85);
    right[i] = Math.tanh(lpR * 0.85);
  }

  const peak = Math.max(peakAbs(left), peakAbs(right), 1e-9);
  if (peak > 0.89) {
    const g = 0.89 / peak;
    for (let i = 0; i < n; i++) {
      left[i]! *= g;
      right[i]! *= g;
    }
  }
  const fl = fadeEdges(softLimit(left, 0.9), opts.outputRate, 16);
  const fr = fadeEdges(softLimit(right, 0.9), opts.outputRate, 16);
  return {
    left: fl,
    right: fr,
    sampleRate: opts.outputRate,
    duration: n / opts.outputRate,
    eegDuration,
    compressionUsed: timeScale,
    peak: Math.max(peakAbs(fl), peakAbs(fr)),
    clipped: hasNan(fl) || hasNan(fr),
  };
}
