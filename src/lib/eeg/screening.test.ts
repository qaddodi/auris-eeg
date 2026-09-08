import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectDeterministicAnnotations, runDeterministicScreeningSync } from "./abnormality/screening.ts";

const fs = 200;
function channel(id: string, samples: Float32Array, laterality: "left" | "right" | "midline" | "unknown" = "unknown") {
  return { id, label: id, canonical: id, samples, sampleRate: fs, kind: "eeg" as const, isEeg: true, laterality, sources: [id] };
}
function tone(frequency: number, seconds: number, amplitude = 20): Float32Array {
  const out = new Float32Array(Math.round(seconds * fs));
  for (let i = 0; i < out.length; i++) out[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / fs);
  return out;
}
function pulseTrain(seconds: number, interval: number, width = 0.06): Float32Array {
  const out = new Float32Array(Math.round(seconds * fs));
  for (let i = 0; i < out.length; i++) {
    const phase = (i / fs) % interval;
    if (phase < width) out[i] = 45 * Math.exp(-phase * 35);
  }
  return out;
}
function spindle(seconds: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * fs));
  for (let i = 0; i < out.length; i++) {
    const t = i / fs;
    const envelope = Math.max(0, Math.min(1, (t - 1) * 4, (3 - t) * 4));
    out[i] = 35 * envelope * Math.sin(2 * Math.PI * 13 * t);
  }
  return out;
}
function detectors(result: ReturnType<typeof runDeterministicScreeningSync>): string[] {
  return result.findings.map((finding) => finding.detector);
}

describe("deterministic phenomenon screening", () => {
  it("requires a spatial field for sharp transient candidates", () => {
    const transient = Float32Array.from(tone(10, 6, 4), (value, i) => value + pulseTrain(6, 2)[i]!);
    const field = runDeterministicScreeningSync({ channels: [channel("F3", transient, "left"), channel("C3", transient, "left"), channel("O1", tone(10, 6, 4), "left")], comparisonPairs: [] }, { contextWindowSeconds: 6 });
    assert.ok(detectors(field).some((name) => /sharp|transient/i.test(name)));
    const single = runDeterministicScreeningSync({ channels: [channel("F3", transient, "left"), channel("C3", tone(10, 6, 4), "left"), channel("O1", tone(10, 6, 4), "left")], comparisonPairs: [] }, { contextWindowSeconds: 6 });
    assert.equal(detectors(single).some((name) => /sharp|transient/i.test(name)), false);
  });

  it("labels sustained 2.3 Hz activity rhythmically", () => {
    const result = runDeterministicScreeningSync({ channels: [channel("F3", tone(2.3, 12, 35), "left"), channel("C3", tone(2.3, 12, 30), "left")] }, { contextWindowSeconds: 12 });
    assert.ok(result.findings.some((finding) => /rhythmic/i.test(finding.detector) && /2\.3|2\.2|2\.4/.test(finding.title + finding.summary)));
    assert.equal(result.findings.some((finding) => /seizure/i.test(finding.title)), false);
  });

  it("estimates a roughly 1.1 Hz periodic template train", () => {
    const result = runDeterministicScreeningSync({ channels: [channel("F3", pulseTrain(12, 1 / 1.1), "left"), channel("C3", pulseTrain(12, 1 / 1.1), "left")] }, { contextWindowSeconds: 12 });
    assert.ok(result.findings.some((finding) => /periodic/i.test(finding.detector) && /1\.0|1\.1|1\.2/.test(finding.title + finding.summary)));
  });

  it("detects burst suppression and sleep spindle candidates", () => {
    const burst = new Float32Array(fs * 8);
    for (let i = 0; i < burst.length; i++) burst[i] = (i / fs) % 2 < 0.45 ? 35 * Math.sin(2 * Math.PI * 12 * i / fs) : 0;
    const result = runDeterministicScreeningSync({ channels: [channel("Cz", burst, "midline"), channel("F3", burst, "left")] }, { contextWindowSeconds: 8 });
    assert.ok(result.findings.some((finding) => /burst.?suppression/i.test(finding.detector)));
    const spindleResult = runDeterministicScreeningSync({ channels: [channel("Cz", spindle(4), "midline")] }, { contextWindowSeconds: 4 });
    assert.ok(spindleResult.findings.some((finding) => /spindle/i.test(finding.detector)));
  });

  it("compares focal slowing homologously and detects generalized slowing", () => {
    const focal = runDeterministicScreeningSync({ channels: [channel("F3", tone(2, 10, 35), "left"), channel("F4", tone(10, 10, 20), "right"), channel("C3", tone(10, 10, 20), "left"), channel("C4", tone(10, 10, 20), "right")] }, { contextWindowSeconds: 10 });
    assert.ok(focal.findings.some((finding) => finding.detector === "focal-slowing"));
    const generalized = runDeterministicScreeningSync({ channels: ["F3", "F4", "C3", "C4"].map((id, i) => channel(id, tone(2.5, 10, 30), i % 2 ? "right" : "left")) }, { contextWindowSeconds: 10 });
    assert.ok(generalized.findings.some((finding) => finding.detector === "generalized-slowing"));
  });

  it("is byte-for-byte stable for identical input", () => {
    const input = { channels: [channel("F3", tone(10, 6), "left"), channel("F4", tone(10, 6), "right")] };
    const first = runDeterministicScreeningSync(input, { contextWindowSeconds: [2, 6] });
    const second = runDeterministicScreeningSync(input, { contextWindowSeconds: [2, 6] });
    assert.deepEqual(first, second);
  });

  it("keeps repeated candidates distinct and bounds long review markers", () => {
    const annotations = detectDeterministicAnnotations(
      [
        channel("F3", tone(2.3, 12, 35), "left"),
        channel("C3", tone(2.3, 12, 30), "left"),
      ],
      12,
    );
    assert.ok(annotations.length > 0);
    assert.equal(new Set(annotations.map((annotation) => annotation.id)).size, annotations.length);
    assert.ok(annotations.every((annotation) => annotation.end - annotation.start <= 10.000_001));
    assert.ok(annotations.some((annotation) => annotation.text.includes("marker shows")));
    assert.ok(annotations.every((annotation) => annotation.end - annotation.start >= 0.4 || annotation.end === 12));
    assert.ok(annotations.every((annotation) => /[0-9]/.test(annotation.text)));
  });

  it("maps a flat electrode to a bounded, track-specific quality marker", () => {
    const flat = new Float32Array(12 * fs);
    const annotations = detectDeterministicAnnotations([channel("F3", flat, "left")], 12);
    const marker = annotations.find((annotation) => annotation.text.includes("Flat or disconnected"));
    assert.ok(marker);
    assert.deepEqual(marker!.trackIds ?? [marker!.trackId], ["F3"]);
    assert.ok(marker!.end - marker!.start >= 0.4);
    assert.match(marker!.text, /flatline|continuity|finite/i);
  });
});
