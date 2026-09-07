"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { audibleIds } from "@/lib/eeg/pipeline";
import type { Annotation, ProcessedTrack, TrackState } from "@/lib/eeg/types";
import type { UnifiedAbnormalityFinding } from "@/lib/eeg/abnormality/types";
import { playback } from "@/lib/eeg/audio";
import {
  clamp,
  followViewStart,
  timeAtFraction,
} from "@/lib/eeg/view";
import { ANNOTATION_TYPES, MORPH_COLOR } from "@/lib/eeg/defaults";
import { displayScaleForChannel } from "@/lib/eeg/display";
import {
  hitTestAnnotations,
  layoutAnnotations,
  type AnnotationLane,
} from "@/lib/eeg/annotation-layout";
import {
  cachedEkgDisplayProfile,
  envelopeTraceWindow,
  mapTraceWindow,
  peakHoldColumns,
  traceWindow,
  waveformInvalidationKey,
  type EnvelopeTraceWindow,
  type NativeTraceWindow,
  type TraceWindow,
} from "@/lib/eeg/rendering";
import {
  AUX_TRACE_COLORS,
  EEG_CHAIN_COLORS,
  stableTraceColor,
} from "@/lib/eeg/colors";
import { dsaRgb, dsaUnit, type DsaFrame } from "@/lib/eeg/spectrum";
import { eegNow, useEegStore } from "@/store/eeg-store";
import type { ResolvedTheme } from "./theme";

// Keep the utility strip compact while leaving enough room for the four
// expanded controls. Collapsed mode is intentionally narrow so the traces
// reclaim the space rather than merely hiding the controls in place.
const GUTTER_EXPANDED = 88;
const GUTTER_COLLAPSED = 32;
const RULER = 18;
const OVERVIEW_H = 72;
const DSA_H = 112;
const DSA_LEFT = 34;
const DSA_RIGHT = 82;
const DSA_TOP = 14;
const DSA_BOTTOM = 17;
const EVENT_LANE = 18;
// Hidden channels retain their ordered slot, but only need enough room for
// the compact gutter affordance. The remaining plot height is redistributed
// across visible channels by laneLayout.
const HIDDEN_LANE_HEIGHT = 24;
const CHAIN_GAP = 7;

type CanvasPalette = {
  bg: string;
  ruler: string;
  text: string;
  muted: string;
  grid: string;
  gridStrong: string;
  laneMid: string;
  laneBottom: string;
  spacer: string;
  hiddenFill: string;
  hiddenLine: string;
  labelBg: string;
  labelText: string;
  labelHiddenText: string;
  keyline: string;
  annotationBg: string;
  annotationText: string;
  accent: string;
  overlayFill: string;
  overlayStroke: string;
  cursor: string;
};

const CANVAS_PALETTES: Record<ResolvedTheme, CanvasPalette> = {
  dark: {
    bg: "#07080a",
    ruler: "#101216",
    text: "#f1f4f7",
    muted: "#8b919c",
    grid: "rgba(232,234,237,0.06)",
    gridStrong: "rgba(232,234,237,0.22)",
    laneMid: "rgba(232,234,237,0.05)",
    laneBottom: "rgba(232,234,237,0.06)",
    spacer: "rgba(232,234,237,0.13)",
    hiddenFill: "rgba(232,234,237,0.025)",
    hiddenLine: "rgba(232,234,237,0.16)",
    labelBg: "#07080a",
    labelText: "#f1f4f7",
    labelHiddenText: "#aeb6c2",
    keyline: "#020305",
    annotationBg: "#06080b",
    annotationText: "#ffffff",
    accent: "#7eb8c9",
    overlayFill: "rgba(232,234,237,0.06)",
    overlayStroke: "rgba(232,234,237,0.45)",
    cursor: "rgba(232,234,237,0.95)",
  },
  light: {
    bg: "#f8fafb",
    ruler: "#eaf0f3",
    text: "#17232c",
    muted: "#5e6d78",
    grid: "rgba(23,35,44,0.11)",
    gridStrong: "rgba(23,35,44,0.28)",
    laneMid: "rgba(23,35,44,0.10)",
    laneBottom: "rgba(23,35,44,0.12)",
    spacer: "rgba(23,35,44,0.09)",
    hiddenFill: "rgba(23,35,44,0.035)",
    hiddenLine: "rgba(23,35,44,0.28)",
    labelBg: "#f8fafb",
    labelText: "#17232c",
    labelHiddenText: "#5e6d78",
    keyline: "#ffffff",
    annotationBg: "#ffffff",
    annotationText: "#17232c",
    accent: "#146b83",
    overlayFill: "rgba(23,35,44,0.08)",
    overlayStroke: "rgba(23,35,44,0.42)",
    cursor: "rgba(23,35,44,0.86)",
  },
};

const LIGHT_EEG_CHAIN_COLORS: Record<keyof typeof EEG_CHAIN_COLORS, string> = {
  "left-temporal": "#087f9b",
  "left-parasagittal": "#315fb4",
  midline: "#53636f",
  "right-parasagittal": "#9a6011",
  "right-temporal": "#ad3d3d",
  unknown: "#53636f",
};

const LIGHT_AUX_TRACE_COLORS: Record<string, string> = {
  ekg: "#b33434",
  eog: "#774694",
  emg: "#9a6011",
  extra: "#53636f",
  dc: "#16735f",
  other: "#53636f",
};

const LIGHT_MORPH_COLORS: Record<keyof typeof MORPH_COLOR, string> = {
  spike: "#b33434",
  sharp: "#9a6011",
  slow: "#146b83",
  "spike-wave": "#087f9b",
  polyspike: "#ad3d3d",
  periodic: "#774694",
  "burst-suppression": "#53636f",
  spindle: "#26754a",
  alpha: "#16735f",
  triphasic: "#92600b",
  blink: "#806b34",
  qrs: "#ad3d3d",
  muscle: "#69488c",
  comment: "#53636f",
};

function annotationColorForTheme(type: keyof typeof MORPH_COLOR, theme: ResolvedTheme): string {
  return theme === "light" ? LIGHT_MORPH_COLORS[type] : MORPH_COLOR[type];
}

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

const NATUS_CHAIN_BY_PAIR: Record<string, string> = {
  "FP1-F7": "banana:left-temporal",
  "F7-T3": "banana:left-temporal",
  "T3-T5": "banana:left-temporal",
  "T5-O1": "banana:left-temporal",
  "FP1-F3": "banana:left-parasagittal",
  "F3-C3": "banana:left-parasagittal",
  "C3-P3": "banana:left-parasagittal",
  "P3-O1": "banana:left-parasagittal",
  "FZ-CZ": "banana:midline",
  "CZ-PZ": "banana:midline",
  "FP2-F4": "banana:right-parasagittal",
  "F4-C4": "banana:right-parasagittal",
  "C4-P4": "banana:right-parasagittal",
  "P4-O2": "banana:right-parasagittal",
  "FP2-F8": "banana:right-temporal",
  "F8-T4": "banana:right-temporal",
  "T4-T6": "banana:right-temporal",
  "T6-O2": "banana:right-temporal",
};

function laneGroup(track: ProcessedTrack, index: number, list: ProcessedTrack[]): string {
  if (track.kind === "ekg") return "ekg";
  if (track.kind !== "eeg") return `aux:${track.kind}`;
  // Use the derivation identity first so a sparse recording or a future
  // montage ordering change cannot make one longitudinal chain split colors.
  const normalizePair = (value: string) =>
    value
      .replace(/^banana:/i, "")
      .replace(/^EEG\s+/i, "")
      .toUpperCase()
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, "");
  const pair = normalizePair(track.id);
  const explicit = NATUS_CHAIN_BY_PAIR[pair];
  if (explicit) return explicit;
  // Some EDF/montage adapters preserve the derivation in the display label
  // while giving the processed track a legacy id. Recognize that label before
  // consulting the ordered fallback so known Natus pairs never hash/alternate.
  const labelPair = normalizePair(track.label);
  const labelExplicit = NATUS_CHAIN_BY_PAIR[labelPair];
  if (labelExplicit) return labelExplicit;
  if (!track.id.startsWith("banana:")) return "eeg";
  // Keep a safe ordered fallback for legacy/unknown banana identities.
  const bananaIndex = list.findIndex((candidate) => candidate.id === track.id);
  if (bananaIndex < 4) return "banana:left-temporal";
  if (bananaIndex < 8) return "banana:left-parasagittal";
  if (bananaIndex < 10) return "banana:midline";
  if (bananaIndex < 14) return "banana:right-parasagittal";
  return "banana:right-temporal";
}

function traceColorForLane(
  group: string,
  kind: ProcessedTrack["kind"],
  laterality: ProcessedTrack["laterality"],
  id: string,
  theme: ResolvedTheme = "dark",
): string {
  if (kind !== "eeg") {
    return theme === "light"
      ? LIGHT_AUX_TRACE_COLORS[kind] ?? stableTraceColor(id, kind, laterality)
      : AUX_TRACE_COLORS[kind] ?? stableTraceColor(id, kind, laterality);
  }
  const chain = group.replace(/^banana:/, "") as keyof typeof EEG_CHAIN_COLORS;
  if (group.startsWith("banana:") && chain in EEG_CHAIN_COLORS) {
    return theme === "light" ? LIGHT_EEG_CHAIN_COLORS[chain] : EEG_CHAIN_COLORS[chain];
  }
  const fallbackChain: keyof typeof EEG_CHAIN_COLORS =
    laterality === "left"
      ? "left-parasagittal"
      : laterality === "right"
        ? "right-parasagittal"
        : laterality === "midline"
          ? "midline"
          : "unknown";
  return theme === "light"
    ? LIGHT_EEG_CHAIN_COLORS[fallbackChain]
    : stableTraceColor(id, kind, laterality);
}

function laneLayout(
  list: ProcessedTrack[],
  plotHeight: number,
  hiddenTrackIds: readonly string[] = [],
): LaneRect[] {
  const count = list.length;
  if (count === 0) return [];
  const hidden = new Set(hiddenTrackIds);
  const boundaries = list.reduce(
    (total, track, index) =>
      index > 0 && laneGroup(list[index - 1]!, index - 1, list) !== laneGroup(track, index, list)
        ? total + 1
        : total,
    0,
  );
  // Keep hidden channels compact, then distribute all remaining plot height
  // across visible channels so a large viewport is fully utilized.
  const gap = boundaries > 0 ? CHAIN_GAP : 0;
  const available = Math.max(1, plotHeight - boundaries * gap);
  const hiddenCount = list.reduce((total, track) => total + (hidden.has(track.id) ? 1 : 0), 0);
  const visibleCount = count - hiddenCount;
  // Keep compact rows usable even when the viewport is short. If there is not
  // enough room for every fixed-height chip, shrink the chips before allowing
  // the visible lanes to collapse below one pixel.
  const hiddenHeight =
    hiddenCount > 0
      ? Math.min(
          HIDDEN_LANE_HEIGHT,
          Math.max(1, (available - visibleCount) / hiddenCount),
        )
      : 0;
  const visibleHeight = visibleCount > 0
    ? Math.max(1, (available - hiddenCount * hiddenHeight) / visibleCount)
    : 0;
  let top = 0;
  return list.map((track, index) => {
    const height = hidden.has(track.id) ? hiddenHeight : visibleHeight;
    const rect = { top, height };
    top += height;
    if (index < count - 1 && laneGroup(track, index, list) !== laneGroup(list[index + 1]!, index + 1, list)) {
      top += gap;
    }
    return rect;
  });
}

function laneAtY(
  list: ProcessedTrack[],
  plotHeight: number,
  y: number,
  hiddenTrackIds: readonly string[] = [],
): number {
  const lanes = laneLayout(list, plotHeight, hiddenTrackIds);
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

function clearWaveformCanvas(ctx: CanvasRenderingContext2D, cssW: number, cssH: number, dpr: number, theme: ResolvedTheme) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = CANVAS_PALETTES[theme].bg;
  ctx.fillRect(0, 0, cssW, cssH);
}

function drawNativeTrace(
  ctx: CanvasRenderingContext2D,
  window: NativeTraceWindow,
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

function drawPeakHoldEnvelope(
  ctx: CanvasRenderingContext2D,
  window: EnvelopeTraceWindow,
  x0: number,
  plotW: number,
  mid: number,
  scale: number,
  sign: number,
  color: string,
  alpha: number,
  offset = 0,
) {
  const dpr = ctx.getTransform().a || 1;
  const minPx = 1 / dpr;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (const column of peakHoldColumns(window, plotW)) {
    const yA = mid + sign * (column.min - offset) * scale;
    const yB = mid + sign * (column.max - offset) * scale;
    const top = Math.min(yA, yB);
    const height = Math.max(minPx, Math.abs(yB - yA));
    ctx.fillRect(x0 + column.x, top, Math.max(column.width, minPx), height);
  }
  ctx.globalAlpha = 1;
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
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.lineWidth = Math.max(0.8, 0.95 * weight);
  if (trace.mode === "native") {
    drawNativeTrace(ctx, trace, sampleRate, x0, span, viewStart, plotW, mid, scale, sign, offset);
    ctx.globalAlpha = 1;
    return;
  }
  // Peak-hold columns: every source sample in a pixel contributes to that
  // pixel's min and max, so transients keep their true amplitude.
  drawPeakHoldEnvelope(ctx, trace, x0, plotW, mid, scale, sign, color, alpha, offset);
}

/**
 * Draw the full derivation name at the fixed left edge of its lane. This is
 * painted after the trace with an opaque patch, so the trace can never run
 * through the text. Because x is derived from the plot edge rather than the
 * visible time window, labels stay put while the EEG is panned.
 */
function drawLaneLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  mid: number,
  laneHeight: number,
  color: string,
  hidden = false,
  theme: ResolvedTheme = "dark",
) {
  const palette = CANVAS_PALETTES[theme];
  const fontSize = hidden ? Math.min(11, Math.max(9, laneHeight - 10)) : Math.min(16, Math.max(13, laneHeight - 18));
  const font = `${hidden ? 600 : 750} ${fontSize}px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace`;
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const text = hidden ? `${label} · hidden` : label;
  const padX = hidden ? 5 : 7;
  const padY = hidden ? 3 : 4;
  const textWidth = ctx.measureText(text).width;
  // Use the same plot background as the canvas rather than translucency;
  // even high-amplitude traces are fully cleared behind the name.
  ctx.fillStyle = palette.labelBg;
  ctx.fillRect(x, mid - fontSize / 2 - padY, textWidth + padX * 2 + 3, fontSize + padY * 2);
  if (!hidden) {
    ctx.fillStyle = color;
    ctx.fillRect(x, mid - fontSize / 2 - padY, 3, fontSize + padY * 2);
    ctx.fillStyle = palette.labelText;
    ctx.fillText(text, x + padX + 2, mid);
  } else {
    ctx.fillStyle = palette.labelHiddenText;
    ctx.fillText(text, x + padX, mid);
  }
  ctx.restore();
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

function formatAnnotationTime(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60);
  const remainder = (safe - minutes * 60).toFixed(2).padStart(5, "0");
  return `${minutes}:${remainder}`;
}

function annotationInlineLabel(annotation: Annotation): string {
  const type =
    ANNOTATION_TYPES.find((candidate) => candidate.id === annotation.type)?.label ?? annotation.type;
  const note = annotation.text.trim().replace(/\s+/g, " ");
  const timing =
    annotation.end - annotation.start > 0.02
      ? `${formatAnnotationTime(annotation.start)} · ${(annotation.end - annotation.start).toFixed(2)} s`
      : formatAnnotationTime(annotation.start);
  return `${type}${note ? ` · ${note}` : ""} · ${timing}`;
}

function drawInlineAnnotationLabel(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  layout: { x0: number; x1: number; lanes: AnnotationLane[]; global: boolean },
  plotX: number,
  plotW: number,
  _viewStart: number,
  _viewDuration: number,
  cssW: number,
  cssH: number,
  theme: ResolvedTheme = "dark",
) {
  const palette = CANVAS_PALETTES[theme];
  const text = annotationInlineLabel(annotation);
  const font = "700 12px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
  const padX = 8;
  const padY = 5;
  const height = 23;
  const plotRight = plotX + plotW;
  const maxWidth = Math.max(80, Math.min(330, plotW - 12));

  ctx.save();
  ctx.font = font;
  const fullWidth = ctx.measureText(text).width + padX * 2;
  const labelWidth = Math.min(maxWidth, fullWidth);
  let labelText = text;
  if (fullWidth > maxWidth) {
    const ellipsis = "…";
    const available = Math.max(12, maxWidth - padX * 2 - ctx.measureText(ellipsis).width);
    while (labelText.length > 1 && ctx.measureText(labelText).width > available) {
      labelText = labelText.slice(0, -1);
    }
    labelText += ellipsis;
  }

  // Prefer the right side of the marker, then flip to the left near the edge.
  // Keep a guard over the channel-name plate so the two labels never obscure
  // one another at the start of a lane.
  const leftGuard = plotX + Math.min(104, Math.max(8, plotW - labelWidth));
  const preferredRight = layout.x1 + 7;
  const preferredLeft = layout.x0 - labelWidth - 7;
  let x = preferredRight + labelWidth <= plotRight - 4 ? preferredRight : preferredLeft;
  x = clamp(x, leftGuard, Math.max(leftGuard, plotRight - labelWidth - 4));

  const lane = layout.lanes[0];
  const laneTop = lane?.top ?? 0;
  const laneBottom = lane?.bottom ?? Math.min(cssH, RULER + EVENT_LANE + height + 4);
  // Put a global event in the first waveform lane; channel-specific events sit
  // at the top of their lane, keeping the annotation visually tied to its row.
  let y = layout.global ? RULER + 2 : laneTop + 2;
  if (y + height > laneBottom - 2) y = Math.max(laneTop + 1, laneBottom - height - 2);
  y = clamp(y, 1, Math.max(1, cssH - height - 1));

  const color = annotationColorForTheme(annotation.type, theme);
  ctx.globalAlpha = 1;
  // The label sits on top of a live trace, so a translucent fill is too easy
  // to lose. Use an opaque plate and a contrasting outer keyline before the semantic
  // color border; this keeps both the text and the marker identity legible on
  // bright, high-amplitude waveforms.
  ctx.shadowColor = `${color}66`;
  ctx.shadowBlur = 6;
  ctx.fillStyle = palette.annotationBg;
  ctx.fillRect(x, y, labelWidth, height);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = palette.keyline;
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, y + 2, Math.max(1, labelWidth - 4), height - 4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, Math.max(1, labelWidth - 2), height - 2);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, 4, height - 2);
  ctx.fillStyle = palette.annotationText;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(labelText, x + padX + 3, y + height / 2);
  ctx.restore();
}

function drawAnnotationStartLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  color: string,
  source: Annotation["source"],
  selected: boolean,
  cssH: number,
  theme: ResolvedTheme = "dark",
) {
  const palette = CANVAS_PALETTES[theme];
  // Give every marker a visible time anchor, including channel-specific
  // annotations. A dark under-stroke preserves contrast over both quiet and
  // saturated traces; the colored stroke above it keeps the annotation
  // distinct from the review cursor (which remains cyan and dashed).
  const alignedX = Math.round(x) + 0.5;
  const lineWidth = selected ? 2.5 : 1.5;
  ctx.save();
  ctx.globalAlpha = selected ? 0.95 : 0.82;
  ctx.strokeStyle = palette.keyline;
  ctx.lineWidth = lineWidth + 2.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(alignedX, 0);
  ctx.lineTo(alignedX, cssH);
  ctx.stroke();
  ctx.globalAlpha = selected ? 1 : 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(source === "auto" ? [5, 4] : source === "file" ? [2, 3] : []);
  ctx.beginPath();
  ctx.moveTo(alignedX, 0);
  ctx.lineTo(alignedX, cssH);
  ctx.stroke();
  ctx.restore();
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

export function WaveformView({ effectiveTheme = "dark" }: { effectiveTheme?: ResolvedTheme }) {
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
  const hoveredAnnotationRef = useRef<string | null>(null);
  const [lanePlotHeight, setLanePlotHeight] = useState(600);
  const [gutterCollapsed, setGutterCollapsed] = useState(false);
  const gutterWidth = gutterCollapsed ? GUTTER_COLLAPSED : GUTTER_EXPANDED;
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

  // Keep the React gutter's lane rectangles in lockstep with the canvas after
  // a resize. The drawing and hit-testing paths calculate the same geometry
  // from the live surface height.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const update = () => setLanePlotHeight(Math.max(1, wrap.clientHeight - RULER));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

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
            dataRevision: s.displaySegment ?? s.segment,
            trackIds: editorList.map((track) => `${track.id}:${track.sampleRate}`),
            viewStart: Number(viewStart.toFixed(4)),
            viewDuration: Number(viewDur.toFixed(4)),
            sensitivityUv: s.sensitivityUv,
            negativeUp: s.negativeUp,
            width: cssW,
            height: cssH,
            dpr,
            trackStateKey: `${effectiveTheme}|gutter:${gutterWidth}|rev:${s.displayRevision}|` + Object.values(s.tracks)
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
              gutterWidth,
              effectiveTheme,
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
            s.hoverCursor,
            laneLayout(editorList, Math.max(1, cssH - RULER), s.hiddenTrackIds),
            hoveredAnnotationRef.current,
            s.machineFindings,
            s.selectedFindingId,
            gutterWidth,
            effectiveTheme,
          );
          if (!editorReady && waveSig !== "waiting-for-display-window") {
            clearWaveformCanvas(ectx, cssW, cssH, dpr, effectiveTheme);
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
            trackStateKey: `${effectiveTheme}|overview|hidden:${s.hiddenTrackIds.join(",")}`,
          });
          if (osig !== ovSig) {
            ovSig = osig;
            drawOverviewWaves(ctx, ovW, ovH, overviewList, s, total, effectiveTheme);
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
            s.machineFindings,
            s.selectedFindingId,
            effectiveTheme,
          );
        }
      }

      if (s.showDsa && dsaW >= 8 && dsaH >= 8) {
        sizeCanvas(dsa, dsaW, dsaH, dpr);
        sizeCanvas(dsaOv, dsaW, dsaH, dpr);
        const ctx = dsa.getContext("2d");
        const octx = dsaOv.getContext("2d");
        if (ctx && octx) {
          const sig = `${effectiveTheme}|${s.dsa?.nTime ?? 0}|${s.dsa?.dbMin ?? 0}|${s.dsa?.dbMax ?? 0}|${dsaW}|${dsaH}`;
          if (sig !== dsaSig) {
            dsaSig = sig;
            drawDsa(ctx, dsa, dsaW, dsaH, s.dsa, effectiveTheme);
          }
          drawDsaOverlay(octx, dsaW, dsaH, t, viewStart, viewDur, total, effectiveTheme);
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
  }, [effectiveTheme, gutterWidth, gutterCollapsed]);

  const onRulerPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!segment || !wrapRef.current || !surfaceRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const plotW = Math.max(1, surfaceRef.current.clientWidth - gutterWidth);
    const x = e.clientX - rect.left + wrapRef.current.scrollLeft - gutterWidth;
    const frac = clamp(x / plotW, 0, 1);
    const s = useEegStore.getState();
    if (s.followPlayhead) s.setFollow(false);
    const latest = useEegStore.getState();
    const t = timeAtFraction(frac, latest.viewStart, latest.viewDuration);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    seekEeg(t, "user");
    dragRef.current = { kind: "scrub", x0: e.clientX, start0: latest.viewStart, dur0: latest.viewDuration };
    if (latest.audibleScrub) playback.scrubAt(t, 0);
  };

  const onEditorPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!segment || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const surface = surfaceRef.current;
    if (!surface) return;
    const plotW = surface.clientWidth - gutterWidth;
    const contentX = e.clientX - rect.left + wrapRef.current.scrollLeft;
    const x = contentX - gutterWidth;
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
    const lanes = laneLayout(pointerTracks, Math.max(1, rect.height - RULER), latest.hiddenTrackIds);
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
        plotX: gutterWidth,
        plotWidth: plotW,
        plotTop: RULER,
        laneHeight: laneH,
        laneRects: lanes,
        laneIds,
        eventRailHeight: EVENT_LANE,
      },
    );
    if (annotationId && latest.tool === "pan") {
      latest.selectAnnotation(annotationId);
      return;
    }
    // Pan is the baseline interaction: dragging moves the review window while
    // clicking empty trace seeks the EEG cursor.
    if (s.tool === "pan") {
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
      const lane = y >= RULER
        ? laneAtY(pointerTracks, Math.max(1, rect.height - RULER), y - RULER, latest.hiddenTrackIds)
        : -1;
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
      if (rect && contentX >= gutterWidth && list.length > 0 && e.clientY - rect.top >= RULER) {
        const plotW = Math.max(1, (surfaceRef.current?.clientWidth ?? rect.width) - gutterWidth);
        const lane = laneAtY(
          list,
          Math.max(1, rect.height - RULER),
          e.clientY - rect.top - RULER,
          state.hiddenTrackIds,
        );
        const next = list[lane]?.id ?? null;
        const frac = clamp((e.clientX - rect.left + (wrapRef.current?.scrollLeft ?? 0) - gutterWidth) / plotW, 0, 1);
        const timeSec = timeAtFraction(frac, state.viewStart, state.viewDuration);
        const hover = { timeSec, trackId: next };
        const laneRects = laneLayout(list, Math.max(1, rect.height - RULER), state.hiddenTrackIds);
        const annotationCandidates = state.showAnnotations
          ? state.annotations.filter(
              (annotation) =>
                annotation.source !== "auto" || (state.showAuto && annotation.type !== "qrs"),
            )
          : [];
        const annotationId = hitTestAnnotations(
          annotationCandidates,
          contentX,
          e.clientY - rect.top,
          {
            viewStart: state.viewStart,
            viewDuration: state.viewDuration,
            plotX: gutterWidth,
            plotWidth: plotW,
            plotTop: RULER,
            laneHeight: Math.max(1, (rect.height - RULER) / Math.max(1, list.length)),
            laneRects,
            laneIds: list.map((track) => track.id),
            eventRailHeight: EVENT_LANE,
          },
        );
        if (
          next !== hoveredTrackRef.current ||
          !state.hoverCursor ||
          Math.abs(state.hoverCursor.timeSec - timeSec) > 1e-4 ||
          annotationId !== hoveredAnnotationRef.current
        ) {
          hoveredTrackRef.current = next;
          hoveredAnnotationRef.current = annotationId;
          state.setHoverCursor(hover);
          paintRef.current();
        }
      }
      return;
    }
    const s = useEegStore.getState();
    if (drag.kind === "caliper" && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const plotW = Math.max(1, (surfaceRef.current?.clientWidth ?? rect.width) - gutterWidth);
      const x = e.clientX - rect.left + wrapRef.current.scrollLeft - gutterWidth;
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
      const plotW = Math.max(1, (surfaceRef.current?.clientWidth ?? rect.width) - gutterWidth);
      const x = e.clientX - rect.left + wrapRef.current.scrollLeft - gutterWidth;
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
      const plotW = Math.max(1, (surfaceRef.current?.clientWidth ?? rect.width) - gutterWidth);
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
    if (
      hoveredTrackRef.current !== null ||
      hoveredAnnotationRef.current !== null ||
      useEegStore.getState().hoverCursor
    ) {
      hoveredTrackRef.current = null;
      hoveredAnnotationRef.current = null;
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
      const x = e.clientX - rect.left + wrap.scrollLeft - gutterWidth;
      const follow = s.followPlayhead && playback.playing;
      const vs = follow
        ? followViewStart(eegNow(s), s.viewDuration, s.segment!.duration)
        : s.viewStart;
      const frac = clamp(x / Math.max(1, (surfaceRef.current?.clientWidth ?? rect.width) - gutterWidth), 0, 1);
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
  const hiddenTrackIds = useEegStore((s) => s.hiddenTrackIds);
  const renderedLanes = laneLayout(
    list,
    lanePlotHeight,
    hiddenTrackIds,
  );

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
          tool === "pan" ? "cursor-grab touch-none" : "cursor-crosshair",
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
          <button
            type="button"
            className="pointer-events-auto absolute left-1 top-0 z-30 grid h-[18px] w-6 place-items-center rounded-sm text-subtle hover:bg-surface-2 hover:text-fg"
            aria-expanded={!gutterCollapsed}
            aria-label={gutterCollapsed ? "Show channel controls" : "Hide channel controls"}
            title={gutterCollapsed ? "Show channel controls" : "Hide channel controls"}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setGutterCollapsed((collapsed) => !collapsed);
            }}
          >
            {gutterCollapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
          </button>
          <div
            className="pointer-events-auto absolute right-0 top-0 z-20 h-[18px] cursor-ew-resize"
            style={{ left: gutterWidth }}
            aria-label="Seek timeline"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={segment?.duration ?? 0}
            onPointerDown={(event) => {
              event.stopPropagation();
              onRulerPointer(event);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {list.length > 0 && (
            <div
              className="pointer-events-none absolute bottom-0 left-0 z-10"
              style={{ top: RULER, width: gutterWidth }}
            >
              {list.map((tr, index) => (
                <TrackGutter
                  key={tr.id}
                  track={tr}
                  previous={list[index - 1]}
                  group={laneGroup(tr, index, list)}
                  previousGroup={index > 0 ? laneGroup(list[index - 1]!, index - 1, list) : undefined}
                  collapsed={gutterCollapsed}
                  lane={renderedLanes[index]}
                  theme={effectiveTheme}
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
              Open a deidentified EDF/EDF+ file. The bundled recording loads automatically, and all
              processing stays in this browser.
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
  gutterWidth: number,
  theme: ResolvedTheme = "dark",
) {
  const palette = CANVAS_PALETTES[theme];
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
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const plotX = gutterWidth;
  const plotW = Math.max(10, cssW - gutterWidth);
  const plotTop = RULER;
  const plotH = Math.max(10, cssH - RULER);
  const n = Math.max(1, list.length);
  const lanes = laneLayout(list, plotH, s.hiddenTrackIds);
  const laneH = lanes[0]?.height ?? plotH / n;
  const sign = s.negativeUp ? -1 : 1;
  const span = Math.max(1e-6, viewEnd - viewStart);
  const localViewStart = viewStart - sampleStart;
  const localViewEnd = viewEnd - sampleStart;

  ctx.fillStyle = palette.ruler;
  ctx.fillRect(0, 0, cssW, RULER);
  ctx.strokeStyle = palette.gridStrong;
  ctx.beginPath();
  ctx.moveTo(0, RULER - 0.5);
  ctx.lineTo(cssW, RULER - 0.5);
  ctx.stroke();

  // Keep the trace grid on real one-second boundaries instead of coupling it
  // to the sparser ruler-label cadence. At wide views, fade the grid as the
  // seconds compress and remove it before the lines become visual noise.
  const pixelsPerSecond = plotW / span;
  const showSecondGrid = pixelsPerSecond >= 6;
  if (showSecondGrid) {
    const clarity = clamp((pixelsPerSecond - 6) / 26, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.18 + clarity * 0.72;
    ctx.strokeStyle = palette.gridStrong;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let second = Math.ceil(viewStart); second <= viewEnd + 1e-6; second += 1) {
      const x = Math.round(plotX + ((second - viewStart) / span) * plotW) + 0.5;
      ctx.moveTo(x, RULER);
      ctx.lineTo(x, cssH);
    }
    ctx.stroke();
    ctx.restore();
  }

  const step = niceStep(span);
  const t0 = Math.ceil(viewStart / step) * step;
  ctx.font = "500 10px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
  ctx.fillStyle = palette.muted;
  ctx.textBaseline = "middle";
  for (let t = t0; t <= viewEnd + 1e-6; t += step) {
    const x = plotX + ((t - viewStart) / span) * plotW;
    ctx.strokeStyle = palette.gridStrong;
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
      ctx.fillStyle = palette.spacer;
      ctx.fillRect(0, y0 - (lane.top - (lanes[i - 1]?.top ?? 0) - (lanes[i - 1]?.height ?? 0)), cssW, lane.top - (lanes[i - 1]?.top ?? 0) - (lanes[i - 1]?.height ?? 0));
    }
    ctx.strokeStyle = palette.laneMid;
    ctx.beginPath();
    ctx.moveTo(plotX, mid);
    ctx.lineTo(plotX + plotW, mid);
    ctx.stroke();
    ctx.strokeStyle = palette.laneBottom;
    ctx.beginPath();
    ctx.moveTo(0, y0 + laneHeight);
    ctx.lineTo(cssW, y0 + laneHeight);
    ctx.stroke();

    if (s.hiddenTrackIds.includes(tr.id)) {
      // A hidden channel keeps its lane so every remaining trace, annotation,
      // and group boundary stays at the same vertical position. The gutter's
      // eye button is the one-click restore affordance for this placeholder.
      ctx.fillStyle = palette.hiddenFill;
      ctx.fillRect(plotX, y0 + 1, plotW, Math.max(1, laneHeight - 2));
      ctx.strokeStyle = palette.hiddenLine;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(plotX + 8, mid);
      ctx.lineTo(plotX + plotW - 8, mid);
      ctx.stroke();
      ctx.setLineDash([]);
      if (laneHeight >= 16) drawLaneLabel(ctx, tr.label, plotX + 8, mid, laneHeight, palette.muted, true, theme);
      return;
    }

    const st = s.tracks[tr.id];
    const live = audible.has(tr.id);
    const lat = st?.lateralityOverride ?? tr.laterality;
    const color = traceColorForLane(laneGroup(tr, i, list), tr.kind, lat, tr.id, theme);
    const hovered = hoveredTrackId === tr.id;
    const alpha = hovered
      ? 1
      : live
        ? 1
        : anySolo || st?.mute
          ? 0.2
          : 0.56;
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
    // The label is part of the lane, not part of the utility gutter. Keep it
    // painted after the trace even when S/M controls are collapsed so the
    // derivation name stays put at the start of every waveform.
    drawLaneLabel(ctx, tr.label, plotX + 8, mid, laneHeight, color, false, theme);
  });

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
  hoverCursor: { timeSec: number; trackId: string | null } | null = null,
  lanes: LaneRect[] = [],
  hoveredAnnotationId: string | null = null,
  machineFindings: UnifiedAbnormalityFinding[] = [],
  selectedFindingId: string | null = null,
  gutterWidth: number = GUTTER_EXPANDED,
  theme: ResolvedTheme = "dark",
) {
  const palette = CANVAS_PALETTES[theme];
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const plotX = gutterWidth;
  const plotW = Math.max(10, cssW - gutterWidth);
  const viewEnd = viewStart + viewDur;
  const selectedFinding = machineFindings.find((finding) => finding.id === selectedFindingId && finding.reviewStatus !== "dismissed");
  if (selectedFinding) {
    const x0 = plotX + clamp((selectedFinding.interval.start - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
    const x1 = plotX + clamp((selectedFinding.interval.end - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
    ctx.fillStyle = "rgba(242,200,121,0.15)";
    ctx.fillRect(Math.min(x0, x1), RULER, Math.max(3, Math.abs(x1 - x0)), cssH - RULER);
    ctx.strokeStyle = "rgba(242,200,121,0.95)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(Math.min(x0, x1) + 0.5, RULER + 0.5, Math.max(2, Math.abs(x1 - x0) - 1), cssH - RULER - 1);
    ctx.setLineDash([]);
    const findingLaneIds = tracks.filter((track) => track.kind !== "extra").map((track) => track.id);
    for (const derivation of selectedFinding.displayedDerivations) {
      const laneIndex = findingLaneIds.indexOf(derivation.id);
      if (laneIndex < 0) continue;
      const rect = lanes[laneIndex] ?? { top: laneIndex * ((cssH - RULER) / Math.max(1, findingLaneIds.length)), height: (cssH - RULER) / Math.max(1, findingLaneIds.length) };
      ctx.strokeStyle = "rgba(242,200,121,0.95)";
      ctx.lineWidth = 2;
      ctx.strokeRect(plotX + 2, RULER + rect.top + 2, Math.max(2, plotW - 4), Math.max(2, rect.height - 4));
    }
    ctx.fillStyle = "#f2c879";
    ctx.font = "600 10px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
    ctx.fillText(`FINDING · ${selectedFinding.label || selectedFinding.type}`, plotX + 7, RULER + 11);
  }
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
      const color = annotationColorForTheme(annotation.type, theme);
      const selectedAlpha = layout.selected ? 0.24 : 0.12;
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
      // layoutAnnotation clamps spans that begin before the viewport to the
      // plot edge. Only draw a start guide when the actual annotation start is
      // in view, otherwise a region that began offscreen would look as though
      // it starts at the left edge.
      const startsInView = annotation.start >= viewStart - 1e-6 && annotation.start <= viewEnd + 1e-6;
      if (startsInView) {
        drawAnnotationStartLine(ctx, layout.x0, color, annotation.source, layout.selected, cssH, theme);
      }
      // Keep the event-rail end edge for regions. The start edge above is the
      // full-height anchor; this short edge avoids adding a second full-height
      // guide that could be confused with another marker's start.
      if (layout.x1 - layout.x0 > 2) {
        ctx.globalAlpha = layout.selected ? 0.95 : 0.7;
        ctx.strokeStyle = color;
        ctx.lineWidth = layout.selected ? 1.5 : 1;
        ctx.setLineDash(annotation.source === "auto" ? [4, 3] : annotation.source === "file" ? [2, 2] : []);
        ctx.beginPath();
        ctx.moveTo(layout.x1, 0);
        ctx.lineTo(layout.x1, layout.global ? cssH : EVENT_LANE);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (layout.id === hoveredAnnotationId) {
        drawInlineAnnotationLabel(ctx, annotation, layout, plotX, plotW, viewStart, viewDur, cssW, cssH, theme);
      }
    }
    ctx.globalAlpha = 1;
  }
  if (caliper) {
    const xa = plotX + clamp((caliper.a - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
    const xb = plotX + clamp((caliper.b - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
    ctx.fillStyle = palette.overlayFill;
    ctx.fillRect(Math.min(xa, xb), 0, Math.abs(xb - xa), cssH);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xa, 0);
    ctx.lineTo(xa, cssH);
    ctx.moveTo(xb, 0);
    ctx.lineTo(xb, cssH);
    ctx.stroke();
    ctx.fillStyle = palette.text;
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
    ctx.strokeStyle = palette.accent;
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
        ctx.fillStyle = palette.overlayFill;
        const rect = lanes[lane] ?? { top: lane * laneHeight, height: laneHeight };
        ctx.fillRect(plotX, RULER + rect.top, plotW, rect.height);
      }
    }
  }
  if (t < viewStart || t > viewStart + viewDur) return;
  const frac = (t - viewStart) / Math.max(1e-6, viewDur);
  const x = plotX + clamp(frac, 0, 1) * plotW;
  ctx.strokeStyle = palette.cursor;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, cssH);
  ctx.stroke();
  ctx.fillStyle = palette.cursor;
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
  theme: ResolvedTheme = "dark",
) {
  const palette = CANVAS_PALETTES[theme];
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = palette.ruler;
  ctx.fillRect(0, 0, cssW, cssH);
  if (list.length === 0 || total <= 0) return;
  const nPix = Math.max(1, Math.ceil(cssW * dpr));
  const n = Math.max(1, list.length);
  const overviewPlotH = Math.max(1, cssH - 8);
  const lanes = laneLayout(list, overviewPlotH, s.hiddenTrackIds);
  const laneH = lanes[0]?.height ?? overviewPlotH / n;
  const sign = s.negativeUp ? -1 : 1;
  list.forEach((tr, i) => {
    const lane = lanes[i] ?? { top: i * laneH, height: laneH };
    const y0 = 4 + lane.top;
    const rowHeight = lane.height;
    const mid = y0 + rowHeight / 2;
    if (s.hiddenTrackIds.includes(tr.id)) {
      // Keep the hidden channel in order while collapsing its overview row to
      // the same compact height used by the editor.
      ctx.fillStyle = palette.hiddenFill;
      ctx.fillRect(0, y0 + 1, cssW, Math.max(1, rowHeight - 2));
      ctx.strokeStyle = palette.hiddenLine;
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
      ? mapTraceWindow(raw, (value) =>
          Math.max(-profile.clipUv, Math.min(profile.clipUv, value - profile.baselineUv)),
        )
      : raw;
    const scale = displayScaleForChannel(rowHeight, s.sensitivityUv, tr.kind, profile);
    const color = traceColorForLane(laneGroup(tr, i, list), tr.kind, lat, tr.id, theme);
    if (display.mode !== "envelope") return;
    // The overview is a navigation aid, not a full-resolution trace. Drawing
    // a min/max bar at every pixel turns dense recordings into a solid block
    // of color, so use a light connected envelope and only a sparse set of
    // whiskers for brief transients.
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 0.8;
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";
    ctx.beginPath();
    for (let p = 0; p < display.min.length; p++) {
      const x = ((p + 0.5) / display.min.length) * cssW;
      const y = mid + sign * display.min[p]! * scale;
      if (p === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let p = 0; p < display.max.length; p++) {
      const x = ((p + 0.5) / display.max.length) * cssW;
      const y = mid + sign * display.max[p]! * scale;
      if (p === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    const whiskerStride = Math.max(1, Math.ceil(display.min.length / Math.max(1, cssW / 4)));
    for (let p = 0; p < display.min.length; p += whiskerStride) {
      const x = ((p + 0.5) / display.min.length) * cssW;
      ctx.moveTo(x, mid + sign * display.min[p]! * scale);
      ctx.lineTo(x, mid + sign * display.max[p]! * scale);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  ctx.fillStyle = palette.muted;
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
  machineFindings: UnifiedAbnormalityFinding[] = [],
  selectedFindingId: string | null = null,
  theme: ResolvedTheme = "dark",
) {
  const palette = CANVAS_PALETTES[theme];
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  if (total <= 0) return;
  const selectedFinding = machineFindings.find((finding) => finding.id === selectedFindingId && finding.reviewStatus !== "dismissed");
  if (selectedFinding) {
    const x0 = (selectedFinding.interval.start / total) * cssW;
    const x1 = (selectedFinding.interval.end / total) * cssW;
    ctx.fillStyle = "rgba(242,200,121,0.26)";
    ctx.fillRect(x0, 0, Math.max(3, x1 - x0), cssH);
    ctx.strokeStyle = "rgba(242,200,121,0.95)";
    ctx.strokeRect(x0 + 0.5, 0.5, Math.max(2, x1 - x0 - 1), cssH - 1);
  }
  if (showAnnotations) {
    for (const a of annotations) {
      if (a.source === "auto" && (a.type === "qrs" || !showAuto)) continue;
      const x = (a.start / total) * cssW;
      ctx.fillStyle = annotationColorForTheme(a.type, theme);
      ctx.fillRect(x, 0, 2, cssH);
    }
  }
  const x0 = (viewStart / total) * cssW;
  const x1 = ((viewStart + viewDur) / total) * cssW;
  ctx.fillStyle = palette.overlayFill;
  ctx.fillRect(x0, 0, Math.max(2, x1 - x0), cssH);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1.25;
  ctx.strokeRect(x0 + 0.5, 0.5, Math.max(2, x1 - x0 - 1), cssH - 1);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(x0 - 1, 0, 3, cssH);
  ctx.fillRect(x1 - 2, 0, 3, cssH);

  ctx.strokeStyle = palette.cursor;
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
  theme: ResolvedTheme = "dark",
) {
  const palette = CANVAS_PALETTES[theme];
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = palette.bg;
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
  ctx.strokeStyle = palette.gridStrong;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(DSA_LEFT, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) / 2);
  ctx.lineTo(cssW - DSA_RIGHT, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) / 2);
  ctx.stroke();
  ctx.fillStyle = palette.muted;
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
  ctx.fillStyle = palette.muted;
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
  theme: ResolvedTheme = "dark",
) {
  const palette = CANVAS_PALETTES[theme];
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
  ctx.fillStyle = palette.overlayFill;
  ctx.fillRect(x0, plotTop, Math.max(2, x1 - x0), plotH);
  ctx.strokeStyle = palette.overlayStroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, plotTop + 0.5, Math.max(2, x1 - x0 - 1), plotH - 1);
  ctx.strokeStyle = palette.cursor;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(plotX(t), plotTop);
  ctx.lineTo(plotX(t), plotTop + plotH);
  ctx.stroke();
  ctx.fillStyle = palette.cursor;
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
  group,
  previousGroup,
  collapsed,
  lane,
  theme,
}: {
  track: ProcessedTrack;
  previous?: ProcessedTrack;
  group: string;
  previousGroup?: string;
  collapsed: boolean;
  lane?: LaneRect;
  theme: ResolvedTheme;
}) {
  const st = useEegStore((s) => s.tracks[track.id]) as TrackState | undefined;
  const toggleMute = useEegStore((s) => s.toggleMute);
  const toggleSolo = useEegStore((s) => s.toggleSolo);
  const soloExclusive = useEegStore((s) => s.soloExclusive);
  const hidden = useEegStore((s) => s.hiddenTrackIds.includes(track.id));
  const toggleTrackVisibility = useEegStore((s) => s.toggleTrackVisibility);
  const lat = st?.lateralityOverride ?? track.laterality;
  const color = traceColorForLane(group, track.kind, lat, track.id, theme);
  const muted = Boolean(st?.mute);
  const solo = Boolean(st?.solo);
  return (
    <div
      className={cn(
        "pointer-events-auto absolute left-0 right-0 flex items-center gap-0.5 overflow-hidden border-b border-border/50 px-1",
        previous && displayBand(previous) !== displayBand(track) && "border-t-2 border-accent/30",
        previousGroup && previousGroup !== group && displayBand(previous!) === displayBand(track) && "border-t border-accent/35",
        hidden && "opacity-50",
        "border-l-2",
      )}
      style={{ ...(lane ? { top: lane.top, height: lane.height } : { top: 0, height: 0 }), borderLeftColor: color }}
    >
      {!collapsed && <>
        <button
          type="button"
          title={hidden ? "Show channel" : "Hide channel"}
          aria-label={`${hidden ? "Show" : "Hide"} ${track.label}`}
          aria-pressed={hidden}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => toggleTrackVisibility(track.id)}
          className={cn(
            "grid size-[18px] shrink-0 place-items-center rounded-sm text-subtle hover:bg-surface-2 hover:text-fg",
            hidden && "bg-surface-2",
          )}
        >
          {hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
        </button>
        <span
          className={cn(
            "grid size-[18px] shrink-0 place-items-center text-[0.5625rem] font-semibold uppercase",
            lat === "left" && "text-hemi-l",
            lat === "right" && "text-hemi-r",
            lat === "midline" && "text-hemi-c",
            lat === "unknown" && "text-subtle",
          )}
          aria-label={`Laterality ${lat}`}
        >
          {lat === "left" ? "L" : lat === "right" ? "R" : lat === "midline" ? "C" : "—"}
        </span>
        <button
          type="button"
          title="Solo — double-click for exclusive"
          aria-label={`Solo ${track.label}; double-click for exclusive solo`}
          aria-pressed={solo}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => toggleSolo(track.id)}
          onDoubleClick={() => soloExclusive(track.id)}
          className={cn(
            "grid size-[18px] shrink-0 place-items-center rounded-sm text-[0.625rem] font-bold",
            solo ? "bg-ok text-bg" : "bg-surface-2 text-subtle hover:text-fg",
          )}
        >
          S
        </button>
        <button
          type="button"
          title={muted ? "Unmute" : "Mute"}
          aria-label={`${muted ? "Unmute" : "Mute"} ${track.label}`}
          aria-pressed={muted}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => toggleMute(track.id)}
          className={cn(
            "grid size-[18px] shrink-0 place-items-center rounded-sm text-[0.625rem] font-bold",
            muted ? "bg-danger text-bg" : "bg-surface-2 text-subtle hover:text-fg",
          )}
        >
          M
        </button>
      </>}
      {collapsed && <span
        className={cn(
          "grid min-w-0 flex-1 place-items-center text-[0.5625rem] font-semibold uppercase",
          lat === "left" && "text-hemi-l",
          lat === "right" && "text-hemi-r",
          lat === "midline" && "text-hemi-c",
          lat === "unknown" && "text-subtle",
        )}
        aria-label={`Laterality ${lat}`}
      >
        {lat === "left" ? "L" : lat === "right" ? "R" : lat === "midline" ? "C" : "—"}
      </span>}
    </div>
  );
}
