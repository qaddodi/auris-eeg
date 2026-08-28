import { fadeEdges, hasNan, peakAbs, percentileAbs, robustNormalize, softLimit } from "./preprocessing.ts";
import { choirVoice, ekgVoice, eogVoice, scaleVoice, timeScaleFor } from "./musify.ts";
import { averageChannels, mixToStereo, panForLaterality } from "./stereo.ts";
import type { ChannelKind, Laterality, MixResult, SonifySettings } from "./types.ts";

export function interpolate(x: Float32Array, index: number): number {
  if (x.length === 0) return 0;
  if (index <= 0) return x[0]!;
  if (index >= x.length - 1) return x[x.length - 1]!;
  const i = Math.floor(index);
  const f = index - i;
  return x[i]! * (1 - f) + x[i + 1]! * f;
}

/** Play the EEG waveform C× faster so EEG frequencies enter the audible band. */
export function timeCompress(
  eeg: Float32Array,
  eegRate: number,
  compression: number,
  audioRate: number,
): Float32Array {
  const eegDur = eeg.length / eegRate;
  const audioDur = Math.max(1 / audioRate, eegDur / Math.max(1, compression));
  const n = Math.max(1, Math.round(audioDur * audioRate));
  const out = new Float32Array(n);
  const step = (eeg.length - 1) / Math.max(1, n - 1);
  for (let i = 0; i < n; i++) out[i] = interpolate(eeg, i * step);
  return out;
}

export function amplitudeModulate(
  eeg: Float32Array,
  eegRate: number,
  audioRate: number,
  carrierHz: number,
  depth: number,
  timeScale: number,
): Float32Array {
  const eegDur = eeg.length / eegRate;
  const audioDur = Math.max(1 / audioRate, eegDur / Math.max(0.1, timeScale));
  const n = Math.max(1, Math.round(audioDur * audioRate));
  const out = new Float32Array(n);
  const d = Math.min(0.99, Math.max(0, depth));
  const baseline = 1 - d;
  const step = (eeg.length - 1) / Math.max(1, n - 1);
  const w = (2 * Math.PI * carrierHz) / audioRate;
  for (let i = 0; i < n; i++) {
    const e = interpolate(eeg, i * step);
    const env = baseline + d * (0.5 * (e + 1));
    const gated = Math.max(0, env);
    out[i] = Math.sin(w * i) * gated;
  }
  return out;
}

function highShelf(x: Float32Array, amount: number): Float32Array {
  if (amount <= 0.001) return x;
  const y = new Float32Array(x.length);
  let prev = x[0] ?? 0;
  const mix = Math.min(1, Math.max(0, amount));
  for (let i = 0; i < x.length; i++) {
    const d = x[i]! - prev;
    prev = x[i]!;
    y[i] = x[i]! * (1 - mix) + d * mix * 4;
  }
  return y;
}

export function sonifyTrack(
  eeg: Float32Array,
  eegRate: number,
  settings: SonifySettings,
  kind: ChannelKind = "eeg",
): Float32Array {
  if (kind === "ekg") return ekgVoice(eeg, eegRate, settings);
  if (kind === "eog" || kind === "emg") return eogVoice(eeg, eegRate, settings);
  if (settings.mode === "choir") return choirVoice(eeg, eegRate, settings);
  if (
    settings.mode === "contour" ||
    settings.mode === "pulse" ||
    settings.mode === "piano" ||
    settings.mode === "pen"
  ) {
    return scaleVoice(eeg, eegRate, settings);
  }

  const norm = robustNormalize(eeg, settings.percentile, 0.85);
  const bright = highShelf(norm, settings.brightness);
  const audio = timeCompress(bright, eegRate, settings.compression, settings.outputRate);
  return fadeEdges(softLimit(audio, 1.15), settings.outputRate, 8);
}

export interface MixTrackInput {
  id: string;
  label: string;
  samples: Float32Array;
  sampleRate: number;
  laterality: Laterality;
  kind: ChannelKind;
  gain: number;
  audible: boolean;
}

function averageGroup(tracks: MixTrackInput[]): Float32Array {
  return averageChannels(tracks.map((t) => t.samples));
}

/** For choir/scale, mix EEG into L/R/midline buses so 18 channels don't become hiss. */
export function groupForMusify(tracks: MixTrackInput[]): MixTrackInput[] {
  const eeg = tracks.filter((t) => t.kind === "eeg" && t.audible && t.samples.length);
  const extras = tracks.filter((t) => t.kind !== "eeg" && t.audible && t.samples.length);
  const grouped: MixTrackInput[] = [];
  const buckets: Record<"left" | "right" | "midline", MixTrackInput[]> = {
    left: [],
    right: [],
    midline: [],
  };
  for (const t of eeg) {
    const side = t.laterality === "right" ? "right" : t.laterality === "left" ? "left" : "midline";
    buckets[side].push(t);
  }
  (["left", "right", "midline"] as const).forEach((side) => {
    const list = buckets[side];
    if (list.length === 0) return;
    grouped.push({
      id: `bus:${side}`,
      label: side === "left" ? "Left EEG" : side === "right" ? "Right EEG" : "Midline EEG",
      samples: list.length === 1 ? list[0]!.samples : averageGroup(list),
      sampleRate: list[0]!.sampleRate,
      laterality: side,
      kind: "eeg",
      gain: 1,
      audible: true,
    });
  });
  return [...grouped, ...extras];
}

export function mixSonify(
  tracks: MixTrackInput[],
  settings: SonifySettings,
  combine: "per-track" | "average" | "stereo",
): MixResult {
  const audible = tracks.filter((t) => t.audible && t.samples.length > 0);
  const compressionUsed = timeScaleFor(settings);
  const empty: MixResult = {
    left: new Float32Array(0),
    right: new Float32Array(0),
    sampleRate: settings.outputRate,
    duration: 0,
    eegDuration: 0,
    compressionUsed,
    peak: 0,
    clipped: false,
  };
  if (audible.length === 0) return empty;

  const eegDur = audible[0]!.samples.length / audible[0]!.sampleRate;
  const musical =
    settings.mode === "choir" || settings.mode === "piano" || settings.mode === "pen";
  const voices = musical ? groupForMusify(audible) : audible;

  let mixed: { left: Float32Array; right: Float32Array };

  if (combine === "average" && !musical) {
    const avg = averageChannels(voices.map((t) => t.samples));
    const audio = sonifyTrack(avg, voices[0]!.sampleRate, settings, "eeg");
    mixed = { left: audio, right: new Float32Array(audio) };
  } else {
    const sonified = voices.map((t) => ({
      samples: sonifyTrack(t.samples, t.sampleRate, settings, t.kind),
      pan: panForLaterality(t.laterality),
      gain: t.gain,
    }));
    const len = Math.max(...sonified.map((s) => s.samples.length), 0);
    mixed = mixToStereo(sonified, len);
  }

  const peak = Math.max(peakAbs(mixed.left), peakAbs(mixed.right), 1e-9);
  const target = 0.89;
  if (peak > target) {
    const g = target / peak;
    for (let i = 0; i < mixed.left.length; i++) {
      mixed.left[i]! *= g;
      mixed.right[i]! *= g;
    }
  }
  const finalPeak = Math.max(peakAbs(mixed.left), peakAbs(mixed.right));
  const clipped = finalPeak > 0.999 || hasNan(mixed.left) || hasNan(mixed.right);

  return {
    left: mixed.left,
    right: mixed.right,
    sampleRate: settings.outputRate,
    duration: mixed.left.length / settings.outputRate,
    eegDuration: eegDur,
    compressionUsed,
    peak: finalPeak,
    clipped,
  };
}

export function expectedAudioHz(eegHz: number, compression: number): number {
  return eegHz * compression;
}

export function describeMapping(compression: number): string {
  const alpha = expectedAudioHz(10, compression);
  const delta = expectedAudioHz(3, compression);
  const fmt = (hz: number) => (hz >= 1000 ? `${(hz / 1000).toFixed(2)} kHz` : `${hz.toFixed(0)} Hz`);
  return `10 Hz alpha → ${fmt(alpha)}; 3 Hz delta → ${fmt(delta)}`;
}

export { percentileAbs };
