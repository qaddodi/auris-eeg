import { applyFilters } from "./preprocessing.ts";
import { applySpatialCleaning, spatialCleaningEnabled } from "./spatial-clean.ts";
import type { FilterSettings, ProcessedTrack } from "./types.ts";

export interface ProcessedWindow {
  start: number;
  duration: number;
  tracks: ProcessedTrack[];
  /** Recording-level DC offsets, keyed by immutable montage track id. */
  dcOffsets?: Readonly<Record<string, number>>;
}

export interface DisplayWindowPlan {
  start: number;
  duration: number;
  visibleStart: number;
  visibleDuration: number;
}

/**
 * Plan a stable, prefetched display window around the visible EEG page.
 * The extra context both amortizes review scrolling and keeps zero-phase filter
 * edge transients outside the visible page. Low cutoffs receive longer margins.
 */
export function planDisplayWindow(
  visibleStart: number,
  visibleDuration: number,
  totalDuration: number,
  filters: FilterSettings,
): DisplayWindowPlan {
  const total = Math.max(0, totalDuration);
  const duration = Math.max(0, Math.min(visibleDuration, total));
  const start = Math.max(0, Math.min(visibleStart, Math.max(0, total - duration)));
  const activeLow = filters.lff > 0
    ? filters.lff
    : filters.bandpass
      ? filters.bandpassLow
      : 0;
  const filterMargin = activeLow > 0 ? Math.min(30, Math.max(2, 3 / activeLow)) : 2;
  const icaMargin = filters.ica ? 4 : 0;
  const margin = Math.max(filterMargin, icaMargin, duration);
  const plannedStart = Math.max(0, start - margin);
  const plannedEnd = Math.min(total, start + duration + margin);
  return {
    start: plannedStart,
    duration: Math.max(0, plannedEnd - plannedStart),
    visibleStart: start,
    visibleDuration: duration,
  };
}

export function displayWindowContains(
  window: Pick<ProcessedWindow, "start" | "duration"> | null,
  visibleStart: number,
  visibleDuration: number,
  toleranceSec = 1e-6,
): boolean {
  if (!window) return false;
  const visibleEnd = visibleStart + visibleDuration;
  return (
    visibleStart >= window.start - toleranceSec &&
    visibleEnd <= window.start + window.duration + toleranceSec
  );
}

export function trackMean(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]!;
  return sum / samples.length;
}

export function recordingDcOffsets(
  source: Pick<ProcessedWindow, "tracks">,
): Readonly<Record<string, number>> {
  return Object.fromEntries(source.tracks.map((track) => [track.id, trackMean(track.samples)]));
}

/**
 * Filter only the prefetched display interval from immutable montage tracks.
 * A recording-level mean is used for DC removal so panning cannot introduce
 * page-to-page baseline jumps.
 */
export function buildDisplayWindow(
  source: ProcessedWindow,
  plan: DisplayWindowPlan,
  filters: FilterSettings,
): ProcessedWindow {
  const start = Math.max(source.start, plan.start);
  const end = Math.min(source.start + source.duration, plan.start + plan.duration);
  const duration = Math.max(0, end - start);
  const relativeStart = Math.max(0, start - source.start);
  const dcOffsets = source.dcOffsets ?? recordingDcOffsets(source);
  const tracks = source.tracks.map((track) => {
    const i0 = Math.max(0, Math.floor(relativeStart * track.sampleRate));
    const i1 = Math.min(
      track.samples.length,
      Math.max(i0, Math.ceil((relativeStart + duration) * track.sampleRate)),
    );
    const bounded = track.samples.slice(i0, i1);
    return {
      ...track,
      samples: applyFilters(bounded, track.sampleRate, filters, {
        dcOffset: filters.removeDc ? dcOffsets[track.id] : undefined,
      }),
    };
  });
  const cleaned = spatialCleaningEnabled(filters) ? applySpatialCleaning(tracks, filters) : tracks;
  return { start, duration, tracks: cleaned, dcOffsets };
}
