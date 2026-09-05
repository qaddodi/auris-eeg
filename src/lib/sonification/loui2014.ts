import type { FilterSettings, ProcessedTrack } from "../eeg/types.ts";
import type {
  FeatureEvent,
  MappedEvent,
  SonificationSession,
  StyledEvent,
} from "./index.ts";

export const LOUI_2014_MAPPING = Object.freeze({
  id: "loui-2014-fz-cz-v1" as const,
  version: "1.0.0" as const,
  classification: "B" as const,
  title: "Loui et al. 2014 Fz–Cz study reproduction",
  doi: "10.3389/fnhum.2014.00820",
  pmid: "25352802",
  epochSeconds: 10,
  targetSampleRate: 256,
  sampleStride: 20,
  eventRate: 12.8,
});

const SCALE_OFFSETS = Object.freeze(
  Array.from({ length: 41 }, (_, offset) => offset).filter((offset) =>
    [0, 2, 4, 7, 9].includes(offset % 12),
  ),
);

export interface Loui2014Preparation {
  readonly source: ProcessedTrack;
  readonly playback: ProcessedTrack;
  readonly sourceSampleRate: number;
  readonly resampled: boolean;
}

function finiteSamples(samples: Float32Array): void {
  for (const value of samples) {
    if (!Number.isFinite(value)) throw new Error("Fz–Cz contains a non-finite sample.");
  }
}

function resampleLinear(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return new Float32Array(samples);
  const length = Math.max(1, Math.round((samples.length / fromRate) * toRate));
  const output = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    const sourceIndex = (index * fromRate) / toRate;
    const left = Math.min(samples.length - 1, Math.floor(sourceIndex));
    const right = Math.min(samples.length - 1, left + 1);
    const fraction = sourceIndex - left;
    output[index] = (samples[left] ?? 0) * (1 - fraction) + (samples[right] ?? 0) * fraction;
  }
  return output;
}

function nearestScaleOffset(value: number): number {
  let best = SCALE_OFFSETS[0] ?? 0;
  let distance = Number.POSITIVE_INFINITY;
  for (const offset of SCALE_OFFSETS) {
    const candidate = Math.abs(offset - value);
    if (candidate < distance || (candidate === distance && offset < best)) {
      best = offset;
      distance = candidate;
    }
  }
  return best;
}

function epochValues(samples: Float32Array, start: number, end: number): number[] {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = start; index < end; index++) {
    const value = samples[index] ?? 0;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  const span = maximum - minimum;
  const output: number[] = [];
  for (let index = start; index < end; index += LOUI_2014_MAPPING.sampleStride) {
    const scaled = span > 1e-12 ? 1 + (39 * ((samples[index] ?? 0) - minimum)) / span : 20.5;
    output.push(nearestScaleOffset(scaled));
  }
  return output;
}

export function prepareLoui2014(source: ProcessedTrack): Loui2014Preparation {
  if (source.kind !== "eeg") throw new Error("The Loui mapping requires an EEG derivation.");
  if (!(source.sampleRate > 0)) throw new Error("The Fz–Cz sample rate is invalid.");
  finiteSamples(source.samples);
  const resampled = resampleLinear(
    source.samples,
    source.sampleRate,
    LOUI_2014_MAPPING.targetSampleRate,
  );
  const blockSize = LOUI_2014_MAPPING.epochSeconds * LOUI_2014_MAPPING.targetSampleRate;
  const values: number[] = [];
  for (let start = 0; start < resampled.length; start += blockSize) {
    values.push(...epochValues(resampled, start, Math.min(resampled.length, start + blockSize)));
  }
  return Object.freeze({
    source: Object.freeze({
      ...source,
      id: "evidence:loui-2014-source",
      label: "Fz–Cz",
      laterality: "midline" as const,
      samples: resampled,
      sampleRate: LOUI_2014_MAPPING.targetSampleRate,
    }),
    playback: Object.freeze({
      id: "evidence:loui-2014-events",
      label: "Loui 2014 Fz–Cz",
      laterality: "midline" as const,
      kind: "eeg" as const,
      samples: Float32Array.from(values),
      sampleRate: LOUI_2014_MAPPING.eventRate,
    }),
    sourceSampleRate: source.sampleRate,
    resampled: source.sampleRate !== LOUI_2014_MAPPING.targetSampleRate,
  });
}

function velocityFor(sampleIndex: number): number {
  const hash = Math.imul(sampleIndex + 1, 0x9e3779b1) >>> 0;
  return 85 + (hash % 43);
}

export function generateLoui2014Session(
  preparation: Loui2014Preparation,
  options: {
    readonly start: number;
    readonly hybrid: boolean;
    readonly filters: FilterSettings;
    readonly derivationSources?: readonly string[];
  },
): SonificationSession {
  const source = preparation.source;
  const requestedStart = Math.max(0, options.start);
  const duration = source.samples.length / source.sampleRate;
  const start = Math.min(requestedStart, Math.max(0, duration - 0.01));
  const end = Math.min(duration, start + LOUI_2014_MAPPING.epochSeconds);
  if (end <= start) throw new Error("The selected recording has no Fz–Cz epoch to sonify.");
  const first = Math.ceil(start * source.sampleRate);
  const last = Math.min(source.samples.length, Math.ceil(end * source.sampleRate));
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = first; index < last; index++) {
    minimum = Math.min(minimum, source.samples[index] ?? 0);
    maximum = Math.max(maximum, source.samples[index] ?? 0);
  }
  const span = maximum - minimum;
  const features: FeatureEvent[] = [];
  const mapped: MappedEvent[] = [];
  const events: StyledEvent[] = [];
  for (let sampleIndex = first, ordinal = 0; sampleIndex < last; sampleIndex += 20, ordinal++) {
    const raw = source.samples[sampleIndex] ?? 0;
    const scaledValue = span > 1e-12 ? 1 + (39 * (raw - minimum)) / span : 20.5;
    const midiOffset = nearestScaleOffset(scaledValue);
    const velocity = velocityFor(sampleIndex);
    const eventStart = sampleIndex / source.sampleRate;
    const eventEnd = Math.min(end, eventStart + 20 / source.sampleRate);
    const feature = Object.freeze({
      id: `feature:loui-2014:${sampleIndex}:${ordinal}`,
      type: "feature-window-v1" as const,
      time: Object.freeze({ start: eventStart, end: eventEnd }),
      source: Object.freeze({
        trackId: source.id,
        channel: "Fz–Cz",
        laterality: "midline" as const,
        kind: "eeg" as const,
        sampleRate: source.sampleRate,
        originalSampleRate: preparation.sourceSampleRate,
        originalSamplePosition:
          (sampleIndex * preparation.sourceSampleRate) / LOUI_2014_MAPPING.targetSampleRate,
        resampled: preparation.resampled,
        inputSampleStart: sampleIndex,
        inputSampleEndExclusive: sampleIndex + 1,
        sourceTimeStart: eventStart,
        sourceTimeEnd: eventEnd,
        derivationSources: Object.freeze([...(options.derivationSources ?? ["Fz", "Cz"])]),
        normalizationScale: span,
        windowSeconds: 20 / source.sampleRate,
        filters: Object.freeze({ ...options.filters }),
      }),
      features: Object.freeze({
        mean: raw,
        rms: Math.abs(raw),
        lineLength: 0,
        scaledValue,
        midiOffset,
        velocity,
      }),
    });
    const mapping = Object.freeze({
      id: LOUI_2014_MAPPING.id,
      version: LOUI_2014_MAPPING.version,
      classification: LOUI_2014_MAPPING.classification,
      statement:
        "Level B study reproduction; it reproduces the disclosed symbolic mapping and is not a validated clinical detector.",
      publication: Object.freeze({
        title: LOUI_2014_MAPPING.title,
        doi: LOUI_2014_MAPPING.doi,
        pmid: LOUI_2014_MAPPING.pmid,
      }),
    });
    const mappedEvent = Object.freeze({
      id: `map:${feature.id}`,
      type: "tone-event-v1" as const,
      derivesFrom: Object.freeze([feature.id]) as readonly [string],
      time: feature.time,
      frequencyHz: 440 * 2 ** ((48 + midiOffset - 69) / 12),
      amplitude: (velocity / 127) * 0.24,
      pan: 0,
      waveform: "sine" as const,
      mapping,
      source: feature.source,
    });
    const changes = options.hybrid
      ? ["amplitude × 0.72", "soft second harmonic added; mapped pitch unchanged"]
      : ["neutral sine substitutes for the unavailable proprietary study patch"];
    const styledEvent = Object.freeze({
      ...mappedEvent,
      amplitude: options.hybrid ? mappedEvent.amplitude * 0.72 : mappedEvent.amplitude,
      waveform: options.hybrid ? ("soft-sine" as const) : mappedEvent.waveform,
      style: Object.freeze({
        id: options.hybrid ? ("loui-soft-v1" as const) : ("loui-neutral-v1" as const),
        version: "1.0.0" as const,
        changes: Object.freeze(changes),
      }),
    });
    features.push(feature);
    mapped.push(mappedEvent);
    events.push(styledEvent);
  }
  const mapping = mapped[0]?.mapping ?? {
    id: LOUI_2014_MAPPING.id,
    version: LOUI_2014_MAPPING.version,
    classification: LOUI_2014_MAPPING.classification,
    statement:
      "Level B study reproduction; it reproduces the disclosed symbolic mapping and is not a validated clinical detector.",
    publication: Object.freeze({
      title: LOUI_2014_MAPPING.title,
      doi: LOUI_2014_MAPPING.doi,
      pmid: LOUI_2014_MAPPING.pmid,
    }),
  };
  return Object.freeze({
    version: "auris-event-session-v1",
    region: Object.freeze({
      requestedStart,
      requestedEnd: requestedStart + LOUI_2014_MAPPING.epochSeconds,
      start,
      end,
      truncatedToMaxSeconds: false,
    }),
    mapping,
    style: options.hybrid ? "loui-soft-v1" : "loui-neutral-v1",
    featureEvents: Object.freeze(features),
    mappedEvents: Object.freeze(mapped),
    events: Object.freeze(events),
    audit: Object.freeze({
      eventCount: events.length,
      audibleTrackIds: Object.freeze([source.id]),
      filters: Object.freeze({ ...options.filters }),
      note:
        `Level B Loui 2014 symbolic study reproduction; ${preparation.resampled ? `linearly resampled from ${preparation.sourceSampleRate} Hz to 256 Hz; ` : ""}` +
        "deterministic velocities replace the publication's unseeded random velocities, and the proprietary Massive patch is not reproduced. No diagnostic classification or alert is produced.",
    }),
  });
}
