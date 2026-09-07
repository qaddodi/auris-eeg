import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { applyDerivation, montageDerivations } from "./montages.ts";
import { listChannels, parseEdfHeader, readRecords } from "./edf.ts";
import { applyFilters } from "./preprocessing.ts";
import { envelopeCoversSamples, envelopeTraceWindow, nativeTraceWindow, traceWindow } from "./rendering.ts";
import { DEFAULT_RECORDING_FILE } from "./default-recording.ts";

const RECORDING_CANDIDATES = [
  new URL(`../../../public/${DEFAULT_RECORDING_FILE}`, import.meta.url),
  new URL(`../../../attachments/${DEFAULT_RECORDING_FILE}`, import.meta.url),
];

function loadBundledRecording(): ArrayBuffer {
  for (const url of RECORDING_CANDIDATES) {
    try {
      const file = readFileSync(url);
      return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    } catch {
      /* try the next bundled location */
    }
  }
  throw new Error(`Bundled recording ${DEFAULT_RECORDING_FILE} is missing.`);
}

function physicalFromDigital(
  digital: number,
  physicalMin: number,
  physicalMax: number,
  digitalMin: number,
  digitalMax: number,
): number {
  return ((digital - digitalMin) / (digitalMax - digitalMin)) * (physicalMax - physicalMin) + physicalMin;
}

describe("bundled recording waveform fidelity", () => {
  it("matches an independent int16 affine calibration for the first FP1 record", () => {
    const buffer = loadBundledRecording();
    const header = parseEdfHeader(buffer);
    assert.equal(header.recordCount, 1195);
    assert.equal(header.recordDuration, 1);
    const fp1 = header.signals[0]!;
    assert.match(fp1.label, /FP1/i);
    assert.equal(fp1.sampleRate, 250);
    assert.equal(fp1.unit.toLowerCase(), "uv");

    const parsed = readRecords(buffer, header, 0, 1).samples[0]!;
    assert.equal(parsed.length, 250);

    const view = new DataView(buffer);
    const independent = new Float32Array(fp1.samplesPerRecord);
    for (let i = 0; i < fp1.samplesPerRecord; i++) {
      const digital = view.getInt16(header.headerBytes + i * 2, true);
      independent[i] = physicalFromDigital(
        digital,
        fp1.physicalMin,
        fp1.physicalMax,
        fp1.digitalMin,
        fp1.digitalMax,
      );
    }
    for (let i = 0; i < independent.length; i++) {
      assert.ok(
        Math.abs((parsed[i] ?? 0) - independent[i]!) < 1e-4,
        `sample ${i}: parsed ${parsed[i]} vs independent ${independent[i]}`,
      );
    }
  });

  it("keeps bipolar montage samples as exact source minus source", () => {
    const buffer = loadBundledRecording();
    const header = parseEdfHeader(buffer);
    const rec = readRecords(buffer, header, 0, 2);
    const channels = listChannels(header);
    const banana = montageDerivations("double-banana", channels, []);
    const fp1f7 = banana.find((derivation) => derivation.label === "Fp1–F7");
    assert.ok(fp1f7?.available);
    const derived = applyDerivation(rec.samples, fp1f7!);
    const a = rec.samples[fp1f7!.sources[0]!]!;
    const b = rec.samples[fp1f7!.sources[1]!]!;
    assert.equal(derived.length, a.length);
    for (let i = 0; i < derived.length; i++) {
      assert.equal(derived[i], Math.fround(a[i]! - b[i]!));
    }
  });

  it("plots every calibrated sample on a 10 s page before filtering", () => {
    const buffer = loadBundledRecording();
    const header = parseEdfHeader(buffer);
    const rec = readRecords(buffer, header, 12, 10);
    const raw = rec.samples[0]!;
    const unfiltered = applyFilters(raw, 250, {
      bandpass: false,
      bandpassLow: 0,
      bandpassHigh: 0,
      lff: 0,
      hff: 0,
      notch60: false,
      removeDc: false,
    });
    assert.equal(unfiltered.length, raw.length);
    for (let i = 0; i < raw.length; i++) assert.equal(unfiltered[i], raw[i]);

    const window = traceWindow(unfiltered, 250, 0, 10, 1100);
    assert.equal(window.mode, "native");
    if (window.mode !== "native") return;
    const visible = new Set(unfiltered);
    for (const value of unfiltered) assert.ok(window.values.includes(value) || visible.has(value));
    for (let i = 0; i < unfiltered.length; i++) {
      assert.ok(window.indices.includes(i), `missing source index ${i}`);
    }
  });

  it("native windows include every sample in the requested interval", () => {
    const samples = Float32Array.from({ length: 250 }, (_, i) => i + 0.25);
    const window = nativeTraceWindow(samples, 250, 0.2, 0.8);
    for (let i = Math.floor(0.2 * 250); i <= Math.ceil(0.8 * 250); i++) {
      assert.ok([...window.indices].includes(i), `missing ${i}`);
      assert.equal(window.values[[...window.indices].indexOf(i)], samples[i]);
    }
  });

  it("peak-hold envelopes bound every source sample in a dense window", () => {
    const buffer = loadBundledRecording();
    const header = parseEdfHeader(buffer);
    const rec = readRecords(buffer, header, 0, 20);
    const samples = rec.samples[19]!; // Cz
    const window = envelopeTraceWindow(samples, 250, 0, 20, 400);
    assert.ok(envelopeCoversSamples(samples, 250, 0, 20, window));
    let peak = 0;
    let peakIndex = 0;
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]!) > peak) {
        peak = Math.abs(samples[i]!);
        peakIndex = i;
      }
    }
    assert.ok(window.max.includes(samples[peakIndex]!) || window.min.includes(samples[peakIndex]!));
  });
});
