import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDisplayWindow,
  displayWindowContains,
  planDisplayWindow,
  recordingDcOffsets,
} from "./display-pipeline.ts";
import type { FilterSettings, ProcessedTrack } from "./types.ts";

const noFilters: FilterSettings = {
  bandpass: false,
  bandpassLow: 0,
  bandpassHigh: 0,
  lff: 0,
  hff: 0,
  notch60: false,
  removeDc: false,
};

function track(id: string, samples: number[]): ProcessedTrack {
  return {
    id,
    label: id,
    laterality: "left",
    kind: "eeg",
    samples: new Float32Array(samples),
    sampleRate: 10,
  };
}

describe("display processing windows", () => {
  it("prefetches context around the visible page without exceeding the recording", () => {
    const plan = planDisplayWindow(20, 10, 100, { ...noFilters, lff: 0.5 });
    assert.equal(plan.visibleStart, 20);
    assert.equal(plan.visibleDuration, 10);
    assert.ok(plan.start < plan.visibleStart);
    assert.ok(plan.start + plan.duration >= 30);
    assert.ok(plan.start >= 0);
    assert.ok(plan.start + plan.duration <= 100);
    assert.ok(displayWindowContains(plan, 20, 10));
  });

  it("bounds filtering to the planned window and keeps source metadata", () => {
    const source = {
      start: 0,
      duration: 10,
      tracks: [track("F3-C3", Array.from({ length: 100 }, (_, i) => i))],
    };
    const plan = { start: 2, duration: 3, visibleStart: 2.5, visibleDuration: 2 };
    const output = buildDisplayWindow(source, plan, noFilters);
    assert.equal(output.start, 2);
    assert.equal(output.duration, 3);
    assert.equal(output.tracks[0]!.samples.length, 30);
    assert.deepEqual([...output.tracks[0]!.samples.slice(0, 3)], [20, 21, 22]);
    assert.deepEqual(output.dcOffsets, recordingDcOffsets(source));
  });

  it("uses the recording-level DC offset instead of a page-local baseline", () => {
    const samples = Array.from({ length: 100 }, (_, i) => 100 + i);
    const source = {
      start: 0,
      duration: 10,
      tracks: [track("F4-C4", samples)],
      dcOffsets: { "F4-C4": 149.5 },
    };
    const output = buildDisplayWindow(
      source,
      { start: 8, duration: 2, visibleStart: 8, visibleDuration: 2 },
      { ...noFilters, removeDc: true },
    );
    // The final page is centered against the whole-recording mean (149.5),
    // not its local mean (189.5), so panning cannot move the baseline.
    assert.ok(Math.abs((output.tracks[0]!.samples[0] ?? 0) - 30.5) < 1e-5);
    assert.ok(Math.abs((output.tracks[0]!.samples.at(-1) ?? 0) - 49.5) < 1e-5);
  });

  it("handles a zero-length recording without producing invalid windows", () => {
    const plan = planDisplayWindow(5, 10, 0, noFilters);
    assert.deepEqual(plan, { start: 0, duration: 0, visibleStart: 0, visibleDuration: 0 });
    assert.equal(displayWindowContains(null, 0, 0), false);
  });

  it("keeps repeated filter changes bounded, deterministic, and source-immutable", () => {
    const sourceSamples = Float32Array.from(
      Array.from({ length: 2_000 }, (_, index) =>
        Math.sin((2 * Math.PI * 10 * index) / 200) * 50 + index / 100,
      ),
    );
    const source = {
      start: 0,
      duration: 10,
      tracks: [{ ...track("F3-C3", [...sourceSamples]), sampleRate: 200 }],
    };
    const before = new Float32Array(source.tracks[0]!.samples);
    const changes: FilterSettings[] = [
      { ...noFilters, lff: 0.5 },
      { ...noFilters, hff: 35 },
      { ...noFilters, notch60: true },
      { ...noFilters, lff: 1.6, hff: 70, notch60: true },
    ];
    const outputs = changes.map((filters) => {
      const plan = planDisplayWindow(4, 2, source.duration, filters);
      assert.equal(displayWindowContains(plan, 4, 2), true);
      const output = buildDisplayWindow(source, plan, filters);
      assert.equal(output.tracks[0]!.samples.length, Math.round(output.duration * 200));
      assert.ok([...output.tracks[0]!.samples].every(Number.isFinite));
      return output.tracks[0]!.samples;
    });
    assert.deepEqual(source.tracks[0]!.samples, before);
    assert.ok(outputs.some((output) => output.some((value, index) => value !== outputs[0]![index])));
  });
});
