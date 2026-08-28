import { percentileAbs } from "./preprocessing.ts";
import type { Annotation, ChannelKind, MorphologyType, ProcessedTrack } from "./types.ts";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function ev(
  type: MorphologyType,
  start: number,
  end: number,
  trackId: string | null,
  confidence: number,
  text = "",
): Annotation {
  return {
    id: uid(type),
    start,
    end: Math.max(end, start),
    trackId,
    type,
    text,
    source: "auto",
    confidence,
  };
}

/** Width at half-maximum around a peak, in samples. */
function widthAtHalf(x: Float32Array, peak: number, half: number): { i0: number; i1: number } {
  let i0 = peak;
  let i1 = peak;
  while (i0 > 0 && Math.abs(x[i0]!) >= half) i0--;
  while (i1 < x.length - 1 && Math.abs(x[i1]!) >= half) i1++;
  return { i0, i1 };
}

export function detectTransients(
  x: Float32Array,
  fs: number,
  trackId: string,
  kind: ChannelKind,
): Annotation[] {
  if (x.length < fs * 0.2) return [];
  const sigma = percentileAbs(x, 0.8);
  const thr = Math.max(sigma * 4.2, 1e-6);
  const out: Annotation[] = [];
  let i = 1;
  while (i < x.length - 1) {
    const v = x[i]!;
    if (Math.abs(v) < thr || Math.abs(v) < Math.abs(x[i - 1]!) || Math.abs(v) < Math.abs(x[i + 1]!)) {
      i++;
      continue;
    }
    const { i0, i1 } = widthAtHalf(x, i, Math.abs(v) * 0.5);
    const ms = ((i1 - i0) / fs) * 1000;
    const t = i / fs;
    if (kind === "eog" && ms >= 80 && ms <= 450) {
      out.push(ev("blink", t - ms / 2000, t + ms / 2000, trackId, 0.7));
    } else if (kind === "ekg" && ms >= 20 && ms <= 120) {
      out.push(ev("qrs", t, t + 0.04, trackId, 0.75));
    } else if (kind === "eeg" && ms >= 20 && ms < 70) {
      out.push(ev("spike", t - 0.03, t + 0.04, trackId, 0.72));
    } else if (kind === "eeg" && ms >= 70 && ms <= 200) {
      out.push(ev("sharp", t - 0.05, t + 0.08, trackId, 0.68));
    } else if (kind === "eeg" && ms > 200 && ms <= 500 && Math.abs(v) > thr * 1.2) {
      out.push(ev("slow", t - ms / 2000, t + ms / 2000, trackId, 0.55));
    }
    i = Math.max(i + 1, i1);
    if (out.length > 80) break;
  }
  return out;
}

function zcrHz(x: Float32Array, fs: number, a: number, b: number): number {
  let z = 0;
  let prev = x[a] ?? 0;
  for (let i = a + 1; i < b; i++) {
    const v = x[i]!;
    if (prev <= 0 && v > 0) z++;
    prev = v;
  }
  return z / Math.max(1e-6, (b - a) / fs);
}

function rms(x: Float32Array, a: number, b: number): number {
  let s = 0;
  const n = Math.max(1, b - a);
  for (let i = a; i < b; i++) s += x[i]! * x[i]!;
  return Math.sqrt(s / n);
}

export function detectRhythms(x: Float32Array, fs: number, trackId: string): Annotation[] {
  const out: Annotation[] = [];
  const hop = Math.max(1, Math.round(0.25 * fs));
  const win = Math.max(8, Math.round(1.0 * fs));
  let i = 0;
  let run: { type: MorphologyType; start: number } | null = null;
  const close = (end: number, conf: number) => {
    if (run && end - run.start >= 0.8) {
      out.push(ev(run.type, run.start, end, trackId, conf));
    }
    run = null;
  };
  while (i + win < x.length) {
    const f = zcrHz(x, fs, i, i + win);
    const e = rms(x, i, i + win);
    const t = i / fs;
    let hit: MorphologyType | null = null;
    if (e > 1e-6 && f >= 8 && f <= 13) hit = "alpha";
    else if (e > 1e-6 && f >= 11 && f <= 16) hit = "spindle";
    else if (e > 1e-6 && f >= 2.3 && f <= 4.2) hit = "spike-wave";
    const same = run !== null && hit !== null && run.type === hit;
    if (same) {
      /* extend */
    } else if (hit) {
      close(t, 0.6);
      run = { type: hit, start: t };
    } else {
      close(t, 0.6);
    }
    i += hop;
  }
  close(x.length / fs, 0.55);
  return out.slice(0, 40);
}

export function detectBurstSuppression(x: Float32Array, fs: number, trackId: string): Annotation[] {
  const hop = Math.max(1, Math.round(0.1 * fs));
  const energies: number[] = [];
  for (let i = 0; i + hop <= x.length; i += hop) energies.push(rms(x, i, i + hop));
  if (energies.length < 20) return [];
  const sorted = [...energies].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.25)]!;
  const hi = sorted[Math.floor(sorted.length * 0.7)]!;
  if (hi < lo * 4) return [];
  const thr = (lo + hi) / 2;
  const out: Annotation[] = [];
  let i = 0;
  while (i < energies.length) {
    while (i < energies.length && energies[i]! < thr) i++;
    const b0 = i;
    while (i < energies.length && energies[i]! >= thr) i++;
    const b1 = i;
    const s0 = i;
    while (i < energies.length && energies[i]! < thr) i++;
    const s1 = i;
    const burst = (b1 - b0) * 0.1;
    const supp = (s1 - s0) * 0.1;
    if (burst >= 0.2 && burst <= 1.4 && supp >= 0.4) {
      out.push(ev("burst-suppression", b0 * 0.1, s1 * 0.1, trackId, 0.65));
    }
  }
  return out.slice(0, 20);
}

export function detectPeriodic(events: Annotation[], trackId: string): Annotation[] {
  const trans = events
    .filter((e) => (e.type === "spike" || e.type === "sharp") && e.trackId === trackId)
    .sort((a, b) => a.start - b.start);
  if (trans.length < 4) return [];
  const out: Annotation[] = [];
  let run: Annotation[] = [trans[0]!];
  const flush = () => {
    if (run.length < 4) return;
    const iv: number[] = [];
    for (let i = 1; i < run.length; i++) iv.push(run[i]!.start - run[i - 1]!.start);
    const mean = iv.reduce((a, b) => a + b, 0) / iv.length;
    if (mean < 0.4 || mean > 2.2) return;
    const sd = Math.sqrt(iv.reduce((a, b) => a + (b - mean) ** 2, 0) / iv.length);
    if (sd / mean > 0.45) return;
    out.push(
      ev("periodic", run[0]!.start, run[run.length - 1]!.end, trackId, 0.7, `~${(1 / mean).toFixed(1)} Hz`),
    );
  };
  for (let i = 1; i < trans.length; i++) {
    const dt = trans[i]!.start - trans[i - 1]!.start;
    if (dt >= 0.35 && dt <= 2.4) run.push(trans[i]!);
    else {
      flush();
      run = [trans[i]!];
    }
  }
  flush();
  return out;
}

function polyspikeFrom(spikes: Annotation[], trackId: string): Annotation[] {
  const s = spikes.filter((e) => e.type === "spike" && e.trackId === trackId).sort((a, b) => a.start - b.start);
  const out: Annotation[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i + 1;
    while (j < s.length && s[j]!.start - s[i]!.start <= 0.09) j++;
    if (j - i >= 2) {
      out.push(ev("polyspike", s[i]!.start, s[j - 1]!.end, trackId, 0.66));
      i = j - 1;
    }
  }
  return out;
}

export function detectMorphologies(tracks: ProcessedTrack[]): Annotation[] {
  const all: Annotation[] = [];
  const eeg = tracks.filter((t) => t.kind === "eeg");
  const sample = eeg.length > 8 ? [eeg[0]!, eeg[Math.floor(eeg.length / 2)]!, eeg[eeg.length - 1]!] : eeg;
  for (const tr of tracks) {
    if (tr.kind === "extra") continue;
    const trans = detectTransients(tr.samples, tr.sampleRate, tr.id, tr.kind);
    all.push(...trans);
    if (tr.kind === "eeg" && sample.includes(tr)) {
      all.push(...detectRhythms(tr.samples, tr.sampleRate, tr.id));
      all.push(...detectBurstSuppression(tr.samples, tr.sampleRate, tr.id));
      all.push(...detectPeriodic(trans, tr.id));
      all.push(...polyspikeFrom(trans, tr.id));
    }
  }
  all.sort((a, b) => a.start - b.start);
  return mergeNearby(all).slice(0, 240);
}

function mergeNearby(events: Annotation[]): Annotation[] {
  const out: Annotation[] = [];
  for (const e of events) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.type === e.type &&
      prev.trackId === e.trackId &&
      e.start - prev.end < 0.12
    ) {
      prev.end = Math.max(prev.end, e.end);
      prev.confidence = Math.max(prev.confidence, e.confidence);
    } else out.push({ ...e });
  }
  return out;
}

export function spikesForTrack(events: Annotation[], trackId: string): Float32Array {
  const times = events
    .filter((e) => e.trackId === trackId && (e.type === "spike" || e.type === "sharp" || e.type === "qrs"))
    .map((e) => e.start);
  return Float32Array.from(times);
}

export const MORPH_HELP: Record<MorphologyType, string> = {
  spike: "Duration < 70 ms, steep. Suggested marker — not a diagnosis.",
  sharp: "70–200 ms. Suggested marker — not a diagnosis.",
  slow: "Broad high-amplitude deflection.",
  "spike-wave": "About 2.5–4 Hz complexes.",
  polyspike: "Two or more spikes bunched together.",
  periodic: "Stereotyped transients at a stable interval (LPD/GPD-like).",
  "burst-suppression": "High-energy bursts separated by flattening.",
  spindle: "11–16 Hz waxing run (sleep-like).",
  alpha: "8–13 Hz run.",
  triphasic: "Three-phase slow complex.",
  blink: "Slow lid/EOG deflection.",
  qrs: "EKG QRS.",
  muscle: "High-frequency myogenic activity.",
  comment: "Free-text mark.",
};
