import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectArtifactAnnotations,
  detectMorphologies,
  detectReviewCandidates,
} from "./patterns.ts";
import type { ProcessedTrack } from "./types.ts";

const fs = 200;

function baseline(seconds: number): Float32Array {
  const samples = new Float32Array(Math.round(seconds * fs));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = 0.25 * Math.sin(2 * Math.PI * 7 * index / fs) + 0.05 * Math.sin(2 * Math.PI * 11 * index / fs);
  }
  return samples;
}

function addPulse(samples: Float32Array, center: number, amplitude: number, width = 8): void {
  for (let offset = -width; offset <= width; offset += 1) {
    const index = center + offset;
    if (index >= 0 && index < samples.length) samples[index] += amplitude * Math.max(0, 1 - Math.abs(offset) / (width + 1));
  }
}

function track(id: string, samples: Float32Array, kind: ProcessedTrack["kind"] = "eeg"): ProcessedTrack {
  return { id, label: id, laterality: "unknown", kind, samples, sampleRate: fs };
}

describe("rule-based review candidates", () => {
  it("finds a pointed spike and keeps the review span bounded", () => {
    const samples = baseline(6);
    addPulse(samples, 3 * fs, 18, 4);
    const annotations = detectMorphologies([track("F3", samples)]);
    assert.ok(annotations.some((annotation) => annotation.type === "spike" || annotation.type === "sharp"));
    assert.ok(annotations.every((annotation) => annotation.end - annotation.start >= 0.4));
    assert.ok(annotations.every((annotation) => annotation.end - annotation.start <= 10));
  });

  it("vetoes overlapping EEG morphology candidates when an artifact is present", () => {
    const eeg = baseline(6);
    addPulse(eeg, 3 * fs, 22, 4);
    const muscle = Float32Array.from({ length: 6 * fs }, (_, index) => 12 * Math.sin(2 * Math.PI * 40 * index / fs));
    const artifacts = detectArtifactAnnotations([track("F3", eeg), track("T7", muscle)]);
    assert.ok(artifacts.some((annotation) => annotation.type === "muscle"));
    const candidates = detectReviewCandidates([track("F3", eeg), track("T7", muscle)]);
    assert.ok(candidates.every((annotation) => annotation.text.includes("·")));
  });

  it("emits an EKG QRS-like artifact marker with numeric evidence", () => {
    const ekg = baseline(6);
    for (const beat of [1, 2, 3, 4, 5]) addPulse(ekg, beat * fs, 35, 6);
    const annotations = detectArtifactAnnotations([track("EKG", ekg, "ekg")]);
    const qrs = annotations.find((annotation) => annotation.type === "qrs");
    assert.ok(qrs);
    assert.match(qrs!.text, /robust scale|ms/);
  });
});
