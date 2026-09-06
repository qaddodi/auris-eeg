import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProcessedTrack } from "../eeg/types.ts";
import {
  LOUI_2014_MAPPING,
  generateLoui2014Session,
  prepareLoui2014,
} from "./loui2014.ts";

const filters = {
  bandpass: false,
  bandpassLow: 0,
  bandpassHigh: 0,
  lff: 0,
  hff: 0,
  notch60: false,
  removeDc: false,
};

function rampTrack(sampleRate = 256): ProcessedTrack {
  const length = sampleRate * 10;
  return {
    id: "custom:Fz-Cz",
    label: "Fz–Cz",
    laterality: "midline",
    kind: "eeg",
    sampleRate,
    samples: Float32Array.from({ length }, (_, index) => index / Math.max(1, length - 1)),
  };
}

describe("Loui 2014 study reproduction", () => {
  it("polls a 10-second 256 Hz epoch every twentieth sample", () => {
    const prepared = prepareLoui2014(rampTrack());
    const session = generateLoui2014Session(prepared, {
      start: 0,
      hybrid: false,
      filters,
    });
    assert.equal(session.events.length, 128);
    assert.equal(session.mapping.id, LOUI_2014_MAPPING.id);
    assert.equal(session.mapping.classification, "B");
    assert.equal(session.mapping.publication?.doi, "10.3389/fnhum.2014.00820");
    assert.equal(session.mapping.publication?.pmid, "25352802");
    assert.equal(session.featureEvents[0]?.source.inputSampleStart, 0);
    assert.equal(session.featureEvents[1]?.source.inputSampleStart, 20);
    assert.equal(session.events[0]?.time.end, 20 / 256);
    assert.equal(session.style, "loui-neutral-v1");
  });

  it("uses only C-major-pentatonic pitch classes and the published velocity range", () => {
    const session = generateLoui2014Session(prepareLoui2014(rampTrack()), {
      start: 0,
      hybrid: false,
      filters,
    });
    for (const feature of session.featureEvents) {
      assert.ok([0, 2, 4, 7, 9].includes((feature.features.midiOffset ?? -1) % 12));
      assert.ok((feature.features.velocity ?? 0) >= 85);
      assert.ok((feature.features.velocity ?? 999) <= 127);
    }
  });

  it("resamples explicitly and produces deterministic events", () => {
    const prepared = prepareLoui2014(rampTrack(200));
    assert.equal(prepared.resampled, true);
    assert.equal(prepared.source.samples.length, 2560);
    assert.equal(prepared.playback.sampleRate, 12.8);
    const a = generateLoui2014Session(prepared, { start: 0, hybrid: false, filters });
    const b = generateLoui2014Session(prepared, { start: 0, hybrid: false, filters });
    assert.deepEqual(a, b);
    assert.equal(a.featureEvents[1]?.source.originalSampleRate, 200);
    assert.equal(a.featureEvents[1]?.source.originalSamplePosition, 15.625);
    assert.equal(a.featureEvents[1]?.source.resampled, true);
  });

  it("keeps mapped pitch and timing unchanged in Hybrid", () => {
    const prepared = prepareLoui2014(rampTrack());
    const evidence = generateLoui2014Session(prepared, {
      start: 0,
      hybrid: false,
      filters,
    });
    const hybrid = generateLoui2014Session(prepared, {
      start: 0,
      hybrid: true,
      filters,
    });
    assert.deepEqual(
      hybrid.events.map((event) => [event.time, event.frequencyHz]),
      evidence.events.map((event) => [event.time, event.frequencyHz]),
    );
    assert.equal(hybrid.style, "loui-soft-v1");
    assert.equal(hybrid.events[0]?.waveform, "soft-sine");
    assert.ok((hybrid.events[0]?.amplitude ?? 1) < (evidence.events[0]?.amplitude ?? 0));
  });
});
