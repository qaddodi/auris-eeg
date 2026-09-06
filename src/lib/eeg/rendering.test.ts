import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cachedEkgDisplayProfile,
  envelopeWhiskers,
  envelopeTraceWindow,
  nativeTraceWindow,
  orderedEnvelopePoints,
  representativeEnvelopePoints,
  traceWindow,
  waveformInvalidationKey,
} from "./rendering.ts";

describe("display-resolution waveform rendering", () => {
  it("preserves a transient in every dense envelope bin", () => {
    const samples = new Float32Array(32);
    samples[7] = 100;
    samples[24] = -80;
    const window = envelopeTraceWindow(samples, 32, 0, 1, 8);
    assert.equal(Math.max(...window.max), 100);
    assert.equal(Math.min(...window.min), -80);
  });

  it("assigns exact bin-boundary samples consistently", () => {
    const samples = new Float32Array(8);
    samples[2] = 11;
    samples[4] = -13;
    const window = envelopeTraceWindow(samples, 8, 0, 1, 4);
    assert.equal(window.max[1], 11);
    assert.equal(window.min[2], -13);
    assert.equal(window.max[0], 0);
    assert.equal(window.min[3], 0);
  });

  it("uses source sample indices and boundary neighbours at native zoom", () => {
    const samples = Float32Array.from([0, 1, 2, 3, 4, 5]);
    const window = nativeTraceWindow(samples, 10, 0.2, 0.4);
    assert.deepEqual([...window.indices], [1, 2, 3, 4, 5]);
    assert.deepEqual([...window.values], [1, 2, 3, 4, 5]);
  });

  it("switches to extrema mode as soon as a pixel has multiple samples", () => {
    const samples = new Float32Array(10);
    samples[1] = 50;
    const native = traceWindow(samples, 10, 0, 1, 10);
    const envelope = traceWindow(samples, 10, 0, 1, 9);
    assert.equal(native.mode, "native");
    assert.equal(envelope.mode, "envelope");
    assert.equal(Math.max(...envelope.max), 50);
  });

  it("keeps the native/envelope threshold continuous at exactly one sample per pixel", () => {
    const samples = new Float32Array(100);
    samples[49] = 250;
    samples[50] = -220;
    const exact = traceWindow(samples, 100, 0, 1, 100);
    const zoomed = traceWindow(samples, 100, 0, 1, 101);
    const dense = traceWindow(samples, 100, 0, 1, 99);
    assert.equal(exact.mode, "native");
    assert.equal(zoomed.mode, "native");
    assert.equal(dense.mode, "envelope");
    if (dense.mode === "envelope") {
      assert.ok(Math.max(...dense.max) >= 250);
      assert.ok(Math.min(...dense.min) <= -220);
    }
  });

  it("keeps dense extrema temporally ordered and continuously connected", () => {
    const samples = new Float32Array([0, 10, 2, -8, 1, 4, -3, 2]);
    const window = envelopeTraceWindow(samples, 8, 0, 1, 2);
    const first = orderedEnvelopePoints(window, 0, 200);
    const second = orderedEnvelopePoints(window, 1, 200);
    assert.ok(first.length >= 4);
    assert.ok(second.length >= 4);
    assert.ok(first.every((point, i) => i === 0 || point.x >= first[i - 1]!.x));
    assert.ok(second.every((point, i) => i === 0 || point.x >= second[i - 1]!.x));
    assert.equal(first[0]!.x, 0);
    assert.equal(first.at(-1)!.x, second[0]!.x);
    assert.ok(first.some((point) => point.value === 10));
    assert.ok(first.some((point) => point.value === -8));
  });

  it("separates the continuous representative trace from restrained extrema support", () => {
    const samples = new Float32Array([0, 10, -8, 2, 1, 4, -3, 2]);
    const window = envelopeTraceWindow(samples, 8, 0, 1, 2);
    const representative = representativeEnvelopePoints(window, 0, 200);
    const whiskers = envelopeWhiskers(window, 0, 200);
    assert.deepEqual(
      representative.map((point) => point.x),
      [0, 100],
    );
    assert.equal(representative[0]!.value, window.first[0]);
    assert.equal(representative[1]!.value, window.last[0]);
    assert.ok(whiskers.some((segment) => segment.to === window.max[0]));
    assert.ok(whiskers.some((segment) => segment.to === window.min[0]));
    assert.ok(whiskers.every((segment) => segment.x >= 0 && segment.x <= 100));
  });

  it("retains boundary-bin spikes across threshold zooms", () => {
    const samples = new Float32Array(100);
    samples[49] = 250;
    samples[50] = -220;
    for (const pixels of [49, 50, 51, 99]) {
      const window = traceWindow(samples, 100, 0, 1, pixels);
      assert.equal(window.mode, "envelope");
      if (window.mode === "envelope") {
        assert.ok(Math.max(...window.max) >= 250);
        assert.ok(Math.min(...window.min) <= -220);
      }
    }
  });

  it("covers the complete tail of a dense 60-second viewport", () => {
    const samples = new Float32Array(60 * 250);
    samples.fill(1);
    // Put a transient in the final source bin. A stale 20-second display
    // window would incorrectly return a zero-valued tail instead.
    samples[samples.length - 1] = 123;
    const window = traceWindow(samples, 250, 0, 60, 1500);
    assert.equal(window.mode, "envelope");
    if (window.mode === "envelope") {
      assert.equal(window.sampleCount.length, 1500);
      assert.equal(window.first[0], 1);
      assert.equal(window.last.at(-1), 123);
      assert.equal(window.max.at(-1), 123);
      const tail = orderedEnvelopePoints(window, 1499, 1500);
      assert.equal(tail[0]?.x, 1499);
      assert.ok(tail.some((point) => point.value === 123));
    }
  });

  it("caches EKG display profiles by immutable sample identity", () => {
    const samples = Float32Array.from([1, 2, 3, 4]);
    assert.equal(cachedEkgDisplayProfile(samples), cachedEkgDisplayProfile(samples));
    assert.notEqual(cachedEkgDisplayProfile(samples), cachedEkgDisplayProfile(Float32Array.from(samples)));
  });

  it("invalidates base rendering when data revision or DPR changes", () => {
    const revisionA = {};
    const revisionB = {};
    const base = {
      dataRevision: revisionA,
      trackIds: ["F3-C3"],
      viewStart: 0,
      viewDuration: 10,
      sensitivityUv: 70,
      negativeUp: true,
      width: 1000,
      height: 500,
      dpr: 1,
      trackStateKey: "",
    };
    assert.notEqual(waveformInvalidationKey(base), waveformInvalidationKey({ ...base, dataRevision: revisionB }));
    assert.notEqual(waveformInvalidationKey(base), waveformInvalidationKey({ ...base, dpr: 2 }));
  });
});
