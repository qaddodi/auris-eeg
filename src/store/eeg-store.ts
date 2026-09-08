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
import { canonicalElectrode } from "@/lib/eeg/channels";
import {
  type ScreeningChannel,
} from "@/lib/eeg/abnormality/screening";
import {
  annotationToExport,
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
  buildDisplayWindow,
  displayWindowContains,
  planDisplayWindow,
  recordingDcOffsets,
} from "@/lib/eeg/display-pipeline";
import {
  reduceNavigation,
  type NavigationAction,
  type PlaybackStatus,
  type SeekIntent,
} from "@/lib/eeg/navigation";
import {
  clampView,
  DEFAULT_VIEW_SEC,
  fitSensitivityUv,
  followViewStart,
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
  dcOffsets?: Readonly<Record<string, number>>;
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
  /** Immutable, whole-record montage branch before display filters. */
  rawSegment: SegmentData | null;
  /** Prefetched, display-filtered window used only by the waveform editor. */
  displaySegment: SegmentData | null;
  displayRevision: number;
  displayLatencyMs: number | null;
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
  reviewCursorEeg: number;
  playbackStatus: PlaybackStatus;
  viewStart: number;
  viewDuration: number;
  /** When enabled, wheel/trackpad gestures pan instead of changing the time window. */
  zoomLocked: boolean;
  followPlayhead: boolean;
  manualNavigationOverride: boolean;
  hoverCursor: { timeSec: number; trackId: string | null } | null;
  busy: boolean;
  aboutOpen: boolean;
  keysOpen: boolean;
  annotations: Annotation[];
  selectedAnnotation: string | null;
  hiddenTrackIds: string[];
  showAuto: boolean;
  screeningBusy: boolean;
  showAnnotations: boolean;
  tool: "pan" | "annotate" | "caliper";
  pendingType: MorphologyType;
  showDsa: boolean;
  showDsaBands: boolean;
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
  seekEeg: (t: number, intent?: SeekIntent) => void;
  syncPlaybackPosition: () => void;
  togglePlay: () => Promise<void>;
  stop: () => void;
  setLoop: (v: boolean) => void;
  download: () => void;
  zoomAt: (factor: number, anchor?: number) => void;
  setZoomLocked: (locked: boolean) => void;
  setViewDuration: (d: number) => void;
  setView: (start: number, duration: number, opts?: { follow?: boolean; manual?: boolean }) => void;
  panView: (deltaSec: number) => void;
  setFollow: (v: boolean) => void;
  setHoverCursor: (hover: AppState["hoverCursor"]) => void;
  ensureDisplayWindow: (start?: number, duration?: number) => void;
  nudge: (deltaSec: number) => void;
  page: (dir: -1 | 1) => void;
  addAnnotation: (a: Omit<Annotation, "id">) => void;
  removeAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  nextAnnotation: (direction: -1 | 1) => void;
  setShowAuto: (v: boolean) => void;
  setShowAnnotations: (v: boolean) => void;
  setTool: (t: AppState["tool"]) => void;
  setPendingType: (t: MorphologyType) => void;
  exportAnnotations: () => void;
  exportMappingAudit: () => void;
  setShowDsa: (v: boolean) => void;
  setShowDsaBands: (v: boolean) => void;
  setAudibleScrub: (v: boolean) => void;
  toggleTrackVisibility: (id: string) => void;
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

const RAW_FILTERS: FilterSettings = {
  bandpass: false,
  bandpassLow: 0,
  bandpassHigh: 0,
  lff: 0,
  hff: 0,
  notch60: false,
  removeDc: false,
  artifactReduction: false,
  ica: false,
  spatialFilter: false,
};

const rawMontageCache = new WeakMap<ArrayBuffer, Map<string, SegmentData>>();
const analysisMontageCache = new WeakMap<ArrayBuffer, Map<string, SegmentData>>();

function montageCacheKey(montage: MontageKind, pairs: [string, string][]): string {
  return `${montage}:${pairs.map(([a, b]) => `${a}-${b}`).join("|")}`;
}

function cachedWholeRecording(
  cache: WeakMap<ArrayBuffer, Map<string, SegmentData>>,
  recording: LoadedRecording,
  key: string,
  build: () => SegmentData,
): SegmentData {
  let entries = cache.get(recording.buffer);
  if (!entries) {
    entries = new Map();
    cache.set(recording.buffer, entries);
  }
  const hit = entries.get(key);
  if (hit) return hit;
  const value = build();
  entries.set(key, value);
  return value;
}

function deterministicChannelsFor(
  segment: SegmentData,
  derivations: readonly Derivation[],
  recording: LoadedRecording,
): ScreeningChannel[] {
  const derivationById = new Map(derivations.map((derivation) => [derivation.id, derivation]));
  return segment.tracks.map((track) => {
    const derivation = derivationById.get(track.id);
    const sources = (derivation?.sources ?? [])
      .map((index) => canonicalElectrode(recording.header.signals[index]?.label ?? ""))
      .filter(Boolean);
    return {
      ...track,
      isEeg: track.kind === "eeg",
      canonical: sources.length === 1 ? sources[0] : undefined,
      sources,
      derivation,
      unit: "uV",
    };
  });
}

function screenInWorker(channels: ScreeningChannel[], durationSeconds: number): Promise<Annotation[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/deterministic-screening.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event: MessageEvent<{ annotations?: Annotation[]; error?: string }>) => {
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.annotations ?? []);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "Deterministic screening worker failed"));
    };
    worker.postMessage({ channels, durationSeconds });
  });
}

export function eegNow(state?: Pick<AppState, "segment" | "playheadEeg">): number {
  const s = state ?? useEegStore.getState();
  if (!s.segment) return 0;
  if (playback.duration() <= 0) return s.playheadEeg;
  return playback.currentTime();
}

export const useEegStore = create<AppState>((set, get) => {
  let screeningRequest = 0;
  const refreshDeterministicAnnotations = (
    segment: SegmentData,
    derivations: readonly Derivation[],
    recording: LoadedRecording,
  ) => {
    const request = ++screeningRequest;
    set({ screeningBusy: true });
    void screenInWorker(
      deterministicChannelsFor(segment, derivations, recording),
      segment.duration,
    ).then((auto) => {
      if (request !== screeningRequest || !get().showAuto) return;
      const existing = get().annotations.filter((annotation) => annotation.source !== "auto");
      set({ annotations: [...existing, ...auto], screeningBusy: false });
    }).catch(() => {
      if (request === screeningRequest) set({ screeningBusy: false });
    });
  };

  const commitNavigation = (action: NavigationAction) => {
    const s = get();
    const total = s.segment?.duration ?? s.recording?.header.duration ?? 0;
    const next = reduceNavigation(
      {
        recordingDurationSec: total,
        positionSec: s.reviewCursorEeg,
        viewport: { startSec: s.viewStart, durationSec: s.viewDuration },
        followMode: s.followPlayhead ? "following" : "manual",
        playbackStatus: s.playbackStatus,
        hover: s.hoverCursor,
        selectedAnnotationId: s.selectedAnnotation,
      },
      action,
    );
    set({
      reviewCursorEeg: next.positionSec,
      playheadEeg: next.positionSec,
      viewStart: next.viewport.startSec,
      viewDuration: next.viewport.durationSec,
      followPlayhead: next.followMode === "following",
      manualNavigationOverride: next.followMode === "manual",
      playbackStatus: next.playbackStatus,
      hoverCursor: next.hover,
      selectedAnnotation: next.selectedAnnotationId,
    });
    return next;
  };

  const refreshDisplayWindow = (
    requestedStart = get().viewStart,
    requestedDuration = get().viewDuration,
    force = false,
    filterOverride?: FilterSettings,
  ) => {
    const { rawSegment, filters } = get();
    if (!rawSegment) return;
    const activeFilters = filterOverride ?? filters;
    if (
      !force &&
      displayWindowContains(get().displaySegment, requestedStart, requestedDuration)
    ) {
      return;
    }
    const plan = planDisplayWindow(
      requestedStart,
      requestedDuration,
      rawSegment.duration,
      activeFilters,
    );
    const started = typeof performance === "undefined" ? 0 : performance.now();
    const displaySegment = buildDisplayWindow(rawSegment, plan, activeFilters);
    const elapsed = typeof performance === "undefined" ? 0 : performance.now() - started;
    set({
      displaySegment,
      displayRevision: get().displayRevision + 1,
      displayLatencyMs: elapsed,
      error: null,
    });
  };

  const liveViewCommit = () => {
    const { segment, viewDuration, followPlayhead } = get();
    if (!segment || !followPlayhead) return;
    const t = eegNow(get());
    const start = followViewStart(t, viewDuration, segment.duration);
    set({
      viewStart: start,
      playheadEeg: t,
      reviewCursorEeg: t,
      playbackStatus: playback.playing ? "playing" : "paused",
    });
    refreshDisplayWindow(start, viewDuration);
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
    const { recording, derivations, filters, viewStart, viewDuration, montage, customPairs } = get();
    if (!recording) return;
    const total = recording.header.duration;
    const position = eegNow(get());
    const wasPlaying = playback.playing;
    const key = montageCacheKey(montage, customPairs);
    // Raw, analysis/audio, and display branches are deliberately separate.
    // Whole-record montage work is cached; routine display filtering is bounded
    // to a prefetched viewport window below.
    const raw = cachedWholeRecording(rawMontageCache, recording, key, () =>
      (() => {
        const segment = processSegment(recording, 0, total, derivations, RAW_FILTERS);
        return { ...segment, dcOffsets: recordingDcOffsets(segment) };
      })(),
    );
    const analysis = cachedWholeRecording(analysisMontageCache, recording, key, () =>
      buildDisplayWindow(
        raw,
        { start: 0, duration: total, visibleStart: 0, visibleDuration: total },
        DEFAULT_FILTERS,
      ),
    );
    const priorEvidence = get().evidencePreparation || get().evidenceReason
      ? { preparation: get().evidencePreparation, reason: get().evidenceReason }
      : evidenceForRecording(recording);
    const view = clampView(
      viewStart,
      viewDuration || Math.min(DEFAULT_VIEW_SEC, total),
      total,
    );
    const display = buildDisplayWindow(
      raw,
      planDisplayWindow(view.start, view.duration, total, filters),
      filters,
    );
    // EKG remains available as a trace and manual annotation target, but its
    // heartbeat morphology is intentionally not surfaced as an auto suggestion.
    const auto: Annotation[] = [];
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
      rawSegment: raw,
      segment: analysis,
      displaySegment: display,
      displayRevision: get().displayRevision + 1,
      analysisSegment: analysis,
      evidencePreparation: priorEvidence.preparation,
      evidenceReason: priorEvidence.reason,
      playing: wasPlaying,
      playbackStatus: wasPlaying ? "playing" : get().playbackStatus,
      playheadEeg: Math.min(position, total),
      reviewCursorEeg: Math.min(position, total),
      viewStart: view.start,
      viewDuration: view.duration,
      annotations: [...keepUser, ...fromFile, ...auto],
      dsa: buildDsa(analysis.tracks, analysis.duration),
    });
    if (get().showAuto) refreshDeterministicAnnotations(raw, derivations, recording);
    pushEngine();
    playback.seek(position);
    const nav = commitNavigation({ type: "seek", positionSec: position, intent: "programmatic" });
    refreshDisplayWindow(nav.viewport.startSec, nav.viewport.durationSec);
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
    rawSegment: null,
    displaySegment: null,
    displayRevision: 0,
    displayLatencyMs: null,
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
    reviewCursorEeg: 0,
    playbackStatus: "stopped",
    viewStart: 0,
    viewDuration: DEFAULT_VIEW_SEC,
    zoomLocked: true,
    followPlayhead: true,
    manualNavigationOverride: false,
    hoverCursor: null,
    busy: false,
    aboutOpen: false,
    keysOpen: false,
    annotations: [],
    selectedAnnotation: null,
    hiddenTrackIds: [],
    showAuto: false,
    screeningBusy: false,
    showAnnotations: true,
    tool: "pan",
    pendingType: "comment",
    showDsa: true,
    showDsaBands: false,
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
        hiddenTrackIds: [],
        recording: null,
        rawSegment: null,
        displaySegment: null,
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
          reviewCursorEeg: 0,
          playbackStatus: "stopped",
          followPlayhead: true,
          manualNavigationOverride: false,
          hoverCursor: null,
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
      try {
        // Validate and render only the prefetched display window. The immutable
        // whole-record analysis/audio branch is intentionally untouched.
        refreshDisplayWindow(get().viewStart, get().viewDuration, true, next);
        set({ filters: next });
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
      // Keep the UI transport state aligned with the audio engine. Switching
      // between modes that share an enabled engine no longer creates a false
      // paused state when MixerEngine intentionally keeps playback running.
      const enginePlaying = playback.playing;
      set({
        soundMode: mode,
        sonify,
        playing: enginePlaying,
        playheadEeg: t,
        reviewCursorEeg: t,
        playbackStatus: enginePlaying ? "playing" : "paused",
        audibleScrub: false,
      });
      commitNavigation({ type: "seek", positionSec: t, intent: "programmatic" });
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
      const { segment, displaySegment, viewStart, viewDuration } = get();
      const source = displaySegment ?? segment;
      if (!source) return;
      const localStart = Math.max(0, viewStart - source.start);
      set({
        sensitivityUv: fitSensitivityUv(
          source.tracks,
          localStart,
          localStart + viewDuration,
        ),
      });
    },
    setNegativeUp: (v) => {
      set({ negativeUp: v });
      // Display polarity does not change auditory mapping polarity.
    },
    setAboutOpen: (v) => set({ aboutOpen: v }),
    setKeysOpen: (v) => set({ keysOpen: v }),
    setShowDsa: (v) => set(v ? { showDsa: v } : { showDsa: v, showDsaBands: false }),
    setShowDsaBands: (v) => set({ showDsaBands: v }),
    setZoomLocked: (locked) => set({ zoomLocked: locked }),
    setAudibleScrub: (v) =>
      set({ audibleScrub: v && ["experimental", "musical"].includes(get().soundMode) }),
    toggleTrackVisibility: (id) =>
      set((state) => ({
        hiddenTrackIds: state.hiddenTrackIds.includes(id)
          ? state.hiddenTrackIds.filter((trackId) => trackId !== id)
          : [...state.hiddenTrackIds, id],
      })),

    seekEeg: (t, intent = "user") => {
      const { segment } = get();
      if (!segment) {
        set({ playheadEeg: t, reviewCursorEeg: t });
        return;
      }
      const tt = Math.max(0, Math.min(segment.duration, t));
      playback.seek(tt);
      const nav = commitNavigation({ type: "seek", positionSec: tt, intent });
      set({ playing: playback.playing, playbackStatus: playback.playing ? "playing" : nav.playbackStatus });
      refreshDisplayWindow(nav.viewport.startSec, nav.viewport.durationSec);
    },

    syncPlaybackPosition: () => {
      if (!playback.playing) return;
      const t = eegNow(get());
      const nav = commitNavigation({ type: "playback-tick", positionSec: t });
      refreshDisplayWindow(nav.viewport.startSec, nav.viewport.durationSec);
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
        const t = eegNow(get());
        commitNavigation({ type: "pause", positionSec: t });
        set({ playing: false, playheadEeg: t, reviewCursorEeg: t, playbackStatus: "paused" });
        return;
      }
      playback.onEnded = () => {
        if (!playback.loop) {
          commitNavigation({ type: "playback-end" });
          set({ playing: false, playbackStatus: "ended" });
          refreshDisplayWindow();
        }
      };
      try {
        await playback.play();
        commitNavigation({ type: "play", positionSec: playback.currentTime() });
        set({ playing: playback.playing, playbackStatus: "playing", error: null });
      } catch (err) {
        set({ playing: false, playbackStatus: "paused", error: err instanceof Error ? err.message : "Audio could not start." });
      }
    },

    stop: () => {
      playback.stop();
      if (!get().segment) {
        set({ playing: false, playheadEeg: 0, reviewCursorEeg: 0, playbackStatus: "stopped" });
        return;
      }
      const nav = commitNavigation({ type: "stop" });
      set({ playing: false, playbackStatus: "stopped" });
      refreshDisplayWindow(nav.viewport.startSec, nav.viewport.durationSec);
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
      const { segment } = get();
      if (!segment) return;
      const t = eegNow(get());
      commitNavigation({ type: "playback-tick", positionSec: t });
      const next = commitNavigation({ type: "zoom", factor, anchorSec: anchor ?? t });
      refreshDisplayWindow(next.viewport.startSec, next.viewport.durationSec);
    },

    setViewDuration: (d) => {
      const { segment } = get();
      if (!segment) return;
      const t = eegNow(get());
      commitNavigation({ type: "playback-tick", positionSec: t });
      const next = commitNavigation({ type: "set-view-duration", durationSec: d });
      refreshDisplayWindow(next.viewport.startSec, next.viewport.durationSec);
    },

    setView: (start, duration, opts) => {
      const { segment } = get();
      if (!segment) return;
      const manual = opts?.manual ?? opts?.follow !== true;
      const next = commitNavigation({
        type: "set-view",
        startSec: start,
        durationSec: duration,
        intent: opts?.follow === true ? "programmatic" : manual ? "manual" : "programmatic",
      });
      if (opts?.follow === true) {
        const followed = commitNavigation({ type: "set-follow", enabled: true });
        refreshDisplayWindow(followed.viewport.startSec, followed.viewport.durationSec);
      } else {
        refreshDisplayWindow(next.viewport.startSec, next.viewport.durationSec);
      }
    },

    panView: (deltaSec) => {
      const { segment } = get();
      if (!segment) return;
      const next = commitNavigation({ type: "pan", deltaSec });
      refreshDisplayWindow(next.viewport.startSec, next.viewport.durationSec);
    },

    setFollow: (v) => {
      const { segment } = get();
      if (v && segment) {
        const t = eegNow(get());
        const next = commitNavigation({ type: "seek", positionSec: t, intent: "programmatic" });
        set({ followPlayhead: true, manualNavigationOverride: false });
        refreshDisplayWindow(next.viewport.startSec, next.viewport.durationSec);
      } else {
        if (!segment) {
          set({ followPlayhead: false, manualNavigationOverride: true });
          return;
        }
        liveViewCommit();
        const next = commitNavigation({ type: "set-follow", enabled: false });
        set({ followPlayhead: false, manualNavigationOverride: true });
        refreshDisplayWindow(next.viewport.startSec, next.viewport.durationSec);
      }
    },

    setHoverCursor: (hover) => {
      commitNavigation({ type: "set-hover", hover });
    },

    ensureDisplayWindow: (start, duration) => {
      refreshDisplayWindow(start ?? get().viewStart, duration ?? get().viewDuration);
    },

    nudge: (deltaSec) => {
      const { segment } = get();
      if (!segment) return;
      const t = Math.max(0, Math.min(segment.duration, eegNow(get()) + deltaSec));
      get().seekEeg(t);
    },

    page: (dir) => {
      const state = get();
      const { segment } = state;
      if (!segment) return;
      // Paging is viewport navigation only. Keep the review/playback cursor
      // untouched so the toolbar arrows never seek the recording.
      const total = segment.duration;
      const next = reduceNavigation(
        {
          recordingDurationSec: total,
          positionSec: state.reviewCursorEeg,
          viewport: { startSec: state.viewStart, durationSec: state.viewDuration },
          followMode: state.followPlayhead ? "following" : "manual",
          playbackStatus: state.playbackStatus,
          hover: state.hoverCursor,
          selectedAnnotationId: state.selectedAnnotation,
        },
        { type: "page", direction: dir },
      );
      set({
        viewStart: next.viewport.startSec,
        viewDuration: next.viewport.durationSec,
        followPlayhead: next.followMode === "following",
        manualNavigationOverride: next.followMode === "manual",
      });
      refreshDisplayWindow(next.viewport.startSec, next.viewport.durationSec);
    },

    addAnnotation: (a) => {
      const item = validateAnnotations([{ ...a, id: nid(), source: "user" }], { duration: get().segment?.duration ?? 0 })[0]!;
      set({ annotationPast: [...get().annotationPast.slice(-49), get().annotations], annotationFuture: [],
        annotations: [...get().annotations, item], selectedAnnotation: item.id, tool: "pan" });
      get().selectAnnotation(item.id);
    },
    updateAnnotation: (id, patch) => {
      const old = get().annotations.find((a) => a.id === id);
      if (!old || old.source !== "user") return;
      const item = validateAnnotations([{ ...old, ...patch, id, source: "user" }], { duration: get().segment?.duration ?? 0 })[0]!;
      set({ annotationPast: [...get().annotationPast.slice(-49), get().annotations], annotationFuture: [],
        annotations: get().annotations.map((a) => a.id === id ? item : a) });
      if (get().selectedAnnotation === id) get().selectAnnotation(id);
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
      const a = get().annotations.find((x) => x.id === id);
      if (!a) {
        set({ selectedAnnotation: null });
        return;
      }
      playback.seek(a.start);
      const nav = commitNavigation({
        type: "select-annotation",
        id: a.id,
        startSec: a.start,
        endSec: a.end,
      });
      refreshDisplayWindow(nav.viewport.startSec, nav.viewport.durationSec);
    },

    nextAnnotation: (direction) => {
      const eligible = get().annotations
        .filter((a) => a.source !== "auto" || (get().showAuto && a.type !== "qrs"))
        .sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
      if (eligible.length === 0) return;
      const selected = get().selectedAnnotation;
      const selectedIndex = selected ? eligible.findIndex((a) => a.id === selected) : -1;
      let index: number;
      if (selectedIndex >= 0) {
        index = (selectedIndex + direction + eligible.length) % eligible.length;
      } else {
        const cursor = get().reviewCursorEeg;
        if (direction > 0) index = eligible.findIndex((a) => a.start > cursor + 1e-6);
        else {
          index = eligible.length - 1;
          for (let i = eligible.length - 1; i >= 0; i--) {
            if (eligible[i]!.start < cursor - 1e-6) {
              index = i;
              break;
            }
          }
        }
        if (index < 0) index = 0;
      }
      get().selectAnnotation(eligible[index]!.id);
    },

    setShowAuto: (v) => {
      screeningRequest += 1;
      const existing = get().annotations.filter((a) => a.source !== "auto");
      const state = get();
      set({ showAuto: v, screeningBusy: false, annotations: existing });
      if (v && state.rawSegment && state.recording) {
        refreshDeterministicAnnotations(state.rawSegment, state.derivations, state.recording);
      }
    },
    setShowAnnotations: (v) => set({ showAnnotations: v }),
    setTool: (t) => set({ tool: t }),
    setPendingType: (t) => set({ pendingType: t }),

    exportAnnotations: () => {
      const data = get().annotations.map(annotationToExport);
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
  artifactReduction: false,
  ica: false,
  spatialFilter: false,
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
