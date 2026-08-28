import { listChannels, readRecords } from "./edf.ts";
import { applyDerivation, montageDerivations } from "./montages.ts";
import { applyFilters } from "./preprocessing.ts";
import { panForLaterality } from "./stereo.ts";
import type {
  CombineMode,
  ControlTrack,
  Derivation,
  FilterSettings,
  LoadedRecording,
  MixResult,
  MixerTrack,
  MontageKind,
  ProcessedTrack,
  ReproSummary,
  SonifySettings,
  TrackState,
} from "./types.ts";
import { describeMapping, mixSonify, sonifyTrack } from "./sonify.ts";
import { timeScaleFor } from "./musify.ts";
import { mixdownTracks } from "./audio.ts";

export function derivationsFor(
  recording: LoadedRecording,
  kind: MontageKind,
  customPairs: [string, string][],
): Derivation[] {
  const channels = listChannels(recording.header);
  return montageDerivations(kind, channels, customPairs);
}

export function processSegment(
  recording: LoadedRecording,
  start: number,
  duration: number,
  derivations: Derivation[],
  filters: FilterSettings,
): { start: number; duration: number; tracks: ProcessedTrack[] } {
  const rec = readRecords(recording.buffer, recording.header, start, duration);
  const available = derivations.filter((d) => d.available);
  const tracks: ProcessedTrack[] = available.map((d) => {
    const raw = applyDerivation(rec.samples, d);
    const filtered = applyFilters(raw, d.sampleRate, filters);
    return {
      id: d.id,
      label: d.label,
      laterality: d.laterality,
      kind: d.kind,
      samples: filtered,
      sampleRate: d.sampleRate,
    };
  });
  return { start: rec.start, duration: rec.duration, tracks };
}

export function audibleIds(tracks: TrackState[]): Set<string> {
  const anySolo = tracks.some((t) => t.solo);
  const set = new Set<string>();
  for (const t of tracks) {
    if (t.mute) continue;
    if (anySolo && !t.solo) continue;
    set.add(t.id);
  }
  return set;
}

export function controlTracksFrom(
  processed: ProcessedTrack[],
  trackState: Record<string, TrackState>,
  combine: CombineMode,
  spikes: Record<string, Float32Array>,
): ControlTrack[] {
  return processed.map((p) => {
    const st = trackState[p.id];
    const lat = st?.lateralityOverride ?? p.laterality;
    return {
      id: p.id,
      label: p.label,
      kind: p.kind,
      laterality: lat,
      voltage: p.samples,
      sampleRate: p.sampleRate,
      pan: combine === "average" ? 0 : panForLaterality(lat),
      gain: st?.gain ?? 1,
      mute: Boolean(st?.mute),
      solo: Boolean(st?.solo),
      spikes: spikes[p.id] ?? new Float32Array(0),
    };
  });
}

export function mixerTracksFrom(
  processed: ProcessedTrack[],
  trackState: Record<string, TrackState>,
  settings: SonifySettings,
  combine: CombineMode,
): MixerTrack[] {
  const musical = settings.mode === "choir";
  if (musical) {
    const mix = mixProcessed(processed, trackState, settings, combine);
    if (mix.left.length === 0) return [];
    return [
      {
        id: "__mixL",
        samples: mix.left,
        sampleRate: mix.sampleRate,
        pan: -1,
        gain: 1,
        mute: false,
        solo: false,
      },
      {
        id: "__mixR",
        samples: mix.right,
        sampleRate: mix.sampleRate,
        pan: 1,
        gain: 1,
        mute: false,
        solo: false,
      },
    ];
  }
  return processed.map((p) => {
    const st = trackState[p.id];
    const lat = st?.lateralityOverride ?? p.laterality;
    return {
      id: p.id,
      samples: sonifyTrack(p.samples, p.sampleRate, settings, p.kind),
      sampleRate: settings.outputRate,
      pan: combine === "average" ? 0 : panForLaterality(lat),
      gain: st?.gain ?? 1,
      mute: Boolean(st?.mute),
      solo: Boolean(st?.solo),
    };
  });
}

export function paramsFrom(
  processed: ProcessedTrack[],
  trackState: Record<string, TrackState>,
  combine: CombineMode,
): MixerTrack[] {
  return processed.map((p) => {
    const st = trackState[p.id];
    const lat = st?.lateralityOverride ?? p.laterality;
    return {
      id: p.id,
      samples: new Float32Array(0),
      sampleRate: 44100,
      pan: combine === "average" ? 0 : panForLaterality(lat),
      gain: st?.gain ?? 1,
      mute: Boolean(st?.mute),
      solo: Boolean(st?.solo),
    };
  });
}

export function mixdownSession(
  mixer: MixerTrack[],
  eegDuration: number,
  settings: SonifySettings,
): MixResult {
  return mixdownTracks(mixer, eegDuration, timeScaleFor(settings));
}

export function mixProcessed(
  processed: ProcessedTrack[],
  trackState: Record<string, TrackState>,
  settings: SonifySettings,
  combine: CombineMode,
): MixResult {
  const states = processed.map(
    (p) =>
      trackState[p.id] ?? {
        id: p.id,
        mute: false,
        solo: false,
        gain: 1,
        lateralityOverride: null,
      },
  );
  const audible = audibleIds(states);
  return mixSonify(
    processed.map((p) => {
      const st = trackState[p.id];
      return {
        id: p.id,
        label: p.label,
        samples: p.samples,
        sampleRate: p.sampleRate,
        laterality: st?.lateralityOverride ?? p.laterality,
        kind: p.kind,
        gain: st?.gain ?? 1,
        audible: audible.has(p.id),
      };
    }),
    settings,
    combine === "average" ? "average" : "per-track",
  );
}

export function buildRepro(opts: {
  file: string;
  montage: MontageKind;
  labels: string[];
  start: number;
  duration: number;
  filters: FilterSettings;
  settings: SonifySettings;
  combine: CombineMode;
  audible: string[];
}): ReproSummary {
  const f: string[] = [];
  if (opts.filters.removeDc) f.push("DC offset removed");
  if (opts.filters.lff > 0) f.push(`LFF ${opts.filters.lff} Hz`);
  if (opts.filters.hff > 0) f.push(`HFF ${opts.filters.hff} Hz`);
  if (opts.filters.bandpass) {
    f.push(`${opts.filters.bandpassLow}–${opts.filters.bandpassHigh} Hz bandpass (zero-phase)`);
  }
  if (opts.filters.notch60) f.push("60 Hz notch (zero-phase)");
  if (f.length === 0) f.push("none");
  const method =
    opts.settings.mode === "direct"
      ? "direct time compression of the waveform"
      : opts.settings.mode === "choir"
        ? `just-intonation 1/f choir (${opts.settings.scale})`
        : opts.settings.mode === "pulse"
          ? "pulse (amplitude follows |wave|)"
          : opts.settings.mode === "piano"
            ? `experimental piano (in-scale unless abnormal, ${opts.settings.scale})`
            : opts.settings.mode === "pen"
              ? "analog pen-on-paper (velocity → scratch)"
              : `contour (voltage → pitch, ${opts.settings.scale} root MIDI ${opts.settings.rootMidi})`;
  const compression =
    opts.settings.mode === "direct"
      ? `${opts.settings.compression}× (${describeMapping(opts.settings.compression)})`
      : `${timeScaleFor(opts.settings)}× playback time scale`;
  return {
    file: opts.file,
    montage: opts.montage,
    channels: opts.labels,
    interval: `${opts.start.toFixed(2)}–${(opts.start + opts.duration).toFixed(2)} s`,
    filters: f,
    normalization: `robust ${opts.settings.percentile} percentile, soft-limit`,
    method,
    compression,
    carrier: opts.settings.mode === "direct" ? "n/a" : `${opts.settings.rootMidi} MIDI root`,
    outputRate: `${opts.settings.outputRate} Hz`,
    stereo: opts.combine,
    audible: opts.audible,
  };
}
