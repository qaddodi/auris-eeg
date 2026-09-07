import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySpatialCleaning,
  describeNoiseReferences,
  regressOut,
} from "./spatial-clean.ts";
import type { FilterSettings, ProcessedTrack } from "./types.ts";

const off: FilterSettings = {
  bandpass: false,
  bandpassLow: 0,
  bandpassHigh: 0,
  lff: 0,
  hff: 0,
  notch60: false,
  removeDc: false,
  artifactReduction: false,
  ica: false,
  spatialFilter: false,
};

function sine(freq: number, fs: number, seconds: number, amp = 1, phase = 0): Float32Array {
  const n = Math.round(fs * seconds);
  const y = new Float32Array(n);
  const w = (2 * Math.PI * freq) / fs;
  for (let i = 0; i < n; i++) y[i] = amp * Math.sin(w * i + phase);
  return y;
}

function track(
  id: string,
  kind: ProcessedTrack["kind"],
  samples: Float32Array,
  label = id,
): ProcessedTrack {
  return { id, label, laterality: "left", kind, samples, sampleRate: 200 };
}

function add(a: Float32Array, b: Float32Array, scale = 1): Float32Array {
  const y = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) y[i] = a[i]! + scale * (b[i] ?? 0);
  return y;
}

function corr(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i]!;
    mb += b[i]!;
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i]! - ma;
    const xb = b[i]! - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  return num / Math.sqrt(da * db);
}

function rms(x: Float32Array): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i]! * x[i]!;
  return Math.sqrt(s / x.length);
}

describe("EOG/EMG display cleaning", () => {
  it("regressOut subtracts a scaled noise reference without mutating inputs", () => {
    const neural = sine(10, 200, 2, 20);
    const eog = sine(2, 200, 2, 80);
    const dirty = add(neural, eog, 0.4);
    const beforeEog = new Float32Array(eog);
    const beforeDirty = new Float32Array(dirty);
    const cleaned = regressOut(dirty, [eog]);
    assert.deepEqual([...eog], [...beforeEog]);
    assert.deepEqual([...dirty], [...beforeDirty]);
    assert.ok(rms(add(cleaned, neural, -1)) < 1e-4);
    assert.ok(Math.abs(corr(cleaned, eog)) < 0.02);
  });

  it("artifact reduction cleans EEG from EOG/EMG and leaves auxiliaries unchanged", () => {
    const neural = sine(11, 200, 2, 15, 0.4);
    const blink = sine(1.5, 200, 2, 90);
    const muscle = sine(40, 200, 2, 40, 1.1);
    const f3 = add(add(neural, blink, 0.5), muscle, 0.25);
    const o1 = add(neural, blink, 0.15);
    const tracks = [
      track("F3-C3", "eeg", f3),
      track("O1", "eeg", o1),
      track("EOG L–R", "eog", blink),
      track("EMG chin", "emg", muscle),
    ];
    const snapshot = tracks.map((item) => new Float32Array(item.samples));
    const cleaned = applySpatialCleaning(tracks, { ...off, artifactReduction: true });
    assert.equal(cleaned.length, 4);
    assert.deepEqual([...tracks[0]!.samples], [...snapshot[0]!]);
    assert.deepEqual([...cleaned[2]!.samples], [...blink]);
    assert.deepEqual([...cleaned[3]!.samples], [...muscle]);
    assert.ok(Math.abs(corr(cleaned[0]!.samples, blink)) < Math.abs(corr(f3, blink)) * 0.2);
    assert.ok(rms(cleaned[0]!.samples) < rms(f3));
  });

  it("uses frontal EEG as an ocular proxy when EOG is absent", () => {
    const neural = sine(10, 200, 2, 12);
    const blink = sine(2, 200, 2, 70);
    const tracks = [
      track("Fp1–F3", "eeg", add(neural, blink, 0.9), "Fp1–F3"),
      track("C3–P3", "eeg", add(neural, blink, 0.45), "C3–P3"),
    ];
    const report = describeNoiseReferences(tracks);
    assert.deepEqual(report.ocularProxies, ["Fp1–F3"]);
    const cleaned = applySpatialCleaning(tracks, { ...off, artifactReduction: true });
    assert.ok(Math.abs(corr(cleaned[1]!.samples, blink)) < Math.abs(corr(tracks[1]!.samples, blink)) * 0.35);
    assert.deepEqual([...cleaned[0]!.samples], [...tracks[0]!.samples]);
  });

  it("spatial filter removes a shared EOG spatial pattern while keeping unique EEG", () => {
    const uniqueL = sine(10, 200, 2, 18, 0.2);
    const uniqueR = sine(13, 200, 2, 16, 1.3);
    const blink = sine(1.8, 200, 2, 100);
    const tracks = [
      track("F3", "eeg", add(uniqueL, blink, 0.8)),
      track("F4", "eeg", add(uniqueR, blink, 0.75)),
      track("P3", "eeg", add(uniqueL, blink, 0.2)),
      track("P4", "eeg", add(uniqueR, blink, 0.18)),
      track("EOG", "eog", blink),
    ];
    const cleaned = applySpatialCleaning(tracks, { ...off, spatialFilter: true });
    const beforeShared = (corr(tracks[0]!.samples, tracks[1]!.samples) + corr(tracks[2]!.samples, tracks[3]!.samples)) / 2;
    const afterShared = (corr(cleaned[0]!.samples, cleaned[1]!.samples) + corr(cleaned[2]!.samples, cleaned[3]!.samples)) / 2;
    assert.ok(Math.abs(corr(cleaned[0]!.samples, blink)) < Math.abs(corr(tracks[0]!.samples, blink)));
    assert.ok(afterShared < beforeShared || Math.abs(corr(cleaned[0]!.samples, blink)) < 0.2);
  });

  it("ICA rejects components correlated with EOG and is deterministic", () => {
    const neural = sine(10, 200, 3, 20);
    const blink = new Float32Array(600);
    for (let i = 0; i < blink.length; i++) {
      const t = i / 200;
      const phase = t % 1;
      const d = phase - 0.15;
      blink[i] = 80 * Math.exp(-(d * d) / 0.004) * (phase < 0.4 ? 1 : 0);
    }
    const tracks = [
      track("F3", "eeg", add(neural, blink, 0.9)),
      track("F4", "eeg", add(sine(10, 200, 3, 18, 0.4), blink, 0.85)),
      track("O1", "eeg", add(sine(10, 200, 3, 14, 1.1), blink, 0.12)),
      track("EOG", "eog", blink),
    ];
    const a = applySpatialCleaning(tracks, { ...off, ica: true });
    const b = applySpatialCleaning(tracks, { ...off, ica: true });
    assert.deepEqual([...a[0]!.samples], [...b[0]!.samples]);
    assert.deepEqual([...a[3]!.samples], [...blink]);
    const before = Math.abs(corr(tracks[0]!.samples, blink));
    const after = Math.abs(corr(a[0]!.samples, blink));
    assert.ok(after < before * 0.7 || after < 0.25);
  });

  it("does nothing when cleaning flags are off and never writes EKG", () => {
    const eeg = sine(10, 200, 1, 10);
    const ekg = sine(1.2, 200, 1, 200);
    const tracks = [track("C3", "eeg", eeg), track("EKG", "ekg", ekg)];
    const cleaned = applySpatialCleaning(tracks, off);
    assert.deepEqual([...cleaned[0]!.samples], [...eeg]);
    assert.deepEqual([...cleaned[1]!.samples], [...ekg]);
    assert.notEqual(cleaned[0]!.samples, tracks[0]!.samples);
  });
});
