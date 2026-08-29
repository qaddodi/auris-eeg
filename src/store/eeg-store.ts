"use client";

import { create } from "zustand";
import { encodeWav, playback } from "@/lib/eeg/audio";
import {
  DEFAULT_FILTERS,
  DEFAULT_SONIFY,
  clampSensitivity,
  DEFAULT_SENSITIVITY_UV,
  stepSensitivity,
} from "@/lib/eeg/defaults";
import { loadRecording } from "@/lib/eeg/edf";
import {
  audibleIds,
  buildRepro,
  controlTracksFrom,
  derivationsFor,
  processSegment,
} from "@/lib/eeg/pipeline";
import { detectMorphologies, spikesForTrack } from "@/lib/eeg/patterns";
import { buildDsa } from "@/lib/eeg/spectrum";
import {
  clampView,
  DEFAULT_VIEW_SEC,
  fitSensitivityUv,
  followViewStart,
  zoomView,
} from "@/lib/eeg/view";
import { panForLaterality } from "@/lib/eeg/stereo";
import type {
  Annotation,
  CombineMode,
  Derivation,
  FilterSettings,
  LoadedRecording,
  MixResult,
  MorphologyType,
  MontageKind,
  ProcessedTrack,
  ReproSummary,
  SonifySettings,
  TrackState,
} from "@/lib/eeg/types";
import type { DsaFrame } from "@/lib/eeg/spectrum";

interface SegmentData {
  start: number;
  duration: number;
  tracks: ProcessedTrack[];
}

export interface AppState {
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  recording: LoadedRecording | null;
  montage: MontageKind;
  customPairs: [string, string][];
  customA: string;
  customB: string;
  derivations: Derivation[];
  tracks: Record<string, TrackState>;
  filters: FilterSettings;
  sonify: SonifySettings;
  combine: CombineMode;
  negativeUp: boolean;
  sensitivityUv: number;
  segment: SegmentData | null;
  mix: MixResult | null;
  wavUrl: string | null;
  playing: boolean;
  loop: boolean;
  playheadEeg: number;
  viewStart: number;
  viewDuration: number;
  followPlayhead: boolean;
  busy: boolean;
  aboutOpen: boolean;
  keysOpen: boolean;
  annotations: Annotation[];
  selectedAnnotation: string | null;
  showAuto: boolean;
  showAnnotations: boolean;
  tool: "pointer" | "annotate" | "caliper";
  pendingType: MorphologyType;
  showDsa: boolean;
  dsa: DsaFrame | null;
  audibleScrub: boolean;

  loadFile: (file: File | ArrayBuffer, name: string) => Promise<void>;
  setMontage: (m: MontageKind) => void;
  setFilters: (p: Partial<FilterSettings>) => void;
  setSonify: (p: Partial<SonifySettings>) => void;
  setCombine: (c: CombineMode) => void;
  toggleMute: (id: string) => void;
  toggleSolo: (id: string) => void;
  soloExclusive: (id: string) => void;
  clearSolos: () => void;
  soloHemi: (side: "left" | "right") => void;
  unmuteAll: () => void;
  setGain: (id: string, gain: number) => void;
  setLaterality: (id: string, lat: TrackState["lateralityOverride"]) => void;
  addCustomPair: () => void;
  removeCustomPair: (i: number) => void;
  setCustomAB: (a: string, b: string) => void;
  setSensitivity: (n: number) => void;
  nudgeSensitivity: (dir: -1 | 1) => void;
  fitSensitivity: () => void;
  setNegativeUp: (v: boolean) => void;
  setAboutOpen: (v: boolean) => void;
  setKeysOpen: (v: boolean) => void;
  seekEeg: (t: number) => void;
  togglePlay: () => Promise<void>;
  stop: () => void;
  setLoop: (v: boolean) => void;
  download: () => void;
  zoomAt: (factor: number, anchor?: number) => void;
  setViewDuration: (d: number) => void;
  setView: (start: number, duration: number, opts?: { follow?: boolean }) => void;
  panView: (deltaSec: number) => void;
  setFollow: (v: boolean) => void;
  nudge: (deltaSec: number) => void;
  page: (dir: -1 | 1) => void;
  addAnnotation: (a: Omit<Annotation, "id">) => void;
  removeAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  setShowAuto: (v: boolean) => void;
  setShowAnnotations: (v: boolean) => void;
  setTool: (t: AppState["tool"]) => void;
  setPendingType: (t: MorphologyType) => void;
  exportAnnotations: () => void;
  setShowDsa: (v: boolean) => void;
  setAudibleScrub: (v: boolean) => void;
}

function defaultTrack(id: string, kind?: string): TrackState {
  return {
    id,
    mute: kind === "extra",
    solo: false,
    gain: kind === "ekg" ? 1.15 : kind === "eog" ? 1.05 : 1,
    lateralityOverride: null,
  };
}

function syncTracks(derivations: Derivation[], prev: Record<string, TrackState>) {
  const next: Record<string, TrackState> = {};
  for (const d of derivations.filter((x) => x.available)) {
    next[d.id] = prev[d.id] ?? defaultTrack(d.id, d.kind);
  }
  return next;
}

let wavUrlLocal: string | null = null;

function revoke() {
  if (wavUrlLocal) URL.revokeObjectURL(wavUrlLocal);
  wavUrlLocal = null;
}

function stubMix(eegDuration: number, timeScale: number): MixResult {
  const dur = eegDuration / Math.max(0.25, timeScale);
  return {
    left: new Float32Array(0),
    right: new Float32Array(0),
    sampleRate: 44100,
    duration: dur,
    eegDuration,
    compressionUsed: timeScale,
    peak: 0,
    clipped: false,
  };
}

function nid(): string {
  return `ann-${Math.random().toString(36).slice(2, 10)}`;
}

export function eegNow(state?: Pick<AppState, "segment" | "playheadEeg">): number {
  const s = state ?? useEegStore.getState();
  if (!s.segment) return 0;
  if (playback.duration() <= 0) return s.playheadEeg;
  return playback.currentTime();
}

export const useEegStore = create<AppState>((set, get) => {
  const liveViewCommit = () => {
    const { segment, viewDuration, followPlayhead } = get();
    if (!segment || !followPlayhead) return;
    const t = eegNow(get());
    const start = followViewStart(t, viewDuration, segment.duration);
    set({ viewStart: start, playheadEeg: t });
  };

  const pushEngine = () => {
    const { segment, tracks, combine, sonify, negativeUp, annotations } = get();
    if (!segment) {
      playback.setControlTracks([], 0);
      set({ mix: null, busy: false });
      return;
    }
    const spikes: Record<string, Float32Array> = {};
    for (const tr of segment.tracks) spikes[tr.id] = spikesForTrack(annotations, tr.id);
    const controls = controlTracksFrom(segment.tracks, tracks, combine, spikes);
    playback.setControlTracks(controls, segment.duration);
    playback.setSettings(sonify, negativeUp);
    const ts = sonify.mode === "direct" ? sonify.compression : sonify.timeScale;
    set({ mix: stubMix(segment.duration, ts), busy: false });
  };

  const liveParams = () => {
    const { segment, tracks, combine } = get();
    if (!segment) return;
    playback.applyParams(
      segment.tracks.map((p) => {
        const st = tracks[p.id];
        const lat = st?.lateralityOverride ?? p.laterality;
        return {
          id: p.id,
          pan: combine === "average" ? 0 : panForLaterality(lat),
          gain: st?.gain ?? 1,
          mute: Boolean(st?.mute),
          solo: Boolean(st?.solo),
        };
      }),
    );
  };

  const rebuildSession = () => {
    const { recording, derivations, filters, viewStart, viewDuration } = get();
    if (!recording) return;
    const total = recording.header.duration;
    const seg = processSegment(recording, 0, total, derivations, filters);
    const view = clampView(
      viewStart,
      viewDuration || Math.min(DEFAULT_VIEW_SEC, total),
      seg.duration,
    );
    // EKG remains available as a trace and manual annotation target, but its
    // heartbeat morphology is intentionally not surfaced as an auto suggestion.
    const auto = detectMorphologies(seg.tracks).filter((a) => a.type !== "qrs");
    const fromFile: Annotation[] = recording.annotations.map((a) => ({
      id: nid(),
      start: a.onset,
      end: a.onset + (a.duration ?? 0),
      trackId: null,
      type: "comment" as const,
      text: a.text,
      source: "file" as const,
      confidence: 1,
    }));
    const keepUser = get().annotations.filter((x) => x.source === "user");
    set({
      segment: seg,
      playheadEeg: Math.min(get().playheadEeg, seg.duration),
      viewStart: view.start,
      viewDuration: view.duration,
      annotations: [...keepUser, ...fromFile, ...auto],
      dsa: buildDsa(seg.tracks, seg.duration),
    });
    pushEngine();
  };

  return {
    status: "idle",
    error: null,
    recording: null,
    montage: "double-banana",
    customPairs: [],
    customA: "Fp1",
    customB: "O1",
    derivations: [],
    tracks: {},
    filters: { ...DEFAULT_FILTERS },
    sonify: { ...DEFAULT_SONIFY },
    combine: "stereo",
    negativeUp: true,
    sensitivityUv: DEFAULT_SENSITIVITY_UV,
    segment: null,
    mix: null,
    wavUrl: null,
    playing: false,
    loop: false,
    playheadEeg: 0,
    viewStart: 0,
    viewDuration: DEFAULT_VIEW_SEC,
    followPlayhead: true,
    busy: false,
    aboutOpen: false,
    keysOpen: false,
    annotations: [],
    selectedAnnotation: null,
    showAuto: true,
    showAnnotations: true,
    tool: "pointer",
    pendingType: "comment",
    showDsa: true,
    dsa: null,
    audibleScrub: false,

    loadFile: async (file, name) => {
      set({
        status: "loading",
        error: null,
        playing: false,
        busy: true,
        annotations: [],
        dsa: null,
      });
      playback.stop();
      await new Promise((r) => setTimeout(r, 16));
      try {
        const recording = await loadRecording(file, name);
        const banana = derivationsFor(recording, "double-banana", []);
        const bananaOk = banana.filter((d) => d.available);
        const montage: MontageKind = bananaOk.length >= 4 ? "double-banana" : "original";
        const derivations =
          montage === "double-banana" ? banana : derivationsFor(recording, "original", []);
        if (derivations.filter((d) => d.available).length === 0) {
          throw new Error("No EEG channels could be read from this file.");
        }
        const total = recording.header.duration;
        set({
          recording,
          montage,
          derivations,
          tracks: syncTracks(derivations, {}),
          viewStart: 0,
          viewDuration: Math.min(DEFAULT_VIEW_SEC, total),
          playheadEeg: 0,
          followPlayhead: true,
          status: "ready",
          busy: true,
        });
        await new Promise((r) => setTimeout(r, 10));
        rebuildSession();
      } catch (err) {
        set({
          status: "error",
          busy: false,
          error: err instanceof Error ? err.message : "Could not read this EDF file.",
        });
      }
    },

    setMontage: (m) => {
      const { recording, customPairs, tracks } = get();
      if (!recording) return;
      const derivations = derivationsFor(recording, m, customPairs);
      set({ montage: m, derivations, tracks: syncTracks(derivations, tracks), busy: true });
      rebuildSession();
    },

    setFilters: (p) => {
      set({ filters: { ...get().filters, ...p }, busy: true });
      rebuildSession();
    },

    setSonify: (p) => {
      const next = { ...get().sonify, ...p };
      set({ sonify: next });
      playback.setSettings(next, get().negativeUp);
      const { segment } = get();
      if (segment) {
        const ts = next.mode === "direct" ? next.compression : next.timeScale;
        set({ mix: stubMix(segment.duration, ts) });
      }
    },

    setCombine: (c) => {
      set({ combine: c });
      liveParams();
    },

    toggleMute: (id) => {
      const t = get().tracks[id];
      if (!t) return;
      set({ tracks: { ...get().tracks, [id]: { ...t, mute: !t.mute } } });
      liveParams();
    },

    toggleSolo: (id) => {
      const t = get().tracks[id];
      if (!t) return;
      set({ tracks: { ...get().tracks, [id]: { ...t, solo: !t.solo } } });
      liveParams();
    },

    soloExclusive: (id) => {
      const tracks = { ...get().tracks };
      for (const k of Object.keys(tracks)) {
        const t = tracks[k]!;
        tracks[k] = { ...t, solo: t.id === id };
      }
      set({ tracks });
      liveParams();
    },

    clearSolos: () => {
      const tracks = { ...get().tracks };
      for (const k of Object.keys(tracks)) tracks[k] = { ...tracks[k]!, solo: false };
      set({ tracks });
      liveParams();
    },

    soloHemi: (side) => {
      const { segment } = get();
      const tracks = { ...get().tracks };
      for (const tr of segment?.tracks ?? []) {
        const st = tracks[tr.id];
        if (!st) continue;
        const lat = st.lateralityOverride ?? tr.laterality;
        tracks[tr.id] = { ...st, solo: lat === side };
      }
      set({ tracks });
      liveParams();
    },

    unmuteAll: () => {
      const tracks = { ...get().tracks };
      for (const k of Object.keys(tracks)) tracks[k] = { ...tracks[k]!, mute: false, solo: false };
      set({ tracks });
      liveParams();
    },

    setGain: (id, gain) => {
      const t = get().tracks[id];
      if (!t) return;
      set({ tracks: { ...get().tracks, [id]: { ...t, gain } } });
      liveParams();
    },

    setLaterality: (id, lat) => {
      const t = get().tracks[id];
      if (!t) return;
      set({ tracks: { ...get().tracks, [id]: { ...t, lateralityOverride: lat } } });
      liveParams();
    },

    addCustomPair: () => {
      const { customA, customB, customPairs, recording, tracks } = get();
      if (!customA || !customB || customA === customB) return;
      const next: [string, string][] = [...customPairs, [customA, customB]];
      if (!recording) {
        set({ customPairs: next, montage: "custom" });
        return;
      }
      const derivations = derivationsFor(recording, "custom", next);
      set({
        customPairs: next,
        montage: "custom",
        derivations,
        tracks: syncTracks(derivations, tracks),
        busy: true,
      });
      rebuildSession();
    },

    removeCustomPair: (i) => {
      const next = get().customPairs.filter((_, idx) => idx !== i);
      const { recording, tracks } = get();
      if (!recording) {
        set({ customPairs: next });
        return;
      }
      const derivations = derivationsFor(recording, "custom", next);
      set({ customPairs: next, derivations, tracks: syncTracks(derivations, tracks), busy: true });
      rebuildSession();
    },

    setCustomAB: (a, b) => set({ customA: a, customB: b }),
    setSensitivity: (n) => set({ sensitivityUv: clampSensitivity(n) }),
    nudgeSensitivity: (dir) => set({ sensitivityUv: stepSensitivity(get().sensitivityUv, dir) }),
    fitSensitivity: () => {
      const { segment, viewStart, viewDuration } = get();
      if (!segment) return;
      set({
        sensitivityUv: fitSensitivityUv(segment.tracks, viewStart, viewStart + viewDuration),
      });
    },
    setNegativeUp: (v) => {
      set({ negativeUp: v });
      playback.setSettings(get().sonify, v);
    },
    setAboutOpen: (v) => set({ aboutOpen: v }),
    setKeysOpen: (v) => set({ keysOpen: v }),
    setShowDsa: (v) => set({ showDsa: v }),
    setAudibleScrub: (v) => set({ audibleScrub: v }),

    seekEeg: (t) => {
      const { segment } = get();
      if (!segment) {
        set({ playheadEeg: t });
        return;
      }
      const tt = Math.max(0, Math.min(segment.duration, t));
      playback.seek(tt);
      set({ playheadEeg: tt, playing: playback.playing });
    },

    togglePlay: async () => {
      if (playback.duration() <= 0) return;
      if (playback.playing) {
        playback.pause();
        liveViewCommit();
        set({ playing: false, playheadEeg: eegNow(get()) });
        return;
      }
      playback.onEnded = () => {
        if (!playback.loop) {
          set({
            playing: false,
            playheadEeg: 0,
            viewStart: get().followPlayhead ? 0 : get().viewStart,
          });
        }
      };
      await playback.play();
      set({ playing: true });
    },

    stop: () => {
      playback.stop();
      const { segment, viewDuration, followPlayhead } = get();
      const total = segment?.duration ?? 0;
      const view = followPlayhead
        ? clampView(0, viewDuration, total)
        : { start: get().viewStart, duration: viewDuration };
      set({ playing: false, playheadEeg: 0, viewStart: view.start });
    },

    setLoop: (v) => {
      playback.setLoop(v);
      set({ loop: v });
    },

    download: () => {
      const mix = playback.bounceWav(get().negativeUp);
      if (!mix || mix.left.length === 0) return;
      revoke();
      const blob = encodeWav(mix, 16);
      const url = URL.createObjectURL(blob);
      wavUrlLocal = url;
      set({ wavUrl: url });
      const a = document.createElement("a");
      a.href = url;
      a.download = "auris-sonify.wav";
      a.click();
    },

    zoomAt: (factor, anchor) => {
      const { segment, viewStart, viewDuration, followPlayhead } = get();
      if (!segment) return;
      const t = eegNow(get());
      const a = anchor ?? t;
      let next = zoomView(viewStart, viewDuration, segment.duration, factor, a);
      if (followPlayhead) {
        next = clampView(
          followViewStart(t, next.duration, segment.duration),
          next.duration,
          segment.duration,
        );
      }
      set({ viewStart: next.start, viewDuration: next.duration });
    },

    setViewDuration: (d) => {
      const { segment, followPlayhead } = get();
      if (!segment) return;
      const t = eegNow(get());
      const next = clampView(
        followPlayhead ? followViewStart(t, d, segment.duration) : get().viewStart,
        d,
        segment.duration,
      );
      set({ viewStart: next.start, viewDuration: next.duration });
    },

    setView: (start, duration, opts) => {
      const { segment } = get();
      if (!segment) return;
      const next = clampView(start, duration, segment.duration);
      set({
        viewStart: next.start,
        viewDuration: next.duration,
        followPlayhead: opts?.follow ?? false,
      });
    },

    panView: (deltaSec) => {
      const { segment, viewStart, viewDuration } = get();
      if (!segment) return;
      const next = clampView(viewStart + deltaSec, viewDuration, segment.duration);
      set({ viewStart: next.start, followPlayhead: false });
    },

    setFollow: (v) => {
      const { segment, viewDuration } = get();
      if (v && segment) {
        const t = eegNow(get());
        set({
          followPlayhead: true,
          viewStart: followViewStart(t, viewDuration, segment.duration),
        });
      } else {
        liveViewCommit();
        set({ followPlayhead: false });
      }
    },

    nudge: (deltaSec) => {
      const { segment } = get();
      if (!segment) return;
      const t = Math.max(0, Math.min(segment.duration, eegNow(get()) + deltaSec));
      get().seekEeg(t);
    },

    page: (dir) => {
      const { segment, viewStart, viewDuration } = get();
      if (!segment) return;
      const next = clampView(viewStart + dir * viewDuration, viewDuration, segment.duration);
      set({ viewStart: next.start, followPlayhead: false });
      get().seekEeg(next.start);
    },

    addAnnotation: (a) => {
      const item: Annotation = { ...a, id: nid() };
      set({
        annotations: [...get().annotations, item],
        selectedAnnotation: item.id,
        tool: "pointer",
      });
    },

    removeAnnotation: (id) => {
      set({
        annotations: get().annotations.filter((x) => x.id !== id),
        selectedAnnotation: get().selectedAnnotation === id ? null : get().selectedAnnotation,
      });
    },

    selectAnnotation: (id) => {
      set({ selectedAnnotation: id });
      const a = get().annotations.find((x) => x.id === id);
      if (a) get().seekEeg(a.start);
    },

    setShowAuto: (v) => set({ showAuto: v }),
    setShowAnnotations: (v) => set({ showAnnotations: v }),
    setTool: (t) => set({ tool: t }),
    setPendingType: (t) => set({ pendingType: t }),

    exportAnnotations: () => {
      const data = get().annotations.map((a) => ({
        start: a.start,
        end: a.end,
        type: a.type,
        text: a.text,
        track: a.trackId,
        source: a.source,
      }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "auris-annotations.json";
      a.click();
      URL.revokeObjectURL(url);
    },
  };
});

export function currentRepro(state: AppState): ReproSummary | null {
  if (!state.recording || !state.segment) return null;
  const processed = state.segment.tracks;
  const audible = [...audibleIds(Object.values(state.tracks))];
  return buildRepro({
    file: state.recording.name,
    montage: state.montage,
    labels: processed.map((t) => t.label),
    start: state.segment.start,
    duration: state.segment.duration,
    filters: state.filters,
    settings: state.sonify,
    combine: state.combine,
    audible: processed.filter((t) => audible.includes(t.id)).map((t) => t.label),
  });
}
