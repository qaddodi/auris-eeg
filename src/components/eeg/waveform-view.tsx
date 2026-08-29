"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import { audibleIds } from "@/lib/eeg/pipeline";
import type { Annotation, ProcessedTrack, TrackState } from "@/lib/eeg/types";
import { playback } from "@/lib/eeg/audio";
import {
  clamp,
  envelopeWindow,
  followViewStart,
  interpWindow,
  samplesPerPixel,
  timeAtFraction,
} from "@/lib/eeg/view";
import { MORPH_COLOR } from "@/lib/eeg/defaults";
import { displayScaleForChannel, ekgDisplayProfile, normalizeEkgWindow } from "@/lib/eeg/display";
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
/** Below this samples/pixel, min–max bars collapse — draw an interpolated polyline instead. */
const MINMAX_SPP = 1.8;

function traceWeight(samplesPerPixelValue: number, hovered: boolean): number {
  // Dense envelope columns already carry visual mass. Taper the stroke as
  // density rises so the full-recording page stays legible without making
  // close-up traces feel faint.
  const densityWeight =
    samplesPerPixelValue <= MINMAX_SPP ? 1 : Math.max(0.42, Math.sqrt(1.15 / samplesPerPixelValue));
  return densityWeight * (hovered ? 1.08 : 1);
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

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  y: Float32Array,
  x0: number,
  mid: number,
  scale: number,
  sign: number,
  offset = 0,
) {
  ctx.beginPath();
  for (let p = 0; p < y.length; p++) {
    const x = x0 + p + 0.5;
    const yy = mid + sign * (y[p]! - offset) * scale;
    if (p === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
}

function drawLane(
  ctx: CanvasRenderingContext2D,
  min: Float32Array,
  max: Float32Array,
  x0: number,
  mid: number,
  scale: number,
  sign: number,
  color: string,
  alpha: number,
  midV: Float32Array | null,
  offset = 0,
  weight = 1,
) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (midV) {
    ctx.lineWidth = 1.35 * weight;
    drawPolyline(ctx, midV, x0, mid, scale, sign, offset);
    ctx.globalAlpha = 1;
    return;
  }
  ctx.globalAlpha = alpha * 0.38;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let p = 0; p < min.length; p++) {
    const x = x0 + p + 0.5;
    const yHi = mid + sign * (max[p]! - offset) * scale;
    if (p === 0) ctx.moveTo(x, yHi);
    else ctx.lineTo(x, yHi);
  }
  for (let p = min.length - 1; p >= 0; p--) {
    ctx.lineTo(x0 + p + 0.5, mid + sign * (min[p]! - offset) * scale);
  }
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.15 * weight;
  ctx.beginPath();
  for (let p = 0; p < min.length; p++) {
    const x = x0 + p + 0.5;
    ctx.moveTo(x, mid + sign * (min[p]! - offset) * scale);
    ctx.lineTo(x, mid + sign * (max[p]! - offset) * scale);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let p = 0; p < min.length; p++) {
    const x = x0 + p + 0.5;
    const y = mid + sign * (max[p]! - offset) * scale;
    if (p === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let p = 0; p < min.length; p++) {
    const x = x0 + p + 0.5;
    const y = mid + sign * (min[p]! - offset) * scale;
    if (p === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
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
  const overviewWrapRef = useRef<HTMLDivElement>(null);
  const dsaWrapRef = useRef<HTMLDivElement>(null);
  const hoveredTrackRef = useRef<string | null>(null);
  const dragRef = useRef<null | {
    kind:
      | "seek"
      | "pan"
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
  }>(null);
  const caliperRef = useRef<{ a: number; b: number } | null>(null);
  const paintRef = useRef<() => void>(() => {});

  const segment = useEegStore((s) => s.segment);
  const status = useEegStore((s) => s.status);
  const busy = useEegStore((s) => s.busy);
  const seekEeg = useEegStore((s) => s.seekEeg);
  const setView = useEegStore((s) => s.setView);
  const panView = useEegStore((s) => s.panView);
  const zoomAt = useEegStore((s) => s.zoomAt);
  const showDsa = useEegStore((s) => s.showDsa);

  useEffect(() => {
    const editor = editorRef.current;
    const overlay = overlayRef.current;
    const overview = overviewRef.current;
    const ovOverlay = overviewOverlayRef.current;
    const dsa = dsaRef.current;
    const dsaOv = dsaOverlayRef.current;
    const wrap = wrapRef.current;
    const ovWrap = overviewWrapRef.current;
    const dsaWrap = dsaWrapRef.current;
    if (
      !editor ||
      !overlay ||
      !overview ||
      !ovOverlay ||
      !wrap ||
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

    const paint = () => {
      const s = useEegStore.getState();
      const list = (s.segment?.tracks ?? []).filter((t) => t.kind !== "extra");
      const total = s.segment?.duration ?? 0;
      const t = eegNow(s);
      const follow = s.followPlayhead && playback.playing;
      const viewDur = s.viewDuration;
      const viewStart = follow && total > 0 ? followViewStart(t, viewDur, total) : s.viewStart;
      const viewEnd = viewStart + viewDur;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = wrap.clientWidth;
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
          const sig = [
            list.length,
            total,
            viewStart.toFixed(3),
            viewDur.toFixed(3),
            s.sensitivityUv,
            s.negativeUp ? 1 : 0,
            hoveredTrackRef.current,
            cssW,
            cssH,
            Object.values(s.tracks)
              .map((tr) => `${tr.id}:${tr.mute ? 1 : 0}${tr.solo ? 1 : 0}`)
              .join(","),
          ].join("|");
          if (sig !== waveSig) {
            waveSig = sig;
            drawEditor(ectx, cssW, cssH, list, s, viewStart, viewEnd, hoveredTrackRef.current);
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
          );
        }
      }

      if (ovW >= 8 && ovH >= 8) {
        sizeCanvas(overview, ovW, ovH, dpr);
        sizeCanvas(ovOverlay, ovW, ovH, dpr);
        const ctx = overview.getContext("2d");
        const octx = ovOverlay.getContext("2d");
        if (ctx && octx) {
          const osig = [list.length, total, ovW, ovH, s.negativeUp ? 1 : 0, s.sensitivityUv].join(
            "|",
          );
          if (osig !== ovSig) {
            ovSig = osig;
            drawOverviewWaves(ctx, ovW, ovH, list, s, total);
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
    const plotW = rect.width - GUTTER;
    const x = e.clientX - rect.left - GUTTER;
    if (x < 0) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const s = useEegStore.getState();
    if (s.followPlayhead) s.setFollow(false);
    const follow = s.followPlayhead && playback.playing;
    const vs = follow ? followViewStart(eegNow(s), s.viewDuration, segment.duration) : s.viewStart;
    const frac = clamp(x / Math.max(1, plotW), 0, 1);
    const t = timeAtFraction(frac, vs, s.viewDuration);
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
      dragRef.current = { kind: "caliper", x0: e.clientX, start0: t, dur0: 0 };
      caliperRef.current = { a: t, b: t };
      paintRef.current();
      return;
    }
    seekEeg(t);
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
      const list = (segment.tracks ?? []).filter((t) => t.kind !== "extra");
      if (rect && e.clientX - rect.left >= GUTTER && list.length > 0) {
        const laneH = Math.max(1, (rect.height - RULER) / list.length);
        const lane = Math.floor((e.clientY - rect.top - RULER) / laneH);
        const next = list[lane]?.id ?? null;
        if (next !== hoveredTrackRef.current) {
          hoveredTrackRef.current = next;
          paintRef.current();
        }
      }
      return;
    }
    const s = useEegStore.getState();
    if (drag.kind === "caliper" && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const plotW = Math.max(1, rect.width - GUTTER);
      const x = e.clientX - rect.left - GUTTER;
      const frac = clamp(x / plotW, 0, 1);
      const follow = s.followPlayhead && playback.playing;
      const vs = follow
        ? followViewStart(eegNow(s), s.viewDuration, segment.duration)
        : s.viewStart;
      caliperRef.current = { a: drag.start0, b: timeAtFraction(frac, vs, s.viewDuration) };
      paintRef.current();
      return;
    }
    if (drag.kind === "scrub" && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const plotW = Math.max(1, rect.width - GUTTER);
      const x = e.clientX - rect.left - GUTTER;
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
    dragRef.current = null;
    playback.endScrub();
  };

  const onPointerLeave = () => {
    if (hoveredTrackRef.current !== null) {
      hoveredTrackRef.current = null;
      paintRef.current();
    }
  };

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      if (!useEegStore.getState().segment) return;
      e.preventDefault();
      if (e.shiftKey) {
        const s = useEegStore.getState();
        if (s.followPlayhead) s.setFollow(false);
        const span = s.viewDuration;
        panView((e.deltaY + e.deltaX) * 0.0015 * span);
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left - GUTTER;
      const s = useEegStore.getState();
      const follow = s.followPlayhead && playback.playing;
      const vs = follow
        ? followViewStart(eegNow(s), s.viewDuration, s.segment!.duration)
        : s.viewStart;
      const frac = clamp(x / Math.max(1, rect.width - GUTTER), 0, 1);
      const anchor = s.followPlayhead ? eegNow(s) : timeAtFraction(frac, vs, s.viewDuration);
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      zoomAt(factor, anchor);
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
  }, [panView, zoomAt]);

  const list = (segment?.tracks ?? []).filter((t) => t.kind !== "extra");

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
        className="relative min-h-0 flex-1 overflow-hidden bg-bg select-none"
        onPointerDown={onEditorPointer}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        <canvas ref={editorRef} className="absolute inset-0 size-full" />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 size-full" />
        {list.length > 0 && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 z-10 w-[132px]"
            style={{ top: RULER }}
          >
            {list.map((tr) => (
              <TrackGutter key={tr.id} track={tr} count={list.length} compact={list.length > 12} />
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
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#07080a";
  ctx.fillRect(0, 0, cssW, cssH);

  const plotX = GUTTER;
  const plotW = Math.max(10, cssW - GUTTER);
  const plotTop = RULER;
  const plotH = Math.max(10, cssH - RULER);
  const n = Math.max(1, list.length);
  const laneH = plotH / n;
  const sign = s.negativeUp ? -1 : 1;
  const span = Math.max(1e-6, viewEnd - viewStart);

  ctx.fillStyle = "#101216";
  ctx.fillRect(0, 0, cssW, RULER);
  ctx.strokeStyle = "rgba(232,234,237,0.08)";
  ctx.beginPath();
  ctx.moveTo(0, RULER - 0.5);
  ctx.lineTo(cssW, RULER - 0.5);
  ctx.stroke();

  const step = niceStep(span);
  const t0 = Math.ceil(viewStart / step) * step;
  ctx.font = "500 10px 'IBM Plex Mono', ui-monospace, monospace";
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
  const nPix = Math.max(1, Math.floor(plotW));

  list.forEach((tr, i) => {
    const y0 = plotTop + i * laneH;
    const mid = y0 + laneH / 2;
    ctx.strokeStyle = "rgba(232,234,237,0.05)";
    ctx.beginPath();
    ctx.moveTo(plotX, mid);
    ctx.lineTo(plotX + plotW, mid);
    ctx.stroke();
    ctx.strokeStyle = "rgba(232,234,237,0.06)";
    ctx.beginPath();
    ctx.moveTo(0, y0 + laneH);
    ctx.lineTo(cssW, y0 + laneH);
    ctx.stroke();

    const st = s.tracks[tr.id];
    const live = audible.has(tr.id);
    const lat = st?.lateralityOverride ?? tr.laterality;
    const color = stableTraceColor(tr.id, tr.kind, lat);
    const hovered = hoveredTrackId === tr.id;
    const alpha = hovered ? 1 : live ? 1 : anySolo || st?.mute ? 0.2 : 0.56;
    const raw = envelopeWindow(tr.samples, tr.sampleRate, viewStart, viewEnd, nPix);
    const spp = samplesPerPixel(tr.sampleRate, viewStart, viewEnd, nPix);
    const rawMid =
      spp < MINMAX_SPP ? interpWindow(tr.samples, tr.sampleRate, viewStart, viewEnd, nPix) : null;
    const profile = tr.kind === "ekg" ? ekgDisplayProfile(tr.samples) : null;
    const display = profile
      ? normalizeEkgWindow(raw.min, raw.max, rawMid, profile)
      : { min: raw.min, max: raw.max, mid: rawMid };
    const scale = displayScaleForChannel(laneH, s.sensitivityUv, tr.kind, profile);
    const weight = traceWeight(spp, hovered);
    drawLane(
      ctx,
      display.min,
      display.max,
      plotX,
      mid,
      scale,
      sign,
      color,
      alpha,
      display.mid,
      0,
      weight,
    );
  });

  if (list.length > 0 && laneH > 18) {
    const mid = plotTop + laneH / 2;
    const half = (laneH * 0.92) / 2;
    const x = cssW - 5;
    ctx.strokeStyle = "rgba(232,234,237,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 6, mid - half);
    ctx.lineTo(x, mid - half);
    ctx.lineTo(x, mid + half);
    ctx.lineTo(x - 6, mid + half);
    ctx.stroke();
    ctx.fillStyle = "#8b919c";
    ctx.font = "500 9px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`${s.sensitivityUv} µV`, x - 8, mid);
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
  caliper: { a: number; b: number } | null = null,
  showAnnotations = true,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const plotX = GUTTER;
  const plotW = Math.max(10, cssW - GUTTER);
  const viewEnd = viewStart + viewDur;
  if (showAnnotations) {
    for (const a of annotations) {
      if (a.source === "auto" && (a.type === "qrs" || !showAuto)) continue;
      if (a.end < viewStart || a.start > viewEnd) continue;
      const x0 = plotX + clamp((a.start - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
      const x1 =
        plotX +
        clamp((Math.max(a.end, a.start + 0.02) - viewStart) / Math.max(1e-6, viewDur), 0, 1) *
          plotW;
      ctx.fillStyle = MORPH_COLOR[a.type] ?? "#c8ccd4";
      ctx.globalAlpha = a.id === selected ? 0.55 : 0.28;
      ctx.fillRect(x0, 0, Math.max(2, x1 - x0), EVENT_LANE);
      ctx.globalAlpha = 1;
      ctx.fillRect(x0, EVENT_LANE, 2, cssH - EVENT_LANE);
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
    ctx.font = "500 11px 'IBM Plex Mono', ui-monospace, monospace";
    const dt = Math.abs(caliper.b - caliper.a);
    const hz = dt > 1e-4 ? 1 / dt : 0;
    const label =
      hz > 0.2 && hz < 80 ? `${dt.toFixed(3)} s  ${hz.toFixed(1)} Hz` : `${dt.toFixed(3)} s`;
    ctx.fillText(label, Math.min(xa, xb) + 6, 14);
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
  const nPix = Math.max(1, Math.floor(cssW));
  const n = Math.max(1, list.length);
  const laneH = (cssH - 14) / n;
  const sign = s.negativeUp ? -1 : 1;
  list.forEach((tr, i) => {
    const mid = 4 + i * laneH + laneH / 2;
    const lat = s.tracks[tr.id]?.lateralityOverride ?? tr.laterality;
    const raw = envelopeWindow(tr.samples, tr.sampleRate, 0, total, nPix);
    const profile = tr.kind === "ekg" ? ekgDisplayProfile(tr.samples) : null;
    const display = profile ? normalizeEkgWindow(raw.min, raw.max, null, profile) : raw;
    const scale = displayScaleForChannel(laneH, s.sensitivityUv, tr.kind, profile);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = stableTraceColor(tr.id, tr.kind, lat);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let p = 0; p < display.min.length; p++) {
      ctx.moveTo(p + 0.5, mid + sign * display.min[p]! * scale);
      ctx.lineTo(p + 0.5, mid + sign * display.max[p]! * scale);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  ctx.fillStyle = "#5c6370";
  ctx.font = "500 9px 'IBM Plex Mono', ui-monospace, monospace";
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
  ctx.font = "500 9px 'IBM Plex Mono', ui-monospace, monospace";
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
  ctx.font = "500 9px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    formatTick(t, viewDur),
    Math.min(cssW - DSA_RIGHT - 34, Math.max(DSA_LEFT + 2, plotX(t) + 4)),
    cssH - 2,
  );
}

function TrackGutter({
  track,
  count,
  compact,
}: {
  track: ProcessedTrack;
  count: number;
  compact: boolean;
}) {
  const st = useEegStore((s) => s.tracks[track.id]) as TrackState | undefined;
  const toggleMute = useEegStore((s) => s.toggleMute);
  const toggleSolo = useEegStore((s) => s.toggleSolo);
  const soloExclusive = useEegStore((s) => s.soloExclusive);
  const setGain = useEegStore((s) => s.setGain);
  const lat = st?.lateralityOverride ?? track.laterality;
  const muted = Boolean(st?.mute);
  const solo = Boolean(st?.solo);
  return (
    <div
      className="pointer-events-auto flex items-center gap-0.5 border-b border-border/50 px-1"
      style={{ height: `${100 / count}%` }}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: stableTraceColor(track.id, track.kind, lat) }}
        aria-hidden="true"
      />
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
    </div>
  );
}
