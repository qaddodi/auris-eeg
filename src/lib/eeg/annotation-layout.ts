import { annotationTrackIds } from "./annotations.ts";
import type { Annotation, AnnotationSource } from "./types.ts";

export interface AnnotationLane {
  trackId: string;
  top: number;
  bottom: number;
}

export interface AnnotationLayoutOptions {
  viewStart: number;
  viewDuration: number;
  plotX: number;
  plotWidth: number;
  /** Top of the first waveform lane, below the time/event rail. */
  plotTop: number;
  laneHeight: number;
  /** Optional per-lane geometry for grouped displays with inter-chain gaps. */
  laneRects?: readonly { top: number; height: number }[];
  laneIds: readonly string[];
  /** Height reserved for the event rail above waveform lanes. */
  eventRailHeight?: number;
  /** Minimum visible width for an instantaneous marker. */
  minSpanPx?: number;
}

export interface AnnotationLayout {
  id: string;
  source: AnnotationSource;
  confidence: number;
  x0: number;
  x1: number;
  lanes: AnnotationLane[];
  global: boolean;
  selected: boolean;
}

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function laneFor(index: number, options: AnnotationLayoutOptions): AnnotationLane {
  const rect = options.laneRects?.[index];
  const top = options.plotTop + (rect?.top ?? index * options.laneHeight);
  const height = rect?.height ?? options.laneHeight;
  return { trackId: options.laneIds[index]!, top, bottom: top + height };
}

/** Converts one annotation into a clipped time span and its target waveform lanes. */
export function layoutAnnotation(
  annotation: Annotation,
  options: AnnotationLayoutOptions,
  selected = false,
): AnnotationLayout | null {
  const duration = finitePositive(options.viewDuration, 1);
  const width = Math.max(1, options.plotWidth);
  const viewEnd = options.viewStart + duration;
  if (annotation.end < options.viewStart || annotation.start > viewEnd) return null;

  const start = Math.min(annotation.start, annotation.end);
  const end = Math.max(annotation.end, start);
  const x0 =
    options.plotX + Math.max(0, Math.min(1, (start - options.viewStart) / duration)) * width;
  const rawX1 =
    options.plotX +
    Math.max(0, Math.min(1, (Math.max(end, start + 0.02) - options.viewStart) / duration)) * width;
  const x1 = Math.min(options.plotX + width, Math.max(x0 + (options.minSpanPx ?? 2), rawX1));

  const targets = annotationTrackIds(annotation);
  const targetIndices =
    targets === null
      ? options.laneIds.map((_, index) => index)
      : targets.length > 0
        ? targets
            .map((trackId) => options.laneIds.indexOf(trackId))
            .filter((index): index is number => index >= 0)
        : [];
  const lanes = [...new Set(targetIndices)].map((index) => laneFor(index, options));

  return {
    id: annotation.id,
    source: annotation.source,
    confidence: annotation.confidence,
    x0,
    x1,
    lanes,
    global: targets === null,
    selected,
  };
}

/** Lays out visible annotations in input order, retaining stable z-order. */
export function layoutAnnotations(
  annotations: readonly Annotation[],
  options: AnnotationLayoutOptions,
  selectedId: string | null = null,
): AnnotationLayout[] {
  return annotations.flatMap((annotation) => {
    const layout = layoutAnnotation(annotation, options, annotation.id === selectedId);
    return layout ? [layout] : [];
  });
}

/**
 * Hit-tests an annotation against editor coordinates. The event rail can select
 * any visible event; a waveform lane selects only events assigned to that lane.
 */
export function hitTestAnnotations(
  annotations: readonly Annotation[],
  x: number,
  y: number,
  options: AnnotationLayoutOptions,
  tolerancePx = 6,
): string | null {
  const railHeight = options.eventRailHeight ?? 18;
  const railTop = options.plotTop - railHeight;
  const layouts = layoutAnnotations(annotations, options);
  const hits = layouts.filter((layout) => {
    if (x < layout.x0 - tolerancePx || x > layout.x1 + tolerancePx) return false;
    if (y >= railTop && y < options.plotTop) return true;
    return layout.lanes.some((lane) => y >= lane.top && y <= lane.bottom);
  });
  if (hits.length === 0) return null;
  // Prefer the narrowest span (most specific event) and then the last drawn
  // event, which keeps selected/foreground markers easy to reach when stacked.
  hits.sort((a, b) => a.x1 - a.x0 - (b.x1 - b.x0));
  return hits[0]!.id;
}
