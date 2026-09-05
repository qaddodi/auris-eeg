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
  controlTracksFrom,
  derivationsFor,
  processSegment,
} from "@/lib/eeg/pipeline";
import { detectMorphologies } from "@/lib/eeg/patterns";
import {
  annotationHistoryRedo,
  annotationHistoryUndo,
  validateAnnotations,
} from "@/lib/eeg/annotations";
import { generateSession, renderSession } from "@/lib/sonification";
import {
  generateLoui2014Session,
  prepareLoui2014,
  type Loui2014Preparation,
} from "@/lib/sonification/loui2014";
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

export type SoundMode = "off" | "evidence" | "hybrid" | "experimental" | "musical";

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
  analysisSegment: SegmentData | null;
  evidencePreparation: Loui2014Preparation | null;
  evidenceReason: string | null;
  soundMode: SoundMode;
  setSoundMode: (mode: SoundMode) => void;
  annotationPast: Annotation[][];
  annotationFuture: Annotation[][];
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  undoAnnotations: () => void;
  redoAnnotations: () => void;
  importAnnotations: (annotations: Annotation[]) => void;
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
  exportMappingAudit: () => void;
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
    const {
      analysisSegment: segment,
      evidencePreparation,
      tracks,
      combine,
      sonify,
      soundMode,
    } = get();
    if (!segment) {
      playback.setControlTracks([], 0);
      set({ mix: null, busy: false });
      return;
    }
    const evidenceMode = soundMode === "evidence" || soundMode === "hybrid";
    playback.setSoundEnabled(
      soundMode === "experimental" || soundMode === "musical" || (evidenceMode && Boolean(evidencePreparation)),
    );
    if (evidenceMode && evidencePreparation) {
      const evidenceTrack = evidencePreparation.playback;
      const controls = controlTracksFrom([evidenceTrack], {}, "stereo", {
        [evidenceTrack.id]: new Float32Array(0),
      });
      playback.setControlTracks(controls, segment.duration);
      playback.setSettings(
        {
          ...sonify,
          mode: soundMode === "hybrid" ? "loui-hybrid" : "loui",
          timeScale: 1,
        },
        true,
      );
      set({ mix: stubMix(segment.duration, 1), busy: false });
      return;
    }
    const spikes: Record<string, Float32Array> = {};
    // Annotations and display polarity are never audio features.
    for (const tr of segment.tracks) spikes[tr.id] = new Float32Array(0);
    const controls = controlTracksFrom(segment.tracks, tracks, combine, spikes);
    playback.setControlTracks(controls, segment.duration);
    const enabled = soundMode === "experimental" || soundMode === "musical";
    playback.setSettings(enabled ? sonify : { ...sonify, mode: "contour", timeScale: 1 }, true);
    const ts = enabled
      ? sonify.mode === "direct"
        ? sonify.compression
        : sonify.timeScale
      : 1;
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
    const position = eegNow(get());
    playback.pause();
    // Display and analysis/audio are independently derived from the immutable EDF buffer.
    // A display filter change can therefore never alter analysis or sonification input.
    const analysis = processSegment(recording, 0, total, derivations, DEFAULT_FILTERS);
    const seg = processSegment(recording, 0, total, derivations, filters);
    const evidence = evidenceForRecording(recording);
    const view = clampView(
      viewStart,
      viewDuration || Math.min(DEFAULT_VIEW_SEC, total),
      seg.duration,
    );
    // EKG remains available as a trace and manual annotation target, but its
    // heartbeat morphology is intentionally not surfaced as an auto suggestion.
    const auto = get().showAuto
      ? detectMorphologies(analysis.tracks).filter((a) => a.type !== "qrs")
      : [];
    const fromFile: Annotation[] = recording.annotations.map((a, i) => ({
      id: `edf-${i}`,
      start: a.onset,
      end: a.onset + (a.duration ?? 0),
      trackId: null,
      type: "comment" as const,
      text: a.text,
      source: "file" as const,
      confidence: 1,
    }));
    const keepUser = get().annotations.filter(
      (x) => x.source !== "auto" && !x.id.startsWith("edf-"),
    );
    set({
      segment: seg,
      analysisSegment: analysis,
      evidencePreparation: evidence.preparation,
      evidenceReason: evidence.reason,
      playing: false,
      playheadEeg: Math.min(get().playheadEeg, seg.duration),
      viewStart: view.start,
      viewDuration: view.duration,
      annotations: [...keepUser, ...fromFile, ...auto],
      dsa: buildDsa(analysis.tracks, analysis.duration),
    });
    pushEngine();
    playback.seek(position);
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
    analysisSegment: null,
    evidencePreparation: null,
    evidenceReason: null,
    soundMode: "off",
    annotationPast: [],
    annotationFuture: [],
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
    showAuto: false,
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
        annotationPast: [],
        annotationFuture: [],
        selectedAnnotation: null,
        recording: null,
        segment: null,
        analysisSegment: null,
        evidencePreparation: null,
        evidenceReason: null,
        mix: null,
        derivations: [],
        tracks: {},
        dsa: null,
      });
      playback.stop();
      playback.setControlTracks([], 0);
      revoke();
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
      const next = { ...get().filters, ...p };
      const { recording, derivations } = get();
      try {
        const segment = recording ? processSegment(recording, 0, recording.header.duration, derivations, next) : null;
        set({ filters: next, segment, error: null });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Display filter could not be applied." });
      }
    },

    setSoundMode: (mode) => {
      const t = eegNow(get());
      const evidenceReady = Boolean(get().evidencePreparation);
      const soundEnabled =
        mode === "experimental" ||
        mode === "musical" ||
        ((mode === "evidence" || mode === "hybrid") && evidenceReady);
      playback.setSoundEnabled(soundEnabled);
      const sonify =
        mode === "musical"
          ? { ...get().sonify, mode: "contour" as const, quantize: true }
          : mode === "experimental"
            ? { ...get().sonify, mode: "contour" as const, quantize: false }
            : mode === "hybrid"
              ? { ...get().sonify, mode: "loui-hybrid" as const, timeScale: 1 }
              : mode === "evidence"
                ? { ...get().sonify, mode: "loui" as const, timeScale: 1 }
                : get().sonify;
      set({ soundMode: mode, sonify, playing: false, playheadEeg: t, audibleScrub: false });
      pushEngine();
      playback.seek(t);
    },

    setSonify: (p) => {
      const next = { ...get().sonify, ...p };
      set({ sonify: next });
      if (get().soundMode === "experimental" || get().soundMode === "musical") {
        playback.setSettings(next, true);
      }
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
      // Display polarity does not change auditory mapping polarity.
    },
    setAboutOpen: (v) => set({ aboutOpen: v }),
    setKeysOpen: (v) => set({ keysOpen: v }),
    setShowDsa: (v) => set({ showDsa: v }),
    setAudibleScrub: (v) =>
      set({ audibleScrub: v && ["experimental", "musical"].includes(get().soundMode) }),

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
      if (
        (get().soundMode === "evidence" || get().soundMode === "hybrid") &&
        !get().evidencePreparation
      ) {
        set({ error: get().evidenceReason ?? "The Loui 2014 mapping requires Fz and Cz." });
        return;
      }
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
            playheadEeg: get().segment?.duration ?? 0,
          });
        }
      };
      try {
        await playback.play();
        set({ playing: playback.playing, error: null });
      } catch (err) {
        set({ playing: false, error: err instanceof Error ? err.message : "Audio could not start." });
      }
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
      if (get().soundMode === "off") return;
      const state = get();
      if (!state.analysisSegment || !state.recording) return;
      if (
        (state.soundMode === "evidence" || state.soundMode === "hybrid") &&
        !state.evidencePreparation
      )
        return;
      const session = mappingSession(state);
      const rendered = renderSession(session, state.sonify.outputRate);
      if (rendered.left.length === 0) return;
      const mix: MixResult = {
        ...rendered,
        eegDuration: session.region.end - session.region.start,
        compressionUsed: 1,
      };
      revoke();
      const blob = encodeWav(mix, 16);
      const url = URL.createObjectURL(blob);
      wavUrlLocal = url;
      set({ wavUrl: url });
      const a = document.createElement("a");
      a.href = url;
      a.download = "auris-mapped-region.wav";
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
      const item = validateAnnotations([{ ...a, id: nid(), source: "user" }], { duration: get().segment?.duration ?? 0 })[0]!;
      set({ annotationPast: [...get().annotationPast.slice(-49), get().annotations], annotationFuture: [],
        annotations: [...get().annotations, item], selectedAnnotation: item.id, tool: "pointer" });
    },
    updateAnnotation: (id, patch) => {
      const old = get().annotations.find((a) => a.id === id);
      if (!old || old.source !== "user") return;
      const item = validateAnnotations([{ ...old, ...patch, id, source: "user" }], { duration: get().segment?.duration ?? 0 })[0]!;
      set({ annotationPast: [...get().annotationPast.slice(-49), get().annotations], annotationFuture: [],
        annotations: get().annotations.map((a) => a.id === id ? item : a) });
    },
    removeAnnotation: (id) => {
      if (!get().annotations.some((a) => a.id === id && a.source === "user")) return;
      set({ annotationPast: [...get().annotationPast.slice(-49), get().annotations], annotationFuture: [],
        annotations: get().annotations.filter((a) => a.id !== id), selectedAnnotation: null });
    },
    undoAnnotations: () => {
      const h = annotationHistoryUndo(get().annotationPast, get().annotations, get().annotationFuture);
      set({ annotations: h.current, annotationPast: h.past, annotationFuture: h.future, selectedAnnotation: null });
    },
    redoAnnotations: () => {
      const h = annotationHistoryRedo(get().annotationPast, get().annotations, get().annotationFuture);
      set({ annotations: h.current, annotationPast: h.past, annotationFuture: h.future, selectedAnnotation: null });
    },
    importAnnotations: (items) => {
      const imported = validateAnnotations(items, { duration: get().segment?.duration ?? 0 }).map((a) => ({ ...a, id: nid(), source: "file" as const }));
      set({ annotationPast: [...get().annotationPast.slice(-49), get().annotations], annotationFuture: [],
        annotations: [...get().annotations, ...imported] });
    },

    selectAnnotation: (id) => {
      set({ selectedAnnotation: id });
      const a = get().annotations.find((x) => x.id === id);
      if (a) get().seekEeg(a.start);
    },

    setShowAuto: (v) => {
      const existing = get().annotations.filter((a) => a.source !== "auto");
      const auto = v && get().analysisSegment ? detectMorphologies(get().analysisSegment!.tracks).filter((a) => a.type !== "qrs") : [];
      set({ showAuto: v, annotations: [...existing, ...auto] });
    },
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

    exportMappingAudit: () => {
      const state = get();
      if (!state.analysisSegment || !state.recording) return;
      if (
        (state.soundMode === "evidence" || state.soundMode === "hybrid") &&
        !state.evidencePreparation
      )
        return;
      const session = mappingSession(state);
      downloadJson(
        "auris-mapping-audit.json",
        {
          recording: state.recording.name,
          montage: state.montage,
          application: "Auris EEG",
          session,
        },
      );
    },
  };
});

function mappingSession(state: AppState) {
  if (
    (state.soundMode === "evidence" || state.soundMode === "hybrid") &&
    state.evidencePreparation
  ) {
    return generateLoui2014Session(state.evidencePreparation, {
      start: state.viewStart,
      hybrid: state.soundMode === "hybrid",
      filters: EVIDENCE_FILTERS,
      derivationSources: ["Fz", "Cz"],
    });
  }
  const sourceDerivations = Object.fromEntries(
    state.derivations.map((derivation) => [
      derivation.id,
      derivation.sources.map(
        (index) => state.recording?.header.signals[index]?.label ?? `signal-${index}`,
      ),
    ]),
  );
  const trackControls = state.analysisSegment!.tracks.map((track) => {
    const control = state.tracks[track.id];
    return {
      id: track.id,
      gain: control?.gain ?? 1,
      mute: control?.mute ?? false,
      pan: panForLaterality(control?.lateralityOverride ?? track.laterality),
    };
  });
  return generateSession(state.analysisSegment!.tracks, {
    start: state.viewStart,
    end: Math.min(state.analysisSegment!.duration, state.viewStart + state.viewDuration),
    filters: DEFAULT_FILTERS,
    mapping: state.sonify.mode === "pulse" ? "rms-pulse-v1" : "contour-v1",
    style: state.soundMode === "musical" ? "pentatonic-v1" : "plain-v1",
    trackControls,
    sourceDerivations,
  });
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function currentRepro(state: AppState): ReproSummary | null {
  if (
    !state.recording ||
    !state.analysisSegment ||
    state.soundMode === "off" ||
    ((state.soundMode === "evidence" || state.soundMode === "hybrid") &&
      !state.evidencePreparation)
  ) {
    return null;
  }
  if (
    (state.soundMode === "evidence" || state.soundMode === "hybrid") &&
    state.evidencePreparation
  ) {
    const preparation = state.evidencePreparation;
    const start = state.viewStart;
    const duration = Math.min(10, Math.max(0, preparation.source.samples.length / 256 - start));
    return {
      file: state.recording.name,
      montage: "locked Fz–Cz study-reproduction source",
      channels: ["Fz–Cz"],
      interval: `${start.toFixed(2)}–${(start + duration).toFixed(2)} s`,
      filters: [
        preparation.resampled
          ? `linear resampling ${preparation.sourceSampleRate}→256 Hz; no display filters`
          : "native 256 Hz; no display filters",
      ],
      audible: ["Fz–Cz"],
      normalization: "10 s epoch min/max linearly scaled to 1–40; every 20th 256 Hz sample",
      method:
        state.soundMode === "hybrid"
          ? "loui-2014-fz-cz-v1@1.0.0 (Level B) + loui-soft-v1@1.0.0 downstream style"
          : "loui-2014-fz-cz-v1@1.0.0 (Level B study reproduction)",
      compression: "1× source timeline; 12.8 mapped events/s",
      carrier:
        state.soundMode === "hybrid"
          ? "C-major-pentatonic pitch; disclosed soft second harmonic, pitch unchanged"
          : "C-major-pentatonic pitch; neutral sine substitutes for unavailable study patch",
      outputRate: `${state.sonify.outputRate} Hz`,
      stereo: "locked center",
    };
  }
  const processed = state.analysisSegment.tracks;
  const audible = [...audibleIds(Object.values(state.tracks))];
  const start = state.viewStart;
  const duration = Math.min(
    30,
    state.viewDuration,
    Math.max(0, state.analysisSegment.duration - start),
  );
  return {
    file: state.recording.name,
    montage: `${state.montage} · source derivations recorded in mapping audit`,
    channels: processed.map((t) => t.label),
    interval: `${start.toFixed(2)}–${(start + duration).toFixed(2)} s`,
    filters: ["DC offset removed (analysis branch)"],
    audible: processed.filter((t) => audible.includes(t.id)).map((t) => t.label),
    normalization: "per-track region max absolute amplitude; 0.25 s feature windows",
    method:
      state.soundMode === "musical"
        ? "auris:contour-v1@1.0.0 (Level X) + pentatonic-v1@1.0.0 style"
        : state.sonify.mode === "pulse"
          ? "auris:rms-pulse-v1@1.0.0 (Level X) + plain-v1@1.0.0 style"
          : "auris:contour-v1@1.0.0 (Level X) + plain-v1@1.0.0 style",
    compression: "1× event timeline; exported region capped at 30 seconds",
    carrier:
      state.sonify.mode === "pulse" && state.soundMode === "experimental"
        ? "feature RMS maps deterministically to pulse velocity"
        : "feature mean maps deterministically to 210–840 Hz",
    outputRate: `${state.sonify.outputRate} Hz`,
    stereo: state.combine,
  };
}

const EVIDENCE_FILTERS: FilterSettings = {
  bandpass: false,
  bandpassLow: 0,
  bandpassHigh: 0,
  lff: 0,
  hff: 0,
  notch60: false,
  removeDc: false,
};

function evidenceForRecording(recording: LoadedRecording): {
  preparation: Loui2014Preparation | null;
  reason: string | null;
} {
  const derivation = derivationsFor(recording, "custom", [["Fz", "Cz"]]).find(
    (candidate) => candidate.id === "custom:Fz-Cz",
  );
  if (!derivation?.available) {
    return {
      preparation: null,
      reason: "Loui 2014 study reproduction requires compatible Fz and Cz channels.",
    };
  }
  try {
    const source = processSegment(
      recording,
      0,
      recording.header.duration,
      [derivation],
      EVIDENCE_FILTERS,
    ).tracks[0];
    if (!source) throw new Error("Fz–Cz could not be derived.");
    return { preparation: prepareLoui2014(source), reason: null };
  } catch (error) {
    return {
      preparation: null,
      reason: error instanceof Error ? error.message : "Fz–Cz could not be prepared.",
    };
  }
}
