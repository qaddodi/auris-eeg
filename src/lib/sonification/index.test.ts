import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProcessedTrack } from "../eeg/types.ts";
import { applyStyle, generateSession, renderSession } from "./index.ts";

const filters = {
  bandpass: false,
  bandpassLow: 1,
  bandpassHigh: 40,
  lff: 0,
  hff: 0,
  notch60: false,
  removeDc: true,
};
const track: ProcessedTrack = {
  id: "Fz-Cz",
  label: "Fz–Cz",
  laterality: "midline",
  kind: "eeg",
  sampleRate: 8,
  samples: Float32Array.from([0, 1, -1, 1, 0, -1, 1, 0, 0, 1, -1, 1, 0, -1, 1, 0]),
};

describe("event sonification", () => {
  it("uses bounded windows with exact sample and source-time provenance", () => {
    const session = generateSession([track], {
      start: 0.125,
      end: 1.875,
      filters,
      windowSeconds: 0.5,
    });
    assert.equal(session.featureEvents.length, 4);
    assert.deepEqual(session.featureEvents[0]?.source.inputSampleStart, 1);
    assert.deepEqual(session.featureEvents[0]?.source.inputSampleEndExclusive, 5);
    assert.equal(session.featureEvents[0]?.source.channel, "Fz–Cz");
    assert.equal(session.featureEvents[0]?.source.filters.removeDc, true);
    assert.equal(session.featureEvents[0]?.source.windowSeconds, 0.5);
    assert.equal(session.featureEvents[0]?.source.normalizationScale, 1);
    assert.equal(session.events[0]?.mapping.classification, "X");
  });
  it("is deterministic and caps requested regions at thirty seconds", () => {
    const long = { ...track, samples: new Float32Array(8 * 40).fill(0.5) };
    const a = generateSession([long], { start: 0, end: 40, filters, mapping: "rms-pulse-v1" });
    const b = generateSession([long], { start: 0, end: 40, filters, mapping: "rms-pulse-v1" });
    assert.deepEqual(a, b);
    assert.equal(a.region.end, 30);
    assert.equal(a.region.truncatedToMaxSeconds, true);
    const pcmA = renderSession(a, 8000),
      pcmB = renderSession(b, 8000);
    assert.deepEqual(Array.from(pcmA.left), Array.from(pcmB.left));
  });
  it("styles produce a new event and preserve feature mapping provenance", () => {
    const session = generateSession([track], { start: 0, end: 1, filters });
    const original = session.mappedEvents[0]!;
    const styled = applyStyle(original, "soft-v1");
    assert.notEqual(styled, original);
    assert.equal(original.waveform, "sine");
    assert.equal(styled.derivesFrom[0], original.derivesFrom[0]);
    assert.equal(Object.isFrozen(session.featureEvents[0]), true);
  });
  it("records the actual C-major-pentatonic style transform", () => {
    const session = generateSession([track], { start: 0, end: 1, filters });
    const styled = applyStyle(session.mappedEvents[0]!, "pentatonic-v1");
    const midi = Math.round(69 + 12 * Math.log2(styled.frequencyHz / 440));
    assert.ok([0, 2, 4, 7, 9].includes(((midi % 12) + 12) % 12));
    assert.deepEqual(styled.style.changes, ["frequency quantized to C-major pentatonic"]);
    assert.equal(styled.style.version, "1.0.0");
  });
  it("honors mute and gain without changing recorded features", () => {
    const muted = generateSession([track], {
      start: 0,
      end: 1,
      filters,
      trackControls: [{ id: track.id, mute: true, gain: 4 }],
    });
    assert.ok(muted.events.every((event) => event.amplitude === 0));
    assert.ok(renderSession(muted, 8000).left.every((sample) => sample === 0));
  });
  it("rejects invalid controls and unknown mapping or style ids", () => {
    assert.throws(
      () =>
        generateSession([track], {
          start: 0,
          end: 1,
          filters,
          trackControls: [{ id: track.id, gain: Number.NaN }],
        }),
      /gain for Fz-Cz must be finite/,
    );
    assert.throws(
      () =>
        generateSession([track], {
          start: 0,
          end: 1,
          filters,
          trackControls: [{ id: track.id, pan: Number.POSITIVE_INFINITY }],
        }),
      /pan for Fz-Cz must be finite/,
    );
    assert.throws(
      () => generateSession([track], { start: 0, end: 1, filters, mapping: "unknown" as never }),
      /Unknown mapping id/,
    );
    assert.throws(
      () =>
        applyStyle(
          generateSession([track], { start: 0, end: 1, filters }).mappedEvents[0]!,
          "unknown" as never,
        ),
      /Unknown style id/,
    );
  });
});
