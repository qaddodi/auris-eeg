"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { audibleIds } from "@/lib/eeg/pipeline";
import type { Annotation, ProcessedTrack, TrackState } from "@/lib/eeg/types";
import { playback } from "@/lib/eeg/audio";
import {
  clamp,
  followViewStart,
  timeAtFraction,
} from "@/lib/eeg/view";
import { MORPH_COLOR } from "@/lib/eeg/defaults";
import { displayScaleForChannel } from "@/lib/eeg/display";
import { CSS_PX_PER_MM, nominalMmForVoltage } from "@/lib/eeg/display-geometry";
import { hitTestAnnotations, layoutAnnotations } from "@/lib/eeg/annotation-layout";
import {
  cachedEkgDisplayProfile,
  envelopeWhiskers,
  envelopeTraceWindow,
  mapTraceWindow,
  representativeEnvelopePoints,
  traceWindow,
  waveformInvalidationKey,
  type TraceWindow,
} from "@/lib/eeg/rendering";
import { stableTraceColor } from "@/lib/eeg/colors";
import { dsaRgb, dsaUnit, type DsaFrame } from "@/lib/eeg/spectrum";
import { eegNow, useEegStore } from "@/store/eeg-store";

const GUTTER = 132;
const RULER = 18;
const OVERVIEW_H = 72;
const DSA_H = 112;
const DSA_LEFT = 34;
const DSA_RIGHT = 82;
const DSA_TOP = 14;
const DSA_BOTTOM = 17;
const EVENT_LANE = 18;

/** Keep the montage's related derivations together without hiding any valid
 * clinical channels. Auxiliary channels form a separate visual band and EKG
 * is always the final lane, matching the way clinicians scan a tracing. */
const DISPLAY_KIND_ORDER: Record<ProcessedTrack["kind"], number> = {
  eeg: 0,
  eog: 1,
  emg: 1,
  dc: 1,
  other: 1,
  extra: 3,
  ekg: 2,
};

function orderedDisplayTracks(tracks: ProcessedTrack[]): ProcessedTrack[] {
  // Derivations are created in the montage's clinical order. Keep that order
  // for EEG tracks (especially the Natus-style double-banana chains) instead
  // of sorting by the first electrode, which interleaves separate chains.
  // Auxiliary channels are still grouped after EEG and EKG remains last.
  return tracks
    .map((track, index) => ({ track, index }))
    .sort((a, b) => {
      const kind = DISPLAY_KIND_ORDER[a.track.kind] - DISPLAY_KIND_ORDER[b.track.kind];
      if (kind !== 0) return kind;
      return a.index - b.index;
    })
    .map(({ track }) => track);
}

interface LaneRect {
  top: number;
  height: number;
}

function laneGroup(track: ProcessedTrack, index: number, list: ProcessedTrack[]): string {
  if (track.kind === "ekg") return "ekg";
  if (track.kind !== "eeg") return `aux:${track.kind}`;
  if (!track.id.startsWith("banana:")) return "eeg";
  const bananaIndex = list.findIndex((candidate) => candidate.id === track.id);
  // The double-banana definition is five four-channel chains, with a
  // two-channel midline chain in the middle.
  if (bananaIndex < 4) return "banana:left-temporal";
  if (bananaIndex < 8) return "banana:left-parasagittal";
  if (bananaIndex < 10) return "banana:midline";
  if (bananaIndex < 14) return "banana:right-parasagittal";
  return "banana:right-temporal";
}

function laneLayout(list: ProcessedTrack[], plotHeight: number): LaneRect[] {
  const count = list.length;
  if (count === 0) return [];
  const boundaries = list.reduce(
    (total, track, index) =>
      index > 0 && laneGroup(list[index - 1]!, index - 1, list) !== laneGroup(track, index, list)
        ? total + 1
        : total,
    0,
  );
  // Preserve usable trace height even in compact views while making clinical
  // chain boundaries visibly larger than ordinary lane separators.
  const gap = boundaries > 0 ? Math.min(10, Math.max(3, plotHeight / (count * 8))) : 0;
  const laneHeight = Math.max(1, (plotHeight - boundaries * gap) / count);
  let top = 0;
  return list.map((track, index) => {
    const rect = { top, height: laneHeight };
    top += laneHeight;
    if (index < count - 1 && laneGroup(track, index, list) !== laneGroup(list[index + 1]!, index + 1, list)) {
      top += gap;
    }
    return rect;
  });
}

function laneAtY(list: ProcessedTrack[], plotHeight: number, y: number): number {
  const lanes = laneLayout(list, plotHeight);
  return lanes.findIndex((lane) => y >= lane.top && y <= lane.top + lane.height);
}

function displayBand(track: ProcessedTrack): "eeg" | "aux" | "ekg" {
  if (track.kind === "ekg") return "ekg";
  if (track.kind === "eeg") return "eeg";
  return "aux";
}

function traceWeight(hovered: boolean): number {
  return hovered ? 1.1 : 1;
}

function sizeCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number, dpr: number) {
  const w = Math.max(1, Math.floor(cssW * dpr));
  const h = Math.max(1, Math.floor(cssH * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
  }
}

function clearWaveformCanvas(ctx: CanvasRenderingContext2D, cssW: number, cssH: number, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#07080a";
  ctx.fillRect(0, 0, cssW, cssH);
}

function drawNativeTrace(
  ctx: CanvasRenderingContext2D,
  window: Extract<TraceWindow, { mode: "native" }>,
  sampleRate: number,
  x0: number,
  span: number,
  viewStart: number,
  plotW: number,
  mid: number,
  scale: number,
  sign: number,
  offset = 0,
) {
  ctx.beginPath();
  for (let p = 0; p < window.values.length; p++) {
    const sampleTime = window.indices[p]! / sampleRate;
    const xx = x0 + ((sampleTime - viewStart) / span) * plotW;
    const yy = mid + sign * (window.values[p]! - offset) * scale;
    if (p === 0) ctx.moveTo(xx, yy);
    else ctx.lineTo(xx, yy);
  }
  ctx.stroke();
}

function drawLane(
  ctx: CanvasRenderingContext2D,
  trace: TraceWindow,
  x0: number,
  viewStart: number,
  span: number,
  plotW: number,
  mid: number,
  scale: number,
  sign: number,
  color: string,
  alpha: number,
  offset = 0,
  weight = 1,
  sampleRate = 1,
) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  // Clinical traces benefit from a restrained, crisp stroke. Rounded caps on
  // every extrema bar made dense views look like filled ink.
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.lineWidth = Math.max(0.8, 0.95 * weight);
  if (trace.mode === "native") {
    drawNativeTrace(ctx, trace, sampleRate, x0, span, viewStart, plotW, mid, scale, sign, offset);
    ctx.globalAlpha = 1;
    return;
  }
  // Keep a normal-weight continuous first/last morphology trace. Extrema are
  // rendered as restrained source-positioned whiskers below so dense periodic
  // signals do not become an opaque saturated block.
  ctx.beginPath();
  for (let p = 0; p < trace.min.length; p++) {
    const points = representativeEnvelopePoints(trace, p, plotW);
    for (const point of points) {
      const y = mid + sign * (point.value - offset) * scale;
      if (p === 0 && point === points[0]) ctx.moveTo(x0 + point.x, y);
      else ctx.lineTo(x0 + point.x, y);
    }
  }
  ctx.stroke();

  // A low-alpha whisker at each source-positioned extremum preserves brief
  // transients without drawing a fully connected min/max envelope.
  ctx.globalAlpha = alpha * 0.28;
  ctx.lineWidth = Math.max(0.7, 0.8 * weight);
  ctx.beginPath();
  for (let p = 0; p < trace.min.length; p++) {
    for (const whisker of envelopeWhiskers(trace, p, plotW)) {
      ctx.moveTo(x0 + whisker.x, mid + sign * (whisker.from - offset) * scale);
      ctx.lineTo(x0 + whisker.x, mid + sign * (whisker.to - offset) * scale);
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function formatTick(t: number, span: number): string {
  if (span < 4) {
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return `${m}:${s.toFixed(1).padStart(4, "0")}`;
  }
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function niceStep(span: number): number {
  if (span <= 2) return 0.2;
  if (span <= 5) return 0.5;
  if (span <= 12) return 1;
  if (span <= 30) return 2;
  if (span <= 90) return 5;
  if (span <= 180) return 10;
  if (span <= 600) return 30;
  return 60;
}

export function WaveformView() {
  const overviewRef = useRef<HTMLCanvasElement>(null);
  const overviewOverlayRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const dsaRef = useRef<HTMLCanvasElement>(null);
  const dsaOverlayRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const overviewWrapRef = useRef<HTMLDivElement>(null);
  const dsaWrapRef = useRef<HTMLDivElement>(null);
  const hoveredTrackRef = useRef<string | null>(null);
  const dragRef = useRef<null | {
    kind:
      | "seek"
      | "pan"
      | "editor-pan"
      | "resize-l"
      | "resize-r"
      | "scrub"
      | "caliper"
      | "ann"
      | "dsa-pan"
      | "dsa-resize-l"
      | "dsa-resize-r"
      | "dsa-seek";
    x0: number;
    start0: number;
    dur0: number;
    /** Time under the pointer when a pan gesture began; used for click-to-seek. */
    clickTime?: number;
    /** Set once the pointer has moved far enough to be considered a drag. */
    moved?: boolean;
  }>(null);
  const caliperRef = useRef<{ a: number; b: number; trackId: string | null } | null>(null);
  const paintRef = useRef<() => void>(() => {});

  const segment = useEegStore((s) => s.segment);
  const displaySegment = useEegStore((s) => s.displaySegment);
  const status = useEegStore((s) => s.status);
  const busy = useEegStore((s) => s.busy);
  const seekEeg = useEegStore((s) => s.seekEeg);
  const setView = useEegStore((s) => s.setView);
  const panView = useEegStore((s) => s.panView);
  const zoomAt = useEegStore((s) => s.zoomAt);
  const showDsa = useEegStore((s) => s.showDsa);
  const viewDuration = useEegStore((s) => s.viewDuration);

  useEffect(() => {
    const editor = editorRef.current;
    const overlay = overlayRef.current;
    const overview = overviewRef.current;
    const ovOverlay = overviewOverlayRef.current;
    const dsa = dsaRef.current;
    const dsaOv = dsaOverlayRef.current;
    const wrap = wrapRef.current;
    const surface = surfaceRef.current;
    const ovWrap = overviewWrapRef.current;
    const dsaWrap = dsaWrapRef.current;
    if (
      !editor ||
      !overlay ||
      !overview ||
      !ovOverlay ||
      !wrap ||
      !surface ||
      !ovWrap ||
      !dsa ||
      !dsaOv ||
      !dsaWrap
    )
      return;

    let raf = 0;
    let looping = false;
    let waveSig = "";
    let ovSig = "";
    let dsaSig = "";
    let segmentRef: object | null = null;

    const paint = () => {
      const s = useEegStore.getState();
      let editorSegment = s.displaySegment;
      const overviewList = orderedDisplayTracks(
        (s.segment?.tracks ?? []).filter((t) => t.kind !== "extra"),
      );
      const total = s.segment?.duration ?? 0;
      const t = eegNow(s);
      const follow = s.followPlayhead && playback.playing;
      const viewDur = s.viewDuration;
      const viewStart = follow && total > 0 ? followViewStart(t, viewDur, total) : s.viewStart;
      const viewEnd = viewStart + viewDur;
      const displayEnd = (editorSegment?.start ?? 0) + (editorSegment?.duration ?? 0);
      if (
        s.rawSegment &&
        (!editorSegment || viewStart < editorSegment.start || viewEnd > displayEnd)
      ) {
        s.ensureDisplayWindow(viewStart, viewDur);
        // The store refresh is synchronous, but the local state snapshot is
        // not. Re-read it before painting so a newly selected 60s page never
        // renders the previous 20s buffer into the uncovered tail.
        editorSegment = useEegStore.getState().displaySegment;
      }
      const editorReady = Boolean(
        editorSegment &&
          viewStart >= editorSegment.start - 1e-6 &&
          viewEnd <= editorSegment.start + editorSegment.duration + 1e-6,
      );
      const editorList = editorReady
        ? orderedDisplayTracks(
            (editorSegment?.tracks ?? []).filter(
              (t) => t.kind !== "extra",
            ),
          )
        : [];
      const displayStart = editorSegment?.start ?? 0;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = surface.clientWidth;
      const cssH = wrap.clientHeight;
      const ovW = ovWrap.clientWidth;
      const ovH = ovWrap.clientHeight;
      const dsaW = dsaWrap.clientWidth;
      const dsaH = dsaWrap.clientHeight;

      if (cssW >= 8 && cssH >= 8) {
        sizeCanvas(editor, cssW, cssH, dpr);
        sizeCanvas(overlay, cssW, cssH, dpr);
        const ectx = editor.getContext("2d");
        const octx = overlay.getContext("2d");
        if (ectx && octx) {
          // A new processed segment means new waveform data even when its
          // duration/channel count are unchanged (for example a montage or
          // LFF/HFF/notch change). Object identity is the local data revision;
          // the DPR is included because resizing a canvas clears its bitmap.
          if (editorSegment !== segmentRef) {
            segmentRef = editorSegment;
            waveSig = "";
            ovSig = "";
            dsaSig = "";
          }
          const sig = waveformInvalidationKey({
            dataRevision: s.segment,
            trackIds: editorList.map((track) => `${track.id}:${track.sampleRate}`),
            viewStart: Number(viewStart.toFixed(4)),
            viewDuration: Number(viewDur.toFixed(4)),
            sensitivityUv: s.sensitivityUv,
            negativeUp: s.negativeUp,
            width: cssW,
            height: cssH,
            dpr,
            trackStateKey: Object.values(s.tracks)
              .map((tr) => `${tr.id}:${tr.mute ? 1 : 0}${tr.solo ? 1 : 0}`)
              .join(",") + `|hidden:${s.hiddenTrackIds.join(",")}`,
          });
          if (sig !== waveSig && editorReady) {
            waveSig = sig;
            drawEditor(
              ectx,
              cssW,
              cssH,
              editorList,
              s,
              viewStart,
              viewEnd,
              displayStart,
              hoveredTrackRef.current,
            );
          }
          drawEditorOverlay(
            octx,
            cssW,
            cssH,
            t,
            viewStart,
            viewDur,
            total,
            s.annotations,
            s.showAuto,
            s.selectedAnnotation,
            caliperRef.current,
            s.showAnnotations,
            editorList,
            displayStart,
            s.focusedTrackIds,
            s.hoverCursor,
            laneLayout(editorList, Math.max(1, cssH - RULER)),
          );
          if (!editorReady && waveSig !== "waiting-for-display-window") {
            clearWaveformCanvas(ectx, cssW, cssH, dpr);
            waveSig = "waiting-for-display-window";
          }
        }
      }

      if (ovW >= 8 && ovH >= 8) {
        sizeCanvas(overview, ovW, ovH, dpr);
        sizeCanvas(ovOverlay, ovW, ovH, dpr);
        const ctx = overview.getContext("2d");
        const octx = ovOverlay.getContext("2d");
        if (ctx && octx) {
          const osig = waveformInvalidationKey({
            dataRevision: s.segment,
            trackIds: overviewList.map((track) => `${track.id}:${track.sampleRate}`),
            viewStart: 0,
            viewDuration: total,
            sensitivityUv: s.sensitivityUv,
            negativeUp: s.negativeUp,
            width: ovW,
            height: ovH,
            dpr,
            trackStateKey: `overview|hidden:${s.hiddenTrackIds.join(",")}`,
          });
          if (osig !== ovSig) {
            ovSig = osig;
            drawOverviewWaves(ctx, ovW, ovH, overviewList, s, total);
          }
          drawOverviewOverlay(
            octx,
            ovW,
            ovH,
            t,
            viewStart,
            viewDur,
            total,
            s.annotations,
            s.showAuto,
            s.showAnnotations,
          );
        }
      }

      if (s.showDsa && dsaW >= 8 && dsaH >= 8) {
        sizeCanvas(dsa, dsaW, dsaH, dpr);
        sizeCanvas(dsaOv, dsaW, dsaH, dpr);
        const ctx = dsa.getContext("2d");
        const octx = dsaOv.getContext("2d");
        if (ctx && octx) {
          const sig = `${s.dsa?.nTime ?? 0}|${s.dsa?.dbMin ?? 0}|${s.dsa?.dbMax ?? 0}|${dsaW}|${dsaH}`;
          if (sig !== dsaSig) {
            dsaSig = sig;
            drawDsa(ctx, dsa, dsaW, dsaH, s.dsa);
          }
          drawDsaOverlay(octx, dsaW, dsaH, t, viewStart, viewDur, total);
        }
      }
    };

    const loop = () => {
      // Keep the store's review cursor and bounded display window synchronized
      // with the audio clock while follow mode is active.
      useEegStore.getState().syncPlaybackPosition();
      paint();
      if (playback.playing) {
        raf = requestAnimationFrame(loop);
      } else {
        looping = false;
        raf = 0;
      }
    };

    const ensureLoop = () => {
      if (looping || !playback.playing) return;
      looping = true;
      raf = requestAnimationFrame(loop);
    };

    paint();
    paintRef.current = paint;
    const unsub = useEegStore.subscribe((s) => {
      if (s.playing) ensureLoop();
      else paint();
    });
    const ro = new ResizeObserver(() => {
      waveSig = "";
      ovSig = "";
      dsaSig = "";
      paint();
    });
    ro.observe(wrap);
    ro.observe(ovWrap);
    ro.observe(dsaWrap);
    return () => {
      looping = false;
      cancelAnimationFrame(raf);
      unsub();
      ro.disconnect();
    };
  }, []);

  const onEditorPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!segment || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const surface = surfaceRef.current;
    if (!surface) return;
    const plotW = surface.clientWidth - GUTTER;
    const contentX = e.clientX - rect.left + wrapRef.current.scrollLeft;
    const x = contentX - GUTTER;
    if (x < 0) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const s = useEegStore.getState();
    if (s.followPlayhead) s.setFollow(false);
    const latest = useEegStore.getState();
    const vs = latest.viewStart;
    const frac = clamp(x / Math.max(1, plotW), 0, 1);
    const t = timeAtFraction(frac, vs, s.viewDuration);
    const pointerTracks = orderedDisplayTracks(
      (latest.displaySegment?.tracks ?? latest.segment?.tracks ?? []).filter(
        (track) => track.kind !== "extra",
      ),
    );
    const laneIds = pointerTracks.map((track) => track.id);
    const lanes = laneLayout(pointerTracks, Math.max(1, rect.height - RULER));
    const laneH = Math.max(1, (rect.height - RULER) / Math.max(1, laneIds.length));
    const y = e.clientY - rect.top;
    const annotationCandidates = latest.showAnnotations
      ? latest.annotations.filter(
          (annotation) =>
            annotation.source !== "auto" || (latest.showAuto && annotation.type !== "qrs"),
        )
      : [];
    const annotationId = hitTestAnnotations(
      annotationCandidates,
      contentX,
      y,
      {
        viewStart: vs,
        viewDuration: latest.viewDuration,
        plotX: GUTTER,
        plotWidth: plotW,
        plotTop: RULER,
        laneHeight: laneH,
        laneRects: lanes,
        laneIds,
        eventRailHeight: EVENT_LANE,
      },
    );
    if (annotationId && latest.tool === "pointer") {
      latest.selectAnnotation(annotationId);
      return;
    }
    // The pan tool is deliberately separate from pointer/scrub: dragging the
    // trace moves the review window without changing the EEG cursor.
    if ((s.tool as string) === "pan") {
      dragRef.current = {
        kind: "editor-pan",
        x0: e.clientX,
        start0: vs,
        dur0: s.viewDuration,
        clickTime: t,
        moved: false,
      };
      return;
    }
    if (s.tool === "annotate") {
      s.addAnnotation({
        start: t,
        end: t,
        trackId: null,
        type: s.pendingType,
        text: "",
        source: "user",
        confidence: 1,
      });
      return;
    }
    if (s.tool === "caliper") {
      const lane = y >= RULER ? laneAtY(pointerTracks, Math.max(1, rect.height - RULER), y - RULER) : -1;
      dragRef.current = { kind: "caliper", x0: e.clientX, start0: t, dur0: 0 };
      caliperRef.current = { a: t, b: t, trackId: laneIds[lane] ?? null };
      paintRef.current();
      return;
    }
    seekEeg(t, "user");
    dragRef.current = { kind: "scrub", x0: e.clientX, start0: vs, dur0: s.viewDuration };
    if (s.audibleScrub) playback.scrubAt(t, 0);
  };

  const onOverviewPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!segment || !overviewWrapRef.current) return;
    const rect = overviewWrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    const frac = clamp(x / Math.max(1, w), 0, 1);
    const tClick = frac * segment.duration;
    const s = useEegStore.getState();
    if (s.followPlayhead) s.setFollow(false);
    const follow = s.followPlayhead && playback.playing;
    const vs = follow ? followViewStart(eegNow(s), s.viewDuration, segment.duration) : s.viewStart;
    const vd = s.viewDuration;
    const x0 = (vs / segment.duration) * w;
    const x1 = ((vs + vd) / segment.duration) * w;
    const edge = 6;
    let kind: "seek" | "pan" | "resize-l" | "resize-r" = "seek";
    if (Math.abs(x - x0) <= edge) kind = "resize-l";
    else if (Math.abs(x - x1) <= edge) kind = "resize-r";
    else if (x >= x0 && x <= x1) kind = "pan";
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { kind, x0: e.clientX, start0: vs, dur0: vd };
    if (kind === "seek") seekEeg(tClick);
  };

  const onDsaPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!segment || !dsaWrapRef.current) return;
    const rect = dsaWrapRef.current.getBoundingClientRect();
    const plotW = Math.max(1, rect.width - DSA_LEFT - DSA_RIGHT);
    const x = e.clientX - rect.left - DSA_LEFT;
    const frac = clamp(x / plotW, 0, 1);
    const s = useEegStore.getState();
    const follow = s.followPlayhead && playback.playing;
    const vs = follow ? followViewStart(eegNow(s), s.viewDuration, segment.duration) : s.viewStart;
    const vd = s.viewDuration;
    const x0 = (vs / segment.duration) * plotW;
    const x1 = ((vs + vd) / segment.duration) * plotW;
    const edge = 8;
    let kind: "dsa-pan" | "dsa-resize-l" | "dsa-resize-r" | "dsa-seek" = "dsa-seek";
    if (Math.abs(x - x0) <= edge) kind = "dsa-resize-l";
    else if (Math.abs(x - x1) <= edge) kind = "dsa-resize-r";
    else if (x >= x0 && x <= x1) kind = "dsa-pan";
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { kind, x0: e.clientX, start0: vs, dur0: vd };
    if (s.followPlayhead) s.setFollow(false);
    if (kind === "dsa-seek") {
      seekEeg(frac * segment.duration);
      if (s.audibleScrub) playback.scrubAt(frac * segment.duration, 0);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!segment) return;
    if (!drag) {
      const rect = wrapRef.current?.getBoundingClientRect();
      const state = useEegStore.getState();
      const list = orderedDisplayTracks(
        (state.displaySegment?.tracks ?? state.segment?.tracks ?? []).filter(
          (track) => track.kind !== "extra",
        ),
      );
      const contentX = rect ? e.clientX - rect.left + (wrapRef.current?.scrollLeft ?? 0) : 0;
      if (rect && contentX >= GUTTER && list.length > 0) {
        const plotW = Math.max(1, (surfaceRef.current?.clientWidth ?? rect.width) - GUTTER);
        const lane = laneAtY(
          list,
          Math.max(1, rect.height - RULER),
          e.clientY - rect.top - RULER,
        );
        const next = list[lane]?.id ?? null;
        const frac = clamp((e.clientX - rect.left + (wrapRef.current?.scrollLeft ?? 0) - GUTTER) / plotW, 0, 1);
        const timeSec = timeAtFraction(frac, state.viewStart, state.viewDuration);
        const hover = { timeSec, trackId: next };
        if (
          next !== hoveredTrackRef.current ||
          !state.hoverCursor ||
          Math.abs(state.hoverCursor.timeSec - timeSec) > 1e-4
        ) {
          hoveredTrackRef.current = next;
          state.setHoverCursor(hover);
          paintRef.current();
        }
      }
      return;
    }
    const s = useEegStore.getState();
    if (drag.kind === "caliper" && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const plotW = Math.max(1, (surfaceRef.current?.clientWidth ?? rect.width) - GUTTER);
      const x = e.clientX - rect.left + wrapRef.current.scrollLeft - GUTTER;
      const frac = clamp(x / plotW, 0, 1);
      const follow = s.followPlayhead && playback.playing;
      const vs = follow
        ? followViewStart(eegNow(s), s.viewDuration, segment.duration)
        : s.viewStart;
      caliperRef.current = {
        a: drag.start0,
        b: timeAtFraction(frac, vs, s.viewDuration),
        trackId: caliperRef.current?.trackId ?? null,
      };
      paintRef.current();
      return;
    }
    if (drag.kind === "scrub" && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const plotW = Math.max(1, (surfaceRef.current?.clientWidth ?? rect.width) - GUTTER);
      const x = e.clientX - rect.left + wrapRef.current.scrollLeft - GUTTER;
      const frac = clamp(x / plotW, 0, 1);
      const follow = s.followPlayhead && playback.playing;
      const vs = follow
        ? followViewStart(eegNow(s), s.viewDuration, segment.duration)
        : s.viewStart;
      const next = timeAtFraction(frac, vs, s.viewDuration);
      seekEeg(next);
      if (s.audibleScrub) playback.scrubAt(next, e.clientX - drag.x0);
      return;
    }
    if (drag.kind === "editor-pan" && wrapRef.current) {
      // A pan-tool click should seek, but a real drag should only move the
      // viewport. Ignore the small pointer jitter that commonly occurs
      // between pointerdown and pointerup on a click.
      if (!drag.moved) {
        const dx = e.clientX - drag.x0;
        if (Math.abs(dx) < 5) return;
        drag.moved = true;
      }
      const rect = wrapRef.current.getBoundingClientRect();
      const plotW = Math.max(1, (surfaceRef.current?.clientWidth ?? rect.width) - GUTTER);
      // Content follows the pointer: dragging right reveals earlier time.
      const dt = ((e.clientX - drag.x0) / plotW) * drag.dur0;
      setView(drag.start0 - dt, drag.dur0);
      return;
    }
    if (
      (drag.kind === "dsa-pan" ||
        drag.kind === "dsa-resize-l" ||
        drag.kind === "dsa-resize-r" ||
        drag.kind === "dsa-seek") &&
      dsaWrapRef.current
    ) {
      const rect = dsaWrapRef.current.getBoundingClientRect();
      const plotW = Math.max(1, rect.width - DSA_LEFT - DSA_RIGHT);
      const dt = ((e.clientX - drag.x0) / plotW) * segment.duration;
      if (drag.kind === "dsa-pan") {
        setView(drag.start0 + dt, drag.dur0);
      } else if (drag.kind === "dsa-resize-l") {
        const end = drag.start0 + drag.dur0;
        setView(drag.start0 + dt, end - (drag.start0 + dt));
      } else if (drag.kind === "dsa-resize-r") {
        setView(drag.start0, drag.dur0 + dt);
      } else {
        const frac = clamp((e.clientX - rect.left - DSA_LEFT) / plotW, 0, 1);
        const next = frac * segment.duration;
        seekEeg(next);
        if (s.audibleScrub) playback.scrubAt(next, e.clientX - drag.x0);
      }
      return;
    }
    if (!overviewWrapRef.current) return;
    const w = overviewWrapRef.current.getBoundingClientRect().width;
    const dt = ((e.clientX - drag.x0) / Math.max(1, w)) * segment.duration;
    if (drag.kind === "pan") {
      setView(drag.start0 + dt, drag.dur0);
    } else if (drag.kind === "resize-l") {
      const end = drag.start0 + drag.dur0;
      const start = drag.start0 + dt;
      setView(start, end - start);
    } else if (drag.kind === "resize-r") {
      setView(drag.start0, drag.dur0 + dt);
    } else if (drag.kind === "seek") {
      const rect = overviewWrapRef.current.getBoundingClientRect();
      const frac = clamp((e.clientX - rect.left) / Math.max(1, w), 0, 1);
      seekEeg(frac * segment.duration);
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (drag?.kind === "editor-pan" && !drag.moved && drag.clickTime !== undefined) {
      seekEeg(drag.clickTime, "user");
    }
    dragRef.current = null;
    playback.endScrub();
  };

  const onPointerLeave = () => {
    if (hoveredTrackRef.current !== null || useEegStore.getState().hoverCursor) {
      hoveredTrackRef.current = null;
      useEegStore.getState().setHoverCursor(null);
      paintRef.current();
    }
  };

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      if (!useEegStore.getState().segment) return;
      e.preventDefault();
      const s = useEegStore.getState();
      // Trackpads emit horizontal deltaX for a natural left/right browse. A
      // shifted vertical wheel remains a convenient pan gesture for mice. A
      // locked zoom also routes ordinary vertical wheel gestures here, so a
      // scroll cannot accidentally change the selected time window.
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (horizontal || e.shiftKey || s.zoomLocked) {
        if (s.followPlayhead) s.setFollow(false);
        const span = s.viewDuration;
        const delta = horizontal ? e.deltaX : e.deltaY;
        panView(delta * 0.0015 * span);
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left + wrap.scrollLeft - GUTTER;
      const follow = s.followPlayhead && playback.playing;
      const vs = follow
        ? followViewStart(eegNow(s), s.viewDuration, s.segment!.duration)
        : s.viewStart;
      const frac = clamp(x / Math.max(1, (surfaceRef.current?.clientWidth ?? rect.width) - GUTTER), 0, 1);
      const anchor = s.followPlayhead ? eegNow(s) : timeAtFraction(frac, vs, s.viewDuration);
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      zoomAt(factor, anchor);
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
  }, [panView, zoomAt]);

  const tool = useEegStore((s) => s.tool);
  const list = orderedDisplayTracks(
    (displaySegment?.tracks ?? segment?.tracks ?? []).filter(
      (t) => t.kind !== "extra",
    ),
  );
  const renderedLanes = laneLayout(list, Math.max(1, (wrapRef.current?.clientHeight ?? 600) - RULER));

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        ref={overviewWrapRef}
        className="relative shrink-0 cursor-ew-resize border-b border-border bg-surface select-none"
        style={{ height: OVERVIEW_H }}
        onPointerDown={onOverviewPointer}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        <canvas ref={overviewRef} className="absolute inset-0 size-full" />
        <canvas
          ref={overviewOverlayRef}
          className="pointer-events-none absolute inset-0 size-full"
        />
        <div className="pointer-events-none absolute left-2 top-1.5 text-[0.625rem] font-medium uppercase tracking-wider text-subtle">
          Recording
        </div>
      </div>

      <div
        ref={dsaWrapRef}
        className={cn(
          "relative shrink-0 cursor-ew-resize border-b border-border bg-bg select-none",
          !showDsa && "hidden",
        )}
        style={{ height: showDsa ? DSA_H : 0 }}
        onPointerDown={onDsaPointer}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        <canvas ref={dsaRef} className="absolute inset-0 size-full" />
        <canvas ref={dsaOverlayRef} className="pointer-events-none absolute inset-0 size-full" />
        <div className="pointer-events-none absolute left-2 top-1 text-[0.625rem] font-medium uppercase tracking-wider text-subtle">
          DSA · PSD (dB)
        </div>
        <div className="pointer-events-none absolute right-2 top-1 font-mono text-[0.5625rem] text-subtle">
          stable scale · drag window
        </div>
      </div>

      <div
        ref={wrapRef}
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden bg-bg select-none",
          (tool as string) === "pan" ? "cursor-grab touch-none" : "cursor-crosshair",
        )}
        onPointerDown={onEditorPointer}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        <div
          ref={surfaceRef}
          className="relative min-h-full w-full"
        >
          <canvas ref={editorRef} className="absolute inset-0 size-full" />
          <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 size-full" />
          {list.length > 0 && (
            <div className="pointer-events-none absolute bottom-0 left-0 z-10 w-[132px]" style={{ top: RULER }}>
              {list.map((tr, index) => (
                <TrackGutter
                  key={tr.id}
                  track={tr}
                  previous={list[index - 1]}
                  count={list.length}
                  compact={list.length > 12}
                  lane={renderedLanes[index]}
                />
              ))}
            </div>
          )}
          {(status === "loading" || busy) && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/70 text-sm text-muted">
              {status === "loading" ? "Reading recording…" : "Preparing sound…"}
            </div>
          )}
          {status !== "ready" && status !== "loading" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-display text-xl tracking-tight text-fg">Auris</p>
            <p className="max-w-sm text-pretty text-sm text-muted">
              Open a deidentified EDF/EDF+ file, or load the demo tracing. All processing stays in
              this browser.
            </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function drawEditor(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  list: ProcessedTrack[],
  s: ReturnType<typeof useEegStore.getState>,
  viewStart: number,
  viewEnd: number,
  sampleStart: number,
  hoveredTrackId: string | null,
) {
  ctx.setTransform(
    Math.min(2, window.devicePixelRatio || 1),
    0,
    0,
    Math.min(2, window.devicePixelRatio || 1),
    0,
    0,
  );
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#07080a";
  ctx.fillRect(0, 0, cssW, cssH);

  const plotX = GUTTER;
  const plotW = Math.max(10, cssW - GUTTER);
  const plotTop = RULER;
  const plotH = Math.max(10, cssH - RULER);
  const n = Math.max(1, list.length);
  const lanes = laneLayout(list, plotH);
  const laneH = lanes[0]?.height ?? plotH / n;
  const sign = s.negativeUp ? -1 : 1;
  const span = Math.max(1e-6, viewEnd - viewStart);
  const localViewStart = viewStart - sampleStart;
  const localViewEnd = viewEnd - sampleStart;

  ctx.fillStyle = "#101216";
  ctx.fillRect(0, 0, cssW, RULER);
  ctx.strokeStyle = "rgba(232,234,237,0.08)";
  ctx.beginPath();
  ctx.moveTo(0, RULER - 0.5);
  ctx.lineTo(cssW, RULER - 0.5);
  ctx.stroke();

  const step = niceStep(span);
  const t0 = Math.ceil(viewStart / step) * step;
  ctx.font = "500 10px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
  ctx.fillStyle = "#8b919c";
  ctx.textBaseline = "middle";
  for (let t = t0; t <= viewEnd + 1e-6; t += step) {
    const x = plotX + ((t - viewStart) / span) * plotW;
    ctx.strokeStyle = "rgba(232,234,237,0.06)";
    ctx.beginPath();
    ctx.moveTo(x, RULER);
    ctx.lineTo(x, cssH);
    ctx.stroke();
    ctx.strokeStyle = "rgba(232,234,237,0.22)";
    ctx.beginPath();
    ctx.moveTo(x, RULER - 5);
    ctx.lineTo(x, RULER);
    ctx.stroke();
    ctx.fillText(formatTick(t, span), x + 4, RULER / 2);
  }

  const audible = audibleIds(Object.values(s.tracks));
  const anySolo = Object.values(s.tracks).some((tr) => tr.solo);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  // Extract at backing-store resolution so Retina displays get the detail
  // they paid for. Geometry is converted back to CSS coordinates by drawLane.
  const nPix = Math.max(1, Math.ceil(plotW * dpr));

  list.forEach((tr, i) => {
    const lane = lanes[i] ?? { top: i * laneH, height: laneH };
    const y0 = plotTop + lane.top;
    const laneHeight = lane.height;
    const mid = y0 + laneHeight / 2;
    if (i > 0 && lane.top > (lanes[i - 1]?.top ?? 0) + (lanes[i - 1]?.height ?? 0)) {
      // Mark the larger inter-chain spacer so neighboring longitudinal chains
      // remain visually distinct while annotations stay aligned to each lane.
      ctx.fillStyle = "rgba(232,234,237,0.13)";
      ctx.fillRect(0, y0 - (lane.top - (lanes[i - 1]?.top ?? 0) - (lanes[i - 1]?.height ?? 0)), cssW, lane.top - (lanes[i - 1]?.top ?? 0) - (lanes[i - 1]?.height ?? 0));
    }
    ctx.strokeStyle = "rgba(232,234,237,0.05)";
    ctx.beginPath();
    ctx.moveTo(plotX, mid);
    ctx.lineTo(plotX + plotW, mid);
    ctx.stroke();
    ctx.strokeStyle = "rgba(232,234,237,0.06)";
    ctx.beginPath();
    ctx.moveTo(0, y0 + laneHeight);
    ctx.lineTo(cssW, y0 + laneHeight);
    ctx.stroke();

    if (s.hiddenTrackIds.includes(tr.id)) {
      // A hidden channel keeps its lane so every remaining trace, annotation,
      // and group boundary stays at the same vertical position. The gutter's
      // eye button is the one-click restore affordance for this placeholder.
      ctx.fillStyle = "rgba(232,234,237,0.025)";
      ctx.fillRect(plotX, y0 + 1, plotW, Math.max(1, laneHeight - 2));
      ctx.strokeStyle = "rgba(232,234,237,0.16)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(plotX + 8, mid);
      ctx.lineTo(plotX + plotW - 8, mid);
      ctx.stroke();
      ctx.setLineDash([]);
      if (laneHeight >= 16) {
        ctx.fillStyle = "#747d89";
        ctx.font = "500 9px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
        ctx.textBaseline = "middle";
        ctx.fillText(`${tr.label} · hidden`, plotX + 12, mid - 1);
      }
      return;
    }

    const st = s.tracks[tr.id];
    const live = audible.has(tr.id);
    const lat = st?.lateralityOverride ?? tr.laterality;
    const color = stableTraceColor(tr.id, tr.kind, lat);
    const hovered = hoveredTrackId === tr.id;
    const focused = s.focusedTrackIds.length === 0 || s.focusedTrackIds.includes(tr.id);
    const alpha = focused
      ? hovered
        ? 1
        : live
          ? 1
          : anySolo || st?.mute
            ? 0.2
            : 0.56
      : 0.18;
    const raw = traceWindow(tr.samples, tr.sampleRate, localViewStart, localViewEnd, nPix);
    const profile = tr.kind === "ekg" ? cachedEkgDisplayProfile(tr.samples) : null;
    const display = profile
      ? mapTraceWindow(raw, (value) => {
          const centered = Number.isFinite(value) ? value - profile.baselineUv : 0;
          return Math.max(-profile.clipUv, Math.min(profile.clipUv, centered));
        })
      : raw;
    const scale = displayScaleForChannel(laneHeight, s.sensitivityUv, tr.kind, profile);
    const weight = traceWeight(hovered);
    drawLane(
      ctx,
      display,
      plotX,
      localViewStart,
      span,
      plotW,
      mid,
      scale,
      sign,
      color,
      alpha,
      0,
      weight,
      tr.sampleRate,
    );
  });

  if (list.length > 0 && laneH > 18) {
    const markerUvPeakToPeak = s.sensitivityUv * 10;
    const markerMm = nominalMmForVoltage(markerUvPeakToPeak, s.sensitivityUv);
    const markerPx = markerMm * CSS_PX_PER_MM;
    const half = markerPx / 2;
    const x = plotX + 14;
    const mid = plotTop + Math.min(laneH / 2, half + 8);
    ctx.strokeStyle = "rgba(232,234,237,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 6, mid - half);
    ctx.lineTo(x, mid - half);
    ctx.lineTo(x, mid + half);
    ctx.lineTo(x - 6, mid + half);
    ctx.stroke();
    ctx.fillStyle = "#8b919c";
    ctx.font = "500 9px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${(markerMm * s.sensitivityUv).toFixed(0)} µV p–p = ${markerMm} mm nominal`, x + 8, mid);
    ctx.textAlign = "left";
  }
}

function drawEditorOverlay(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  t: number,
  viewStart: number,
  viewDur: number,
  _total: number,
  annotations: Annotation[] = [],
  showAuto = true,
  selected: string | null = null,
  caliper: { a: number; b: number; trackId: string | null } | null = null,
  showAnnotations = true,
  tracks: ProcessedTrack[] = [],
  sampleStart = 0,
  focusedTrackIds: string[] = [],
  hoverCursor: { timeSec: number; trackId: string | null } | null = null,
  lanes: LaneRect[] = [],
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const plotX = GUTTER;
  const plotW = Math.max(10, cssW - GUTTER);
  const viewEnd = viewStart + viewDur;
  if (showAnnotations) {
    const visible = annotations.filter(
      (annotation) => annotation.source !== "auto" || (showAuto && annotation.type !== "qrs"),
    );
    const laneIds = tracks.filter((track) => track.kind !== "extra").map((track) => track.id);
    const laneHeight = Math.max(1, (cssH - RULER) / Math.max(1, laneIds.length));
    const layouts = layoutAnnotations(
      visible,
      {
        viewStart,
        viewDuration: viewDur,
        plotX,
        plotWidth: plotW,
        plotTop: RULER,
        laneHeight,
        laneRects: lanes,
        laneIds,
        eventRailHeight: EVENT_LANE,
      },
      selected,
    );
    for (const layout of layouts) {
      const annotation = visible.find((item) => item.id === layout.id);
      if (!annotation) continue;
      const color = MORPH_COLOR[annotation.type] ?? "#c8ccd4";
      const selectedAlpha = layout.selected ? 0.2 : 0.08;
      ctx.fillStyle = color;
      ctx.globalAlpha = selectedAlpha;
      if (layout.global) {
        // Global events live in the rail; only a selected global event gets a
        // narrow guide through the EEG so it remains obvious without masking
        // the underlying tracing.
        ctx.fillRect(layout.x0, 0, Math.max(2, layout.x1 - layout.x0), EVENT_LANE);
        if (layout.selected) {
          ctx.globalAlpha = 0.7;
          ctx.fillRect(layout.x0, EVENT_LANE, Math.max(1, layout.x1 - layout.x0), cssH - EVENT_LANE);
        }
      } else {
        for (const lane of layout.lanes) {
          ctx.fillRect(layout.x0, lane.top, Math.max(2, layout.x1 - layout.x0), lane.bottom - lane.top);
        }
      }
      ctx.globalAlpha = layout.selected ? 0.95 : 0.7;
      ctx.strokeStyle = color;
      ctx.lineWidth = layout.selected ? 1.5 : 1;
      ctx.setLineDash(annotation.source === "auto" ? [4, 3] : annotation.source === "file" ? [2, 2] : []);
      ctx.beginPath();
      ctx.moveTo(layout.x0, 0);
      ctx.lineTo(layout.x0, layout.global ? cssH : EVENT_LANE);
      if (layout.x1 - layout.x0 > 2) {
        ctx.moveTo(layout.x1, 0);
        ctx.lineTo(layout.x1, layout.global ? cssH : EVENT_LANE);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }
  if (focusedTrackIds.length > 0) {
    const laneIds = tracks.filter((track) => track.kind !== "extra").map((track) => track.id);
    const laneHeight = Math.max(1, (cssH - RULER) / Math.max(1, laneIds.length));
    ctx.strokeStyle = "rgba(126,184,201,0.7)";
    ctx.lineWidth = 1;
    for (const trackId of focusedTrackIds) {
      const lane = laneIds.indexOf(trackId);
      if (lane < 0) continue;
      const rect = lanes[lane] ?? { top: lane * laneHeight, height: laneHeight };
      ctx.strokeRect(plotX + 1, RULER + rect.top + 1, plotW - 2, Math.max(1, rect.height - 2));
    }
  }
  if (caliper) {
    const xa = plotX + clamp((caliper.a - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
    const xb = plotX + clamp((caliper.b - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
    ctx.fillStyle = "rgba(126,184,201,0.12)";
    ctx.fillRect(Math.min(xa, xb), 0, Math.abs(xb - xa), cssH);
    ctx.strokeStyle = "rgba(126,184,201,0.95)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xa, 0);
    ctx.lineTo(xa, cssH);
    ctx.moveTo(xb, 0);
    ctx.lineTo(xb, cssH);
    ctx.stroke();
    ctx.fillStyle = "#d7dde6";
    ctx.font = "500 11px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
    const dt = Math.abs(caliper.b - caliper.a);
    const hz = dt > 1e-4 ? 1 / dt : 0;
    const track = caliper.trackId ? tracks.find((item) => item.id === caliper.trackId) : null;
    let amplitude = "";
    if (track) {
      const ia = Math.round((caliper.a - sampleStart) * track.sampleRate);
      const ib = Math.round((caliper.b - sampleStart) * track.sampleRate);
      const va = track.samples[Math.max(0, Math.min(track.samples.length - 1, ia))];
      const vb = track.samples[Math.max(0, Math.min(track.samples.length - 1, ib))];
      if (va != null && vb != null && Number.isFinite(va) && Number.isFinite(vb)) {
        amplitude = `  ${track.label}  Δ ${(vb - va).toFixed(1)} µV`;
      }
    }
    const label =
      (hz > 0.2 && hz < 80 ? `${dt.toFixed(3)} s  ${hz.toFixed(1)} Hz` : `${dt.toFixed(3)} s`) +
      amplitude;
    ctx.fillText(label, Math.min(xa, xb) + 6, 14);
  }
  if (hoverCursor && hoverCursor.timeSec >= viewStart && hoverCursor.timeSec <= viewEnd) {
    const hoverX = plotX + ((hoverCursor.timeSec - viewStart) / Math.max(1e-6, viewDur)) * plotW;
    ctx.strokeStyle = "rgba(126,184,201,0.8)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(hoverX, 0);
    ctx.lineTo(hoverX, cssH);
    ctx.stroke();
    ctx.setLineDash([]);
    if (hoverCursor.trackId) {
      const laneIds = tracks.filter((track) => track.kind !== "extra").map((track) => track.id);
      const lane = laneIds.indexOf(hoverCursor.trackId);
      if (lane >= 0) {
        const laneHeight = Math.max(1, (cssH - RULER) / Math.max(1, laneIds.length));
        ctx.fillStyle = "rgba(126,184,201,0.08)";
        const rect = lanes[lane] ?? { top: lane * laneHeight, height: laneHeight };
        ctx.fillRect(plotX, RULER + rect.top, plotW, rect.height);
      }
    }
  }
  if (t < viewStart || t > viewStart + viewDur) return;
  const frac = (t - viewStart) / Math.max(1e-6, viewDur);
  const x = plotX + clamp(frac, 0, 1) * plotW;
  ctx.strokeStyle = "rgba(232,234,237,0.9)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, cssH);
  ctx.stroke();
  ctx.fillStyle = "rgba(232,234,237,0.9)";
  ctx.beginPath();
  ctx.moveTo(x - 5, 0);
  ctx.lineTo(x + 5, 0);
  ctx.lineTo(x, 7);
  ctx.closePath();
  ctx.fill();
}

function drawOverviewWaves(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  list: ProcessedTrack[],
  s: ReturnType<typeof useEegStore.getState>,
  total: number,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#101216";
  ctx.fillRect(0, 0, cssW, cssH);
  if (list.length === 0 || total <= 0) return;
  const nPix = Math.max(1, Math.ceil(cssW * dpr));
  const n = Math.max(1, list.length);
  const laneH = (cssH - 14) / n;
  const sign = s.negativeUp ? -1 : 1;
  list.forEach((tr, i) => {
    const y0 = 4 + i * laneH;
    const mid = y0 + laneH / 2;
    if (s.hiddenTrackIds.includes(tr.id)) {
      // Keep hidden channels in their original overview lane as well; hiding
      // a trace must not make the miniature overview reorder the remaining
      // channels vertically.
      ctx.fillStyle = "rgba(232,234,237,0.04)";
      ctx.fillRect(0, y0 + 1, cssW, Math.max(1, laneH - 2));
      ctx.strokeStyle = "rgba(232,234,237,0.16)";
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(4, mid);
      ctx.lineTo(cssW - 4, mid);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    const lat = s.tracks[tr.id]?.lateralityOverride ?? tr.laterality;
    const raw = envelopeTraceWindow(tr.samples, tr.sampleRate, 0, total, nPix);
    const profile = tr.kind === "ekg" ? cachedEkgDisplayProfile(tr.samples) : null;
    const display = profile
      ? {
          min: Float32Array.from(raw.min, (value) =>
            Math.max(-profile.clipUv, Math.min(profile.clipUv, value - profile.baselineUv)),
          ),
          max: Float32Array.from(raw.max, (value) =>
            Math.max(-profile.clipUv, Math.min(profile.clipUv, value - profile.baselineUv)),
          ),
        }
      : raw;
    const scale = displayScaleForChannel(laneH, s.sensitivityUv, tr.kind, profile);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = stableTraceColor(tr.id, tr.kind, lat);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let p = 0; p < display.min.length; p++) {
      const x = ((p + 0.5) / display.min.length) * cssW;
      ctx.moveTo(x, mid + sign * display.min[p]! * scale);
      ctx.lineTo(x, mid + sign * display.max[p]! * scale);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  ctx.fillStyle = "#5c6370";
  ctx.font = "500 9px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
  ctx.textBaseline = "bottom";
  const step = niceStep(total);
  for (let tt = 0; tt <= total + 1e-6; tt += step) {
    const x = (tt / total) * cssW;
    ctx.fillText(formatTick(tt, total), x + 3, cssH - 2);
  }
}

function drawOverviewOverlay(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  t: number,
  viewStart: number,
  viewDur: number,
  total: number,
  annotations: Annotation[] = [],
  showAuto = true,
  showAnnotations = true,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  if (total <= 0) return;
  if (showAnnotations) {
    for (const a of annotations) {
      if (a.source === "auto" && (a.type === "qrs" || !showAuto)) continue;
      const x = (a.start / total) * cssW;
      ctx.fillStyle = MORPH_COLOR[a.type] ?? "#c8ccd4";
      ctx.fillRect(x, 0, 2, cssH);
    }
  }
  const x0 = (viewStart / total) * cssW;
  const x1 = ((viewStart + viewDur) / total) * cssW;
  ctx.fillStyle = "rgba(126,184,201,0.14)";
  ctx.fillRect(x0, 0, Math.max(2, x1 - x0), cssH);
  ctx.strokeStyle = "rgba(126,184,201,0.9)";
  ctx.lineWidth = 1.25;
  ctx.strokeRect(x0 + 0.5, 0.5, Math.max(2, x1 - x0 - 1), cssH - 1);
  ctx.fillStyle = "rgba(126,184,201,0.9)";
  ctx.fillRect(x0 - 1, 0, 3, cssH);
  ctx.fillRect(x1 - 2, 0, 3, cssH);

  ctx.strokeStyle = "rgba(232,234,237,0.95)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  const px = (t / total) * cssW;
  ctx.moveTo(px, 0);
  ctx.lineTo(px, cssH);
  ctx.stroke();
}

function drawDsa(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  frame: DsaFrame | null,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#07080a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!frame || frame.nTime < 1 || frame.nFreq < 2) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return;
  }
  const plotCssW = Math.max(1, cssW - DSA_LEFT - DSA_RIGHT);
  const plotW = Math.max(1, Math.floor(plotCssW * dpr));
  const plotH = Math.max(1, Math.floor((cssH - DSA_TOP - DSA_BOTTOM) * dpr));
  const img = ctx.createImageData(plotW, plotH);
  const data = img.data;
  const mid = plotH / 2;
  for (let x = 0; x < plotW; x++) {
    const ti = Math.min(frame.nTime - 1, Math.floor((x / plotW) * frame.nTime));
    for (let y = 0; y < plotH; y++) {
      let src: Float32Array;
      let fBin: number;
      if (y < mid) {
        src = frame.l;
        const u = 1 - y / Math.max(1, mid - 1);
        fBin = Math.min(frame.nFreq - 1, Math.floor(u * (frame.nFreq - 1)));
      } else {
        src = frame.r;
        const u = (y - mid) / Math.max(1, plotH - mid - 1);
        fBin = Math.min(frame.nFreq - 1, Math.floor(u * (frame.nFreq - 1)));
      }
      const p = src[ti * frame.nFreq + fBin] ?? 0;
      const [r, g, b] = dsaRgb(dsaUnit(p, frame.dbMin, frame.dbMax));
      const i = (y * plotW + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, Math.round(DSA_LEFT * dpr), Math.round(DSA_TOP * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.strokeStyle = "rgba(232,234,237,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(DSA_LEFT, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) / 2);
  ctx.lineTo(cssW - DSA_RIGHT, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) / 2);
  ctx.stroke();
  ctx.fillStyle = "#8b919c";
  ctx.font = "500 9px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText("L", 7, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) * 0.25);
  ctx.fillText("0", 7, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) * 0.5);
  ctx.fillText("R", 7, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) * 0.75);
  ctx.textAlign = "right";
  ctx.fillText(`${frame.fMax.toFixed(0)} Hz`, DSA_LEFT - 5, DSA_TOP + 4);
  ctx.fillText(
    `${(frame.fMax / 2).toFixed(0)} Hz`,
    DSA_LEFT - 5,
    DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) * 0.25,
  );
  ctx.fillText("0 Hz", DSA_LEFT - 5, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) * 0.5);
  ctx.textAlign = "left";
  const legendX = cssW - DSA_RIGHT + 10;
  const legendY = DSA_TOP + 4;
  const legendW = Math.max(16, DSA_RIGHT - 20);
  const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendW, 0);
  for (let i = 0; i <= 10; i++) {
    const [r, g, b] = dsaRgb(i / 10);
    gradient.addColorStop(i / 10, `rgb(${r} ${g} ${b})`);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(legendX, legendY, legendW, 5);
  ctx.fillStyle = "#8b919c";
  ctx.textBaseline = "top";
  ctx.fillText(`${Math.round(frame.dbMax)} dB`, legendX, legendY + 8);
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(frame.dbMin)} dB`, legendX + legendW, legendY + 8);
  ctx.textAlign = "left";
  ctx.fillText("PSD", legendX, cssH - 10);
  ctx.textBaseline = "bottom";
  const timeStep = niceStep(frame.duration);
  for (let time = 0; time <= frame.duration + 1e-6; time += timeStep) {
    const x = DSA_LEFT + (time / Math.max(1e-6, frame.duration)) * plotCssW;
    ctx.fillText(formatTick(time, frame.duration), x + 2, cssH - 2);
  }
}

function drawDsaOverlay(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  t: number,
  viewStart: number,
  viewDur: number,
  total: number,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  if (total <= 0) return;
  const plotW = Math.max(1, cssW - DSA_LEFT - DSA_RIGHT);
  const plotX = (time: number) => DSA_LEFT + (time / total) * plotW;
  const x0 = plotX(viewStart);
  const x1 = plotX(viewStart + viewDur);
  const plotTop = DSA_TOP;
  const plotH = Math.max(1, cssH - DSA_TOP - DSA_BOTTOM);
  ctx.fillStyle = "rgba(232,234,237,0.06)";
  ctx.fillRect(x0, plotTop, Math.max(2, x1 - x0), plotH);
  ctx.strokeStyle = "rgba(232,234,237,0.45)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, plotTop + 0.5, Math.max(2, x1 - x0 - 1), plotH - 1);
  ctx.strokeStyle = "rgba(232,234,237,0.95)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(plotX(t), plotTop);
  ctx.lineTo(plotX(t), plotTop + plotH);
  ctx.stroke();
  ctx.fillStyle = "rgba(232,234,237,0.9)";
  ctx.font = "500 9px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    formatTick(t, viewDur),
    Math.min(cssW - DSA_RIGHT - 34, Math.max(DSA_LEFT + 2, plotX(t) + 4)),
    cssH - 2,
  );
}

function TrackGutter({
  track,
  previous,
  count,
  compact,
  lane,
}: {
  track: ProcessedTrack;
  previous?: ProcessedTrack;
  count: number;
  compact: boolean;
  lane?: LaneRect;
}) {
  const st = useEegStore((s) => s.tracks[track.id]) as TrackState | undefined;
  const toggleMute = useEegStore((s) => s.toggleMute);
  const toggleSolo = useEegStore((s) => s.toggleSolo);
  const soloExclusive = useEegStore((s) => s.soloExclusive);
  const setGain = useEegStore((s) => s.setGain);
  const hidden = useEegStore((s) => s.hiddenTrackIds.includes(track.id));
  const toggleTrackVisibility = useEegStore((s) => s.toggleTrackVisibility);
  const focused = useEegStore((s) => s.focusedTrackIds.length === 0 || s.focusedTrackIds.includes(track.id));
  const lat = st?.lateralityOverride ?? track.laterality;
  const muted = Boolean(st?.mute);
  const solo = Boolean(st?.solo);
  return (
    <div
      className={cn(
        "pointer-events-auto absolute left-0 right-0 flex items-center gap-0.5 border-b border-border/50 px-1",
        previous && displayBand(previous) !== displayBand(track) && "border-t-2 border-accent/30",
        focused && "bg-accent/8",
        hidden && "opacity-50",
      )}
      style={lane ? { top: lane.top, height: lane.height } : { height: `${100 / count}%` }}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: stableTraceColor(track.id, track.kind, lat) }}
        aria-hidden="true"
      />
      <button
        type="button"
        title={hidden ? "Show channel" : "Hide channel"}
        aria-label={`${hidden ? "Show" : "Hide"} ${track.label}`}
        aria-pressed={hidden}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => toggleTrackVisibility(track.id)}
        className={cn(
          "grid h-6 min-w-6 shrink-0 place-items-center rounded-sm text-subtle hover:text-fg",
          hidden ? "bg-surface-2" : "bg-transparent",
        )}
      >
        {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
      {hidden ? (
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate font-mono text-[0.625rem] leading-tight text-muted">
              {track.label}
            </span>
            <span className="shrink-0 text-[0.5625rem] uppercase tracking-wide text-subtle">Hidden</span>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            title="Solo — multiple tracks can be soloed. Double-click for exclusive."
            onClick={() => toggleSolo(track.id)}
            onDoubleClick={() => soloExclusive(track.id)}
            className={cn(
              "grid h-6 min-w-6 shrink-0 place-items-center rounded-sm text-[0.6875rem] font-bold",
              solo ? "bg-ok text-bg" : "bg-surface-2 text-subtle hover:text-fg",
            )}
          >
            S
          </button>
          <button
            type="button"
            title={muted ? "Unmute" : "Mute"}
            onClick={() => toggleMute(track.id)}
            className={cn(
              "grid h-6 min-w-6 shrink-0 place-items-center rounded-sm text-[0.6875rem] font-bold",
              muted ? "bg-danger text-bg" : "bg-surface-2 text-subtle hover:text-fg",
            )}
          >
            M
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-1">
              <span className="truncate font-mono text-[0.625rem] leading-tight text-fg">
                {track.label}
              </span>
              <span
                className={cn(
                  "shrink-0 text-[0.625rem] uppercase",
                  lat === "left" && "text-hemi-l",
                  lat === "right" && "text-hemi-r",
                  lat === "midline" && "text-hemi-c",
                  lat === "unknown" && "text-subtle",
                )}
              >
                {lat === "left" ? "L" : lat === "right" ? "R" : lat === "midline" ? "C" : "—"}
              </span>
            </div>
            {!compact && (
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={typeof st?.gain === "number" ? st.gain : 1}
                onChange={(e) => setGain(track.id, Number(e.target.value))}
                className="h-1 w-full cursor-pointer accent-accent"
                aria-label={`${track.label} gain`}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
