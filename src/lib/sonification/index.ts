import type { FilterSettings, ProcessedTrack } from "../eeg/types.ts";

/**
 * A small, intentionally bounded event-sonification pipeline.  It is an
 * experimental listening aid: it does not classify EEG or make diagnoses.
 */
export const SESSION_VERSION = "auris-event-session-v1";
export const MAX_REGION_SECONDS = 30;

export type MappingId = "contour-v1" | "rms-pulse-v1" | "loui-2014-fz-cz-v1";
export type StyleId =
  | "plain-v1"
  | "soft-v1"
  | "pentatonic-v1"
  | "loui-neutral-v1"
  | "loui-soft-v1";
type SemanticVersion = "1.0.0";
/** X means experimental; C is reserved for a separately validated, controlled spec. */
export type MappingClassification = "X" | "C" | "B";

export interface FilterProvenance {
  readonly bandpass: boolean;
  readonly bandpassLow: number;
  readonly bandpassHigh: number;
  readonly lff: number;
  readonly hff: number;
  readonly notch60: boolean;
  readonly removeDc: boolean;
}

export interface TrackControl {
  readonly id: string;
  readonly gain?: number;
  readonly mute?: boolean;
  readonly pan?: number;
}

export interface FeatureEvent {
  readonly id: string;
  readonly type: "feature-window-v1";
  readonly time: { readonly start: number; readonly end: number };
  readonly source: {
    readonly trackId: string;
    readonly channel: string;
    readonly laterality: ProcessedTrack["laterality"];
    readonly kind: ProcessedTrack["kind"];
    readonly sampleRate: number;
    readonly originalSampleRate?: number;
    readonly originalSamplePosition?: number;
    readonly resampled?: boolean;
    readonly inputSampleStart: number;
    readonly inputSampleEndExclusive: number;
    readonly sourceTimeStart: number;
    readonly sourceTimeEnd: number;
    /** Input channels/derivations supplied by the caller, if known. */
    readonly derivationSources: readonly string[];
    /** Per-track maximum absolute physical value in the selected region. */
    readonly normalizationScale: number;
    readonly windowSeconds: number;
    readonly filters: FilterProvenance;
  };
  readonly features: {
    readonly mean: number;
    readonly rms: number;
    readonly lineLength: number;
    readonly scaledValue?: number;
    readonly midiOffset?: number;
    readonly velocity?: number;
  };
}

export interface MappedEvent {
  readonly id: string;
  readonly type: "tone-event-v1";
  readonly derivesFrom: readonly [string];
  readonly time: { readonly start: number; readonly end: number };
  readonly frequencyHz: number;
  readonly amplitude: number;
  readonly pan: number;
  readonly waveform: "sine" | "pulse" | "soft-sine";
  readonly mapping: {
    readonly id: MappingId;
    readonly version: SemanticVersion;
    readonly classification: MappingClassification;
    readonly statement: string;
    readonly publication?: {
      readonly title: string;
      readonly doi: string;
      readonly pmid: string;
    };
  };
  readonly source: FeatureEvent["source"];
}

export interface StyledEvent extends MappedEvent {
  readonly style: {
    readonly id: StyleId;
    readonly version: SemanticVersion;
    readonly changes: readonly string[];
  };
}

export interface SonificationSession {
  readonly version: typeof SESSION_VERSION;
  readonly region: {
    readonly requestedStart: number;
    readonly requestedEnd: number;
    readonly start: number;
    readonly end: number;
    readonly truncatedToMaxSeconds: boolean;
  };
  readonly mapping: MappedEvent["mapping"];
  readonly style: StyleId;
  readonly featureEvents: readonly FeatureEvent[];
  readonly mappedEvents: readonly MappedEvent[];
  readonly events: readonly StyledEvent[];
  readonly audit: {
    readonly eventCount: number;
    readonly audibleTrackIds: readonly string[];
    readonly filters: FilterProvenance;
    readonly note: string;
  };
}

export interface GenerateSessionOptions {
  readonly start: number;
  readonly end: number;
  readonly filters: FilterSettings | FilterProvenance;
  readonly mapping?: MappingId;
  readonly style?: StyleId;
  readonly windowSeconds?: number;
  readonly trackControls?: readonly TrackControl[];
  /** Optional external derivation/channel provenance keyed by ProcessedTrack id. */
  readonly sourceDerivations?: Readonly<Record<string, readonly string[]>>;
}

export interface MixResult {
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly sampleRate: number;
  readonly duration: number;
  readonly peak: number;
  readonly clipped: boolean;
}

const freeze = <T>(value: T): T => Object.freeze(value);
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function filterCopy(filters: FilterSettings | FilterProvenance): FilterProvenance {
  return freeze({
    bandpass: Boolean(filters.bandpass),
    bandpassLow: finite(filters.bandpassLow, "bandpassLow"),
    bandpassHigh: finite(filters.bandpassHigh, "bandpassHigh"),
    lff: finite(filters.lff, "lff"),
    hff: finite(filters.hff, "hff"),
    notch60: Boolean(filters.notch60),
    removeDc: Boolean(filters.removeDc),
  });
}

function maxAbs(samples: Float32Array, from: number, to: number): number {
  let out = 0;
  for (let i = from; i < to; i++) {
    const value = samples[i] ?? 0;
    if (!Number.isFinite(value)) throw new Error("Track contains a non-finite sample.");
    out = Math.max(out, Math.abs(value));
  }
  return Math.max(out, 1e-12);
}

function controlFor(id: string, controls: readonly TrackControl[]): Required<TrackControl> {
  const found = controls.find((control) => control.id === id);
  if (found?.gain !== undefined) finite(found.gain, `gain for ${id}`);
  if (found?.pan !== undefined) finite(found.pan, `pan for ${id}`);
  return {
    id,
    gain: clamp(found?.gain ?? 1, 0, 4),
    mute: Boolean(found?.mute),
    pan: clamp(found?.pan ?? 0, -1, 1),
  };
}

function mappingId(value: unknown): MappingId {
  if (value === "contour-v1" || value === "rms-pulse-v1") return value;
  if (value === "loui-2014-fz-cz-v1") {
    throw new Error("Use the dedicated Loui 2014 study-reproduction generator.");
  }
  throw new Error("Unknown mapping id.");
}

function styleId(value: unknown): StyleId {
  if (
    value === "plain-v1" ||
    value === "soft-v1" ||
    value === "pentatonic-v1" ||
    value === "loui-neutral-v1" ||
    value === "loui-soft-v1"
  )
    return value;
  throw new Error("Unknown style id.");
}

function mapFeature(
  feature: FeatureEvent,
  mapping: MappingId,
  scale: number,
  control: Required<TrackControl>,
): MappedEvent {
  const magnitude = clamp(feature.features.rms / scale, 0, 1);
  const signed = clamp(feature.features.mean / scale, -1, 1);
  const contour = mapping === "contour-v1";
  const frequencyHz = contour ? 420 * Math.pow(2, signed) : 130 + 520 * magnitude;
  const amplitude =
    (contour ? 0.07 + magnitude * 0.23 : 0.05 + magnitude * 0.28) *
    control.gain *
    (control.mute ? 0 : 1);
  return freeze({
    id: `map:${feature.id}`,
    type: "tone-event-v1",
    derivesFrom: freeze([feature.id]) as readonly [string],
    time: feature.time,
    frequencyHz,
    amplitude,
    pan: control.pan,
    waveform: contour ? "sine" : "pulse",
    mapping: freeze({
      id: mapping,
      version: "1.0.0",
      classification: "X",
      statement:
        "Experimental mapping for listening and teaching; it does not detect seizures or other conditions.",
    }),
    source: feature.source,
  });
}

const PENTATONIC = [0, 2, 4, 7, 9] as const;
function pentatonicFrequency(frequencyHz: number): number {
  const midi = 69 + 12 * Math.log2(Math.max(frequencyHz, 1) / 440);
  let best = midi;
  let error = Number.POSITIVE_INFINITY;
  for (let octave = -2; octave <= 12; octave++)
    for (const degree of PENTATONIC) {
      const candidate = 12 * octave + degree;
      const candidateError = Math.abs(candidate - midi);
      if (candidateError < error || (candidateError === error && candidate < best)) {
        best = candidate;
        error = candidateError;
      }
    }
  return 440 * Math.pow(2, (best - 69) / 12);
}

/** Returns a new event and records every audible parameter changed by style. */
export function applyStyle(event: MappedEvent, style: StyleId): StyledEvent {
  style = styleId(style);
  let frequencyHz = event.frequencyHz;
  let amplitude = event.amplitude;
  let waveform = event.waveform;
  const changes: string[] = [];
  if (style === "soft-v1") {
    amplitude *= 0.72;
    waveform = "sine";
    changes.push("amplitude × 0.72", "waveform → sine");
  }
  if (style === "pentatonic-v1") {
    frequencyHz = pentatonicFrequency(frequencyHz);
    changes.push("frequency quantized to C-major pentatonic");
  }
  if (style === "loui-neutral-v1") changes.push("no downstream style applied");
  if (style === "loui-soft-v1") {
    amplitude *= 0.72;
    waveform = "soft-sine";
    changes.push("amplitude × 0.72", "soft second harmonic added; mapped pitch unchanged");
  }
  if (style === "plain-v1") changes.push("no acoustic parameters changed");
  return freeze({
    ...event,
    frequencyHz,
    amplitude,
    waveform,
    style: freeze({ id: style, version: "1.0.0", changes: freeze(changes) }),
  });
}

export function generateSession(
  tracks: readonly ProcessedTrack[],
  options: GenerateSessionOptions,
): SonificationSession {
  const requestedStart = finite(options.start, "start");
  const requestedEnd = finite(options.end, "end");
  if (requestedStart < 0 || requestedEnd <= requestedStart)
    throw new Error("Region must have finite bounds with 0 ≤ start < end.");
  const start = requestedStart;
  const end = Math.min(requestedEnd, start + MAX_REGION_SECONDS);
  const windowSeconds = options.windowSeconds ?? 0.25;
  if (!Number.isFinite(windowSeconds) || windowSeconds <= 0 || windowSeconds > 2)
    throw new Error("windowSeconds must be in (0, 2].");
  const mapping = mappingId(options.mapping ?? "contour-v1");
  const style = styleId(options.style ?? "plain-v1");
  const filters = filterCopy(options.filters);
  const features: FeatureEvent[] = [];
  const mapped: MappedEvent[] = [];
  const controls = options.trackControls ?? [];
  for (const track of tracks) {
    if (!Number.isFinite(track.sampleRate) || track.sampleRate <= 0)
      throw new Error(`Track ${track.id} has an invalid sample rate.`);
    const first = Math.max(0, Math.ceil(start * track.sampleRate));
    const last = Math.min(track.samples.length, Math.ceil(end * track.sampleRate));
    const control = controlFor(track.id, controls);
    const scale = maxAbs(track.samples, first, last);
    const width = Math.max(1, Math.round(windowSeconds * track.sampleRate));
    for (
      let sampleStart = first, ordinal = 0;
      sampleStart < last;
      sampleStart += width, ordinal++
    ) {
      const sampleEnd = Math.min(last, sampleStart + width);
      let sum = 0,
        squares = 0,
        line = 0;
      for (let i = sampleStart; i < sampleEnd; i++) {
        const value = track.samples[i] ?? 0;
        if (!Number.isFinite(value))
          throw new Error(`Track ${track.id} contains a non-finite sample.`);
        sum += value;
        squares += value * value;
        if (i > sampleStart) line += Math.abs(value - (track.samples[i - 1] ?? 0));
      }
      const count = sampleEnd - sampleStart;
      const feature = freeze({
        id: `feature:${track.id}:${sampleStart}:${ordinal}`,
        type: "feature-window-v1" as const,
        time: freeze({ start: sampleStart / track.sampleRate, end: sampleEnd / track.sampleRate }),
        source: freeze({
          trackId: track.id,
          channel: track.label,
          laterality: track.laterality,
          kind: track.kind,
          sampleRate: track.sampleRate,
          inputSampleStart: sampleStart,
          inputSampleEndExclusive: sampleEnd,
          sourceTimeStart: sampleStart / track.sampleRate,
          sourceTimeEnd: sampleEnd / track.sampleRate,
          derivationSources: freeze([...(options.sourceDerivations?.[track.id] ?? [])]),
          normalizationScale: scale,
          windowSeconds,
          filters,
        }),
        features: freeze({ mean: sum / count, rms: Math.sqrt(squares / count), lineLength: line }),
      });
      features.push(feature);
      mapped.push(mapFeature(feature, mapping, scale, control));
    }
  }
  const events = mapped.map((event) => applyStyle(event, style));
  const mappingInfo =
    mapped[0]?.mapping ??
    freeze({
      id: mapping,
      version: "1.0.0",
      classification: "X",
      statement:
        "Experimental mapping for listening and teaching; it does not detect seizures or other conditions.",
    });
  return freeze({
    version: SESSION_VERSION,
    region: freeze({
      requestedStart,
      requestedEnd,
      start,
      end,
      truncatedToMaxSeconds: requestedEnd > end,
    }),
    mapping: mappingInfo,
    style,
    featureEvents: freeze(features),
    mappedEvents: freeze(mapped),
    events: freeze(events),
    audit: freeze({
      eventCount: events.length,
      audibleTrackIds: freeze(
        tracks.filter((track) => !controlFor(track.id, controls).mute).map((track) => track.id),
      ),
      filters,
      note: "Experimental event sonification. No diagnostic classification or alert is produced.",
    }),
  });
}

/** Deterministic, browser-independent PCM renderer.  No realtime audio graph is involved. */
export function renderSession(session: SonificationSession, outputRate = 44100): MixResult {
  if (!Number.isInteger(outputRate) || outputRate < 8000 || outputRate > 192000)
    throw new Error("outputRate must be an integer between 8000 and 192000.");
  const length = Math.max(0, Math.ceil((session.region.end - session.region.start) * outputRate));
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (const event of session.events) {
    const from = clamp(
      Math.floor((event.time.start - session.region.start) * outputRate),
      0,
      length,
    );
    const to = clamp(Math.ceil((event.time.end - session.region.start) * outputRate), from, length);
    const panAngle = ((event.pan + 1) * Math.PI) / 4;
    const lg = Math.cos(panAngle),
      rg = Math.sin(panAngle);
    for (let i = from; i < to; i++) {
      const phase = 2 * Math.PI * event.frequencyHz * ((i - from) / outputRate);
      const position = (i - from) / Math.max(1, to - from - 1);
      const envelope = Math.sin(Math.PI * position);
      const oscillator =
        event.waveform === "pulse"
          ? Math.sin(phase) >= 0
            ? 1
            : -1
          : event.waveform === "soft-sine"
            ? Math.sin(phase) + 0.18 * Math.sin(phase * 2)
            : Math.sin(phase);
      const sample = oscillator * envelope * event.amplitude;
      left[i] += sample * lg;
      right[i] += sample * rg;
    }
  }
  let rawPeak = 0;
  for (let i = 0; i < length; i++)
    rawPeak = Math.max(rawPeak, Math.abs(left[i] ?? 0), Math.abs(right[i] ?? 0));
  const gain = rawPeak > 0.89 ? 0.89 / rawPeak : 1;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    left[i] *= gain;
    right[i] *= gain;
    peak = Math.max(peak, Math.abs(left[i] ?? 0), Math.abs(right[i] ?? 0));
  }
  return freeze({
    left,
    right,
    sampleRate: outputRate,
    duration: length / outputRate,
    peak,
    clipped: false,
  });
}
