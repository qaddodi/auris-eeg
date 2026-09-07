import { ekgDisplayProfile, type EkgDisplayProfile } from "./display.ts";

/**
 * Prefer a vertex for every source sample on typical review pages. Envelope
 * mode is reserved for dense, zoomed-out views where a polyline of every
 * sample would be larger than the native budget.
 */
export const NATIVE_RENDER_SAMPLE_LIMIT = 65_536;

/**
 * Display data for one channel at one viewport resolution.
 *
 * Native mode keeps every source sample and its true time so the polyline is
 * a 1:1 plot of the calibrated buffer. Envelope mode is peak-hold: every
 * sample in a physical pixel contributes to that pixel's min and max, so a
 * spike cannot disappear when the page is denser than the canvas.
 */
export type NativeTraceWindow = {
  mode: "native";
  indices: Int32Array;
  values: Float32Array;
};

export type EnvelopeTraceWindow = {
  mode: "envelope";
  first: Float32Array;
  min: Float32Array;
  max: Float32Array;
  last: Float32Array;
  minIndex: Uint32Array;
  maxIndex: Uint32Array;
  sampleCount: Uint32Array;
};

export type TraceWindow = NativeTraceWindow | EnvelopeTraceWindow;

export function mapTraceWindow(window: TraceWindow, map: (value: number) => number): TraceWindow {
  if (window.mode === "native") {
    return {
      mode: "native",
      indices: window.indices,
      values: Float32Array.from(window.values, map),
    };
  }
  return {
    mode: "envelope",
    first: Float32Array.from(window.first, map),
    min: Float32Array.from(window.min, map),
    max: Float32Array.from(window.max, map),
    last: Float32Array.from(window.last, map),
    minIndex: window.minIndex,
    maxIndex: window.maxIndex,
    sampleCount: window.sampleCount,
  };
}

export function samplesPerPhysicalPixel(
  sampleRate: number,
  t0: number,
  t1: number,
  physicalPixels: number,
): number {
  if (sampleRate <= 0 || physicalPixels <= 0 || t1 <= t0) return 0;
  return ((t1 - t0) * sampleRate) / physicalPixels;
}

function windowSampleSpan(
  samples: Float32Array,
  sampleRate: number,
  t0: number,
  t1: number,
): { first: number; last: number; count: number } {
  if (samples.length === 0 || sampleRate <= 0 || t1 <= t0) {
    return { first: 0, last: -1, count: 0 };
  }
  const first = Math.max(0, Math.floor(t0 * sampleRate));
  const last = Math.min(samples.length - 1, Math.ceil(t1 * sampleRate));
  return { first, last, count: Math.max(0, last - first + 1) };
}

/**
 * Select a rendering representation without losing extrema at the boundary.
 * `physicalPixels` should be the backing-store width, not CSS width.
 *
 * Typical 10–60 s EEG pages stay in native mode so every calibrated sample is
 * a polyline vertex. Envelope/peak-hold is used only when the visible window
 * is both denser than one sample per pixel and larger than the native budget.
 */
export function traceWindow(
  samples: Float32Array,
  sampleRate: number,
  t0: number,
  t1: number,
  physicalPixels: number,
): TraceWindow {
  const n = Math.max(0, Math.floor(physicalPixels));
  if (samples.length === 0 || n <= 0 || sampleRate <= 0 || t1 <= t0) {
    return { mode: "native", indices: new Int32Array(0), values: new Float32Array(0) };
  }
  const spp = samplesPerPhysicalPixel(sampleRate, t0, t1, n);
  const { count } = windowSampleSpan(samples, sampleRate, t0, t1);
  if (spp <= 1 || count <= NATIVE_RENDER_SAMPLE_LIMIT) {
    return nativeTraceWindow(samples, sampleRate, t0, t1);
  }
  return envelopeTraceWindow(samples, sampleRate, t0, t1, n);
}

/** Return source samples with one neighbouring point on either side. */
export function nativeTraceWindow(
  samples: Float32Array,
  sampleRate: number,
  t0: number,
  t1: number,
): NativeTraceWindow {
  if (samples.length === 0 || sampleRate <= 0 || t1 <= t0) {
    return { mode: "native", indices: new Int32Array(0), values: new Float32Array(0) };
  }
  const first = Math.max(0, Math.floor(t0 * sampleRate) - 1);
  const last = Math.min(samples.length - 1, Math.ceil(t1 * sampleRate) + 1);
  if (last < first) return { mode: "native", indices: new Int32Array(0), values: new Float32Array(0) };
  const indices = new Int32Array(last - first + 1);
  const values = new Float32Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const source = first + i;
    indices[i] = source;
    values[i] = samples[source] ?? 0;
  }
  return { mode: "native", indices, values };
}

/** Extrema-preserving physical-pixel envelope. */
export function envelopeTraceWindow(
  samples: Float32Array,
  sampleRate: number,
  t0: number,
  t1: number,
  physicalPixels: number,
): EnvelopeTraceWindow {
  const n = Math.max(0, Math.floor(physicalPixels));
  const first = new Float32Array(n);
  const min = new Float32Array(n);
  const max = new Float32Array(n);
  const last = new Float32Array(n);
  const minIndex = new Uint32Array(n);
  const maxIndex = new Uint32Array(n);
  const sampleCount = new Uint32Array(n);
  if (samples.length === 0 || n <= 0 || sampleRate <= 0 || t1 <= t0) {
    return { mode: "envelope", first, min, max, last, minIndex, maxIndex, sampleCount };
  }
  const span = t1 - t0;
  for (let p = 0; p < n; p++) {
    const a = t0 + (p / n) * span;
    const b = t0 + ((p + 1) / n) * span;
    const i0 = Math.max(0, Math.floor(a * sampleRate));
    let i1 = Math.min(samples.length, Math.floor(b * sampleRate));
    if (i1 <= i0) i1 = Math.min(samples.length, i0 + 1);
    let lo = Infinity;
    let hi = -Infinity;
    let loIndex = i0;
    let hiIndex = i0;
    for (let i = i0; i < i1; i++) {
      const value = samples[i]!;
      if (value < lo) {
        lo = value;
        loIndex = i;
      }
      if (value > hi) {
        hi = value;
        hiIndex = i;
      }
    }
    first[p] = samples[i0] ?? 0;
    sampleCount[p] = Math.max(1, i1 - i0);
    min[p] = lo === Infinity ? 0 : lo;
    max[p] = hi === -Infinity ? 0 : hi;
    last[p] = samples[Math.max(i0, i1 - 1)] ?? first[p]!;
    minIndex[p] = Math.max(0, loIndex - i0);
    maxIndex[p] = Math.max(0, hiIndex - i0);
  }
  return { mode: "envelope", first, min, max, last, minIndex, maxIndex, sampleCount };
}

export interface OrderedEnvelopePoint {
  x: number;
  value: number;
}

export interface EnvelopeWhisker {
  x: number;
  from: number;
  to: number;
}

export interface PeakHoldColumn {
  x: number;
  width: number;
  min: number;
  max: number;
}

function envelopeBinGeometry(
  window: Extract<TraceWindow, { mode: "envelope" }>,
  bin: number,
  plotWidth: number,
) {
  const width = Math.max(0, plotWidth);
  const x0 = (bin / window.min.length) * width;
  const x1 = ((bin + 1) / window.min.length) * width;
  const denominator = Math.max(1, window.sampleCount[bin]! - 1);
  const minX = x0 + (x1 - x0) * (window.minIndex[bin]! / denominator);
  const maxX = x0 + (x1 - x0) * (window.maxIndex[bin]! / denominator);
  return { x0, x1, minX, maxX };
}

/** One filled column per physical pixel, spanning the bin's true min and max. */
export function peakHoldColumns(
  window: Extract<TraceWindow, { mode: "envelope" }>,
  plotWidth: number,
): PeakHoldColumn[] {
  const columns: PeakHoldColumn[] = [];
  if (window.min.length === 0 || plotWidth <= 0) return columns;
  const width = plotWidth / window.min.length;
  for (let bin = 0; bin < window.min.length; bin++) {
    columns.push({
      x: bin * width,
      width,
      min: window.min[bin]!,
      max: window.max[bin]!,
    });
  }
  return columns;
}

/**
 * True when every source sample whose time falls in [t0, t1) is inside the
 * min/max of the envelope bin it maps to. This is the lossless amplitude
 * contract for peak-hold display.
 */
export function envelopeCoversSamples(
  samples: Float32Array,
  sampleRate: number,
  t0: number,
  t1: number,
  window: Extract<TraceWindow, { mode: "envelope" }>,
): boolean {
  if (window.min.length === 0 || sampleRate <= 0 || t1 <= t0) return samples.length === 0;
  const span = t1 - t0;
  const n = window.min.length;
  const coveredFrom = Math.max(0, Math.floor(t0 * sampleRate));
  const coveredTo = Math.min(samples.length, Math.floor(t1 * sampleRate));
  const seen = new Uint8Array(Math.max(0, coveredTo - coveredFrom));
  for (let p = 0; p < n; p++) {
    const a = t0 + (p / n) * span;
    const b = t0 + ((p + 1) / n) * span;
    const i0 = Math.max(0, Math.floor(a * sampleRate));
    let i1 = Math.min(samples.length, Math.floor(b * sampleRate));
    if (i1 <= i0) i1 = Math.min(samples.length, i0 + 1);
    for (let i = i0; i < i1; i++) {
      const value = samples[i]!;
      if (value < window.min[p]! - 1e-6 || value > window.max[p]! + 1e-6) return false;
      if (i >= coveredFrom && i < coveredTo) seen[i - coveredFrom] = 1;
    }
  }
  for (let i = 0; i < seen.length; i++) {
    if (seen[i] !== 1) return false;
  }
  return true;
}

/**
 * Return the continuous representative trace for one dense bin. The first
 * and last source samples are the least assumptive morphology-preserving
 * summary; extrema are rendered separately as low-alpha support below.
 */
export function representativeEnvelopePoints(
  window: Extract<TraceWindow, { mode: "envelope" }>,
  bin: number,
  plotWidth: number,
): OrderedEnvelopePoint[] {
  if (bin < 0 || bin >= window.min.length || window.min.length === 0) return [];
  const { x0, x1 } = envelopeBinGeometry(window, bin, plotWidth);
  return [
    { x: x0, value: window.first[bin]! },
    { x: x1, value: window.last[bin]! },
  ];
}

/**
 * Return source-positioned extrema support segments for one dense bin. Each
 * segment is anchored to the representative trace at the extremum's source
 * time, so a spike remains visible without turning every bin into a saturated
 * min/max polyline.
 */
export function envelopeWhiskers(
  window: Extract<TraceWindow, { mode: "envelope" }>,
  bin: number,
  plotWidth: number,
): EnvelopeWhisker[] {
  if (bin < 0 || bin >= window.min.length || window.min.length === 0) return [];
  const { x0, x1, minX, maxX } = envelopeBinGeometry(window, bin, plotWidth);
  const representativeAt = (x: number) => {
    const fraction = x1 > x0 ? (x - x0) / (x1 - x0) : 0;
    return window.first[bin]! + (window.last[bin]! - window.first[bin]!) * fraction;
  };
  const min = window.min[bin]!;
  const max = window.max[bin]!;
  const support: EnvelopeWhisker[] = [];
  if (Number.isFinite(min) && Math.abs(min - representativeAt(minX)) > 1e-7) {
    support.push({ x: minX, from: representativeAt(minX), to: min });
  }
  if (Number.isFinite(max) && Math.abs(max - representativeAt(maxX)) > 1e-7) {
    support.push({ x: maxX, from: representativeAt(maxX), to: max });
  }
  return support;
}

/**
 * Return a temporally ordered, continuous representation of one envelope bin.
 * Keeping first/last plus extrema avoids the disconnected-bar look while the
 * extrema indices keep a spike on the correct side of the bin.
 */
export function orderedEnvelopePoints(
  window: Extract<TraceWindow, { mode: "envelope" }>,
  bin: number,
  plotWidth: number,
): OrderedEnvelopePoint[] {
  if (bin < 0 || bin >= window.min.length || window.min.length === 0) return [];
  const { x0, x1, minX, maxX } = envelopeBinGeometry(window, bin, plotWidth);
  const extrema =
    window.minIndex[bin]! <= window.maxIndex[bin]!
      ? [
          { x: minX, value: window.min[bin]! },
          { x: maxX, value: window.max[bin]! },
        ]
      : [
          { x: maxX, value: window.max[bin]! },
          { x: minX, value: window.min[bin]! },
        ];
  // The denominator uses the largest observed index in the bin only as a
  // fallback for a one-sample bin. Callers get monotonic x coordinates and
  // the source order of extrema even when one extremum is the first/last.
  if (window.minIndex[bin] === 0 && window.maxIndex[bin] === 0) {
    return [
      { x: x0, value: window.first[bin]! },
      { x: x1, value: window.last[bin]! },
    ];
  }
  return [
    { x: x0, value: window.first[bin]! },
    ...extrema.map((point) => ({ x: Math.max(x0, Math.min(x1, point.x)), value: point.value })),
    { x: x1, value: window.last[bin]! },
  ];
}

/**
 * EKG profiles are display-only and depend only on the immutable sample
 * buffer. WeakMap caching avoids sorting the complete EKG on every repaint.
 */
const ekgProfileCache = new WeakMap<Float32Array, EkgDisplayProfile>();

export function cachedEkgDisplayProfile(samples: Float32Array): EkgDisplayProfile {
  const cached = ekgProfileCache.get(samples);
  if (cached) return cached;
  const profile = ekgDisplayProfile(samples);
  ekgProfileCache.set(samples, profile);
  return profile;
}

const revisionIds = new WeakMap<object, number>();
let nextRevisionId = 1;

function revisionKey(revision: object | null): number {
  if (!revision) return 0;
  const existing = revisionIds.get(revision);
  if (existing != null) return existing;
  const id = nextRevisionId++;
  revisionIds.set(revision, id);
  return id;
}

/** Stable key for all inputs that can change a base waveform canvas. */
export function waveformInvalidationKey(opts: {
  dataRevision: object | null;
  trackIds: readonly string[];
  viewStart: number;
  viewDuration: number;
  sensitivityUv: number;
  negativeUp: boolean;
  width: number;
  height: number;
  dpr: number;
  trackStateKey: string;
}): string {
  return [
    revisionKey(opts.dataRevision),
    opts.trackIds.join(","),
    opts.viewStart,
    opts.viewDuration,
    opts.sensitivityUv,
    opts.negativeUp ? 1 : 0,
    opts.width,
    opts.height,
    opts.dpr,
    opts.trackStateKey,
  ].join("|");
}
