import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadRecording, parseEdfHeader, readAnnotations, readRecords } from "./edf.ts";
import { applyDerivation, buildCustomPairs } from "./montages.ts";
import { applyFilters } from "./preprocessing.ts";
import { buildSyntheticEdf, sine } from "./synthetic.ts";
import { describeChannel } from "./channels.ts";

function writeAscii(buffer: ArrayBuffer, offset: number, width: number, value: string): void {
  const bytes = new Uint8Array(buffer, offset, width);
  bytes.fill(32);
  for (let i = 0; i < Math.min(width, value.length); i++) bytes[i] = value.charCodeAt(i);
}

describe("EDF defensive parsing", () => {
  it("rejects a partial final data record", () => {
    const valid = buildSyntheticEdf({ duration: 0.2 });
    assert.throws(() => parseEdfHeader(valid.slice(0, -1)), /partial data record/);
  });

  it("resolves the specified unknown record count from complete records", () => {
    const buffer = buildSyntheticEdf({ duration: 0.2 });
    writeAscii(buffer, 236, 8, "-1");
    assert.equal(parseEdfHeader(buffer).recordCount, 2);
  });

  it("rejects discontinuous EDF+D rather than flattening gaps", () => {
    const buffer = buildSyntheticEdf({ duration: 0.2 });
    writeAscii(buffer, 192, 44, "EDF+D");
    assert.throws(() => parseEdfHeader(buffer), /Discontinuous EDF\+D/);
  });

  it("propagates malformed UTF-8 annotations during load", async () => {
    const buffer = buildSyntheticEdf({ duration: 0.1 });
    const header = parseEdfHeader(buffer);
    const annotationOffset = header.headerBytes + header.bytesPerRecord - 50;
    new Uint8Array(buffer)[annotationOffset] = 0xff;
    await assert.rejects(() => loadRecording(buffer, "bad.edf"));
  });
});

describe("EDF calibration and timing", () => {
  it("converts voltage channels from mV to the pipeline's microvolt unit", () => {
    const buffer = buildSyntheticEdf({ duration: 0.1, left: sine(10, 200, 0.1, 1) });
    // Units are the third signal-header block; change only EEG Fp1.
    writeAscii(buffer, 256 + 6 * (16 + 80), 8, "mV");
    const header = parseEdfHeader(buffer);
    const samples = readRecords(buffer, header, 0, 0.1).samples[0]!;
    assert.ok(Math.max(...samples) > 900, "1 mV should be represented as about 1000 µV");
  });

  it("treats EDF+ TAL onsets as absolute from file start", () => {
    const buffer = buildSyntheticEdf({ duration: 0.2 });
    const header = parseEdfHeader(buffer);
    const base = header.headerBytes + header.bytesPerRecord + header.bytesPerRecord - 50;
    const tal = new TextEncoder().encode("+0.1\x14\x14\0+0.15\x14Event\x14\0");
    new Uint8Array(buffer, base, tal.length).set(tal);
    assert.equal(readAnnotations(buffer, header).find((a) => a.text === "Event")?.onset, 0.15);
  });
});

describe("mixed rates and source immutability", () => {
  it("marks a bipolar pair unavailable when source rates differ", () => {
    const channels = [
      describeChannel(0, "Fp1", "uV", 200),
      describeChannel(1, "F7", "uV", 256),
    ];
    const [pair] = buildCustomPairs(channels, [["Fp1", "F7"]]);
    assert.equal(pair?.available, false);
    assert.deepEqual(pair?.missing, ["matching sample rates"]);
  });

  it("rejects unequal bipolar buffers and leaves inputs unchanged", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([1, 2]);
    assert.throws(() => applyDerivation([a, b], {
      id: "x", label: "A-B", sources: [0, 1], laterality: "left", kind: "eeg",
      sampleRate: 200, available: true, missing: [],
    }), /sample counts differ/);
    assert.deepEqual([...a], [1, 2, 3]);
    assert.deepEqual([...b], [1, 2]);
  });

  it("filters into a new buffer and rejects cutoffs at Nyquist", () => {
    const input = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const original = new Float32Array(input);
    const base = { bandpass: false, bandpassLow: 1, bandpassHigh: 40, lff: 0, hff: 0, notch60: false, removeDc: true };
    const output = applyFilters(input, 200, base);
    assert.notEqual(output, input);
    assert.deepEqual(input, original);
    assert.throws(() => applyFilters(input, 200, { ...base, hff: 100 }), /below Nyquist/);
  });
});
