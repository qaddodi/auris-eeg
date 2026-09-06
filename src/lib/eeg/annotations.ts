import type { Annotation, AnnotationSource, MorphologyType } from "./types.ts";

export const MORPHOLOGY_TYPES = [
  "spike",
  "sharp",
  "slow",
  "spike-wave",
  "polyspike",
  "periodic",
  "burst-suppression",
  "spindle",
  "alpha",
  "triphasic",
  "blink",
  "qrs",
  "muscle",
  "comment",
] as const satisfies readonly MorphologyType[];

export const ANNOTATION_SOURCES = [
  "user",
  "auto",
  "file",
] as const satisfies readonly AnnotationSource[];

const MAX_TEXT_LENGTH = 2_000;
export const ANNOTATION_TIME_STEP = 0.01;

/** Snap editor times to the hundredth-second native input step. */
export function snapAnnotationTime(value: number, step = ANNOTATION_TIME_STEP): number {
  if (!Number.isFinite(value)) return 0;
  const safeStep = Number.isFinite(step) && step > 0 ? step : ANNOTATION_TIME_STEP;
  return Number((Math.round(value / safeStep) * safeStep).toFixed(12));
}

export interface AnnotationValidationOptions {
  /** Recording length in seconds. */
  duration: number;
  /** Known trace IDs. Omit when no recording has supplied a channel list. */
  trackIds?: readonly string[];
  /** The source assigned to parsed annotations; imports are always file suggestions. */
  source?: AnnotationSource;
}

/**
 * Returns the explicit target tracks for an annotation. A null result means
 * the annotation is global (for example an EDF+ file note) and should be
 * shown in the event rail rather than assigned to a single lane.
 */
export function annotationTrackIds(
  annotation: Pick<Annotation, "trackId" | "trackIds">,
): readonly string[] | null {
  if (annotation.trackIds && annotation.trackIds.length > 0) return annotation.trackIds;
  return annotation.trackId ? [annotation.trackId] : null;
}

export function annotationSourceLabel(source: AnnotationSource): string {
  if (source === "user") return "Review note";
  if (source === "file") return "Imported file note";
  return "Suggested · not diagnostic";
}

export interface AnnotationExportRecord {
  start: number;
  end: number;
  type: MorphologyType;
  text: string;
  /** Legacy scalar spelling retained for existing importers. */
  track: string | null;
  source: AnnotationSource;
  confidence: number;
  /** Present only when the annotation targets more than one track. */
  tracks?: string[];
}

/** Stable JSON shape for current exports plus optional multi-track metadata. */
export function annotationToExport(annotation: Annotation): AnnotationExportRecord {
  const tracks = annotationTrackIds(annotation);
  const record: AnnotationExportRecord = {
    start: annotation.start,
    end: annotation.end,
    type: annotation.type,
    text: annotation.text,
    track: tracks?.length === 1 ? tracks[0]! : null,
    source: annotation.source,
    confidence: annotation.confidence,
  };
  if (tracks && tracks.length > 1) record.tracks = [...tracks];
  return record;
}

export class AnnotationImportError extends Error {
  public readonly index?: number;

  constructor(message: string, index?: number) {
    super(index === undefined ? message : `Annotation ${index + 1}: ${message}`);
    this.name = "AnnotationImportError";
    this.index = index;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMorphologyType(value: unknown): value is MorphologyType {
  return typeof value === "string" && (MORPHOLOGY_TYPES as readonly string[]).includes(value);
}

function isSource(value: unknown): value is AnnotationSource {
  return typeof value === "string" && (ANNOTATION_SOURCES as readonly string[]).includes(value);
}

function stableImportId(index: number, start: number, end: number, text: string): string {
  let hash = 2166136261;
  for (const char of `${index}|${start}|${end}|${text}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `file-${index + 1}-${(hash >>> 0).toString(36)}`;
}

/**
 * Converts external annotation data to the app's stable shape. Invalid entries
 * fail the entire import so a partially imported clinical note cannot be missed.
 */
export function validateAnnotations(
  value: unknown,
  options: AnnotationValidationOptions,
): Annotation[] {
  if (!Number.isFinite(options.duration) || options.duration < 0) {
    throw new AnnotationImportError("recording duration is invalid");
  }
  if (!Array.isArray(value))
    throw new AnnotationImportError("JSON must contain an array of annotations");

  const knownTracks = options.trackIds ? new Set(options.trackIds) : null;
  const usedIds = new Set<string>();
  return value.map((raw, index) => {
    if (!isRecord(raw)) throw new AnnotationImportError("must be an object", index);
    const start = raw.start;
    const end = raw.end;
    const text = raw.text;
    const type = raw.type;
    // `track` is the public legacy spelling; `trackId` is accepted for API
    // users. `tracks`/`trackIds` extend the shape for multichannel events.
    const scalarTrack = raw.trackId ?? raw.track;
    const listTrack = raw.trackIds ?? raw.tracks;
    const confidence = raw.confidence ?? 1;
    const id = raw.id;

    if (typeof start !== "number" || !Number.isFinite(start) || start < 0) {
      throw new AnnotationImportError("start must be a non-negative number", index);
    }
    if (typeof end !== "number" || !Number.isFinite(end) || end < start || end > options.duration) {
      throw new AnnotationImportError(
        "end must be at or after start and within the recording",
        index,
      );
    }
    if (!isMorphologyType(type))
      throw new AnnotationImportError("has an unknown annotation type", index);
    if (typeof text !== "string" || text.length > MAX_TEXT_LENGTH) {
      throw new AnnotationImportError(
        `text must be a string up to ${MAX_TEXT_LENGTH} characters`,
        index,
      );
    }
    if (
      scalarTrack !== undefined &&
      scalarTrack !== null &&
      (typeof scalarTrack !== "string" || !scalarTrack.trim())
    ) {
      throw new AnnotationImportError("channel must be null or a non-empty string", index);
    }
    if (listTrack !== undefined && scalarTrack !== undefined && scalarTrack !== null) {
      throw new AnnotationImportError("use either track or tracks, not both", index);
    }
    let trackIds: string[] | null = null;
    if (listTrack !== undefined && listTrack !== null) {
      if (
        !Array.isArray(listTrack) ||
        listTrack.length === 0 ||
        listTrack.some((track) => typeof track !== "string" || !track.trim())
      ) {
        throw new AnnotationImportError("tracks must be a non-empty array of channel names", index);
      }
      trackIds = listTrack.map((track) => track as string);
      if (new Set(trackIds).size !== trackIds.length) {
        throw new AnnotationImportError("tracks must not contain duplicates", index);
      }
    } else if (typeof scalarTrack === "string") {
      trackIds = [scalarTrack];
    }
    if (knownTracks && trackIds) {
      const missing = trackIds.find((track) => !knownTracks.has(track));
      if (missing) {
        throw new AnnotationImportError(
          `channel '${missing}' is not available in this recording`,
          index,
        );
      }
    }
    if (
      typeof confidence !== "number" ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1
    ) {
      throw new AnnotationImportError("confidence must be between 0 and 1", index);
    }
    if (id !== undefined && (typeof id !== "string" || !id.trim())) {
      throw new AnnotationImportError("id must be a non-empty string", index);
    }

    const stableId = typeof id === "string" ? id : stableImportId(index, start, end, text);
    if (usedIds.has(stableId)) throw new AnnotationImportError("id must be unique", index);
    usedIds.add(stableId);
    const annotation: Annotation = {
      id: stableId,
      start,
      end,
      trackId: trackIds?.length === 1 ? trackIds[0]! : null,
      type,
      text,
      source: options.source ?? (isSource(raw.source) ? raw.source : "file"),
      confidence,
    };
    if (trackIds && trackIds.length > 1) annotation.trackIds = trackIds;
    return annotation;
  });
}

export function parseAnnotationsJson(
  json: string,
  options: AnnotationValidationOptions,
): Annotation[] {
  try {
    return validateAnnotations(JSON.parse(json) as unknown, options);
  } catch (error) {
    if (error instanceof AnnotationImportError) throw error;
    throw new AnnotationImportError("file is not valid JSON");
  }
}

export interface AnnotationHistory {
  past: Annotation[][];
  current: Annotation[];
  future: Annotation[][];
}

export function annotationHistoryPush(
  past: Annotation[][],
  current: Annotation[],
): AnnotationHistory {
  return { past: [...past, current], current, future: [] };
}

export function annotationHistoryUndo(
  past: Annotation[][],
  current: Annotation[],
  future: Annotation[][],
): AnnotationHistory {
  const previous = past.at(-1);
  if (!previous) return { past, current, future };
  return { past: past.slice(0, -1), current: previous, future: [current, ...future] };
}

export function annotationHistoryRedo(
  past: Annotation[][],
  current: Annotation[],
  future: Annotation[][],
): AnnotationHistory {
  const next = future[0];
  if (!next) return { past, current, future };
  return { past: [...past, current], current: next, future: future.slice(1) };
}
