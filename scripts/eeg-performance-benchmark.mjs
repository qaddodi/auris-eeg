#!/usr/bin/env node
/**
 * Reproducible, non-gating EEG processing benchmark.
 *
 * This reports timings for the current machine only; it intentionally has no
 * wall-time assertions. Use the TypeScript strip-types loader because the
 * benchmark exercises the same source modules as the browser app:
 *
 *   node --expose-gc --experimental-strip-types scripts/eeg-performance-benchmark.mjs
 *   node --expose-gc --experimental-strip-types scripts/eeg-performance-benchmark.mjs \
 *     --duration=60 --viewport=10 --filter-iterations=5 --repeats=2
 */

import { buildSyntheticEdf, sine } from "../src/lib/eeg/synthetic.ts";
import { loadRecording, parseEdfHeader, readRecords } from "../src/lib/eeg/edf.ts";
import { derivationsFor, processSegment } from "../src/lib/eeg/pipeline.ts";
import { buildDisplayWindow, planDisplayWindow } from "../src/lib/eeg/display-pipeline.ts";
import { detectMorphologies } from "../src/lib/eeg/patterns.ts";
import { buildDsa } from "../src/lib/eeg/spectrum.ts";

function numberArg(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const parsed = value == null ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`--${name} must be a positive number.`);
  return parsed;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

function elapsed(fn) {
  const start = performance.now();
  const value = fn();
  return { value, ms: performance.now() - start };
}

function rssMiB() {
  return process.memoryUsage().rss / 1024 / 1024;
}

function collectGarbage() {
  if (typeof globalThis.gc === "function") globalThis.gc();
}

async function elapsedAsync(fn) {
  const start = performance.now();
  const value = await fn();
  return { value, ms: performance.now() - start };
}

const duration = numberArg("duration", 1800);
const viewport = Math.min(duration, numberArg("viewport", 10));
const filterIterations = Math.floor(numberArg("filter-iterations", 5));
const repeats = Math.floor(numberArg("repeats", 3));
const fs = 200;

const built = elapsed(() =>
  buildSyntheticEdf({
    duration,
    left: sine(10, fs, duration, 50),
    right: sine(12, fs, duration, 10),
    midline: sine(8, fs, duration, 20),
  }),
);
const buffer = built.value;
const parsed = elapsed(() => parseEdfHeader(buffer));
const loaded = await elapsedAsync(() => loadRecording(buffer, "benchmark.edf"));
const recording = loaded.value;
collectGarbage();
const afterLoadMemoryMiB = rssMiB();
const derivations = derivationsFor(recording, "original", []);
const filters = {
  bandpass: false,
  bandpassLow: 0.5,
  bandpassHigh: 70,
  lff: 0,
  hff: 0,
  notch60: false,
  removeDc: true,
};
const rawFilters = { ...filters, removeDc: false };
const viewportStart = Math.max(0, duration / 2 - viewport / 2);

function repeated(label, fn) {
  const samples = [];
  for (let i = 0; i < repeats; i++) samples.push(elapsed(fn).ms);
  return { label, medianMs: median(samples), samplesMs: samples };
}

const fullRead = repeated("readRecords full recording", () => readRecords(buffer, parsed.value, 0, duration));
const viewportRead = repeated("readRecords viewport", () =>
  readRecords(buffer, parsed.value, viewportStart, viewport),
);
const fullProcess = repeated("processSegment full recording", () =>
  processSegment(recording, 0, duration, derivations, filters),
);
const viewportProcess = repeated("processSegment viewport", () =>
  processSegment(recording, viewportStart, viewport, derivations, filters),
);

// The display pipeline pays the whole-record decode/derivation cost once, then
// filters only a bounded prefetched window for each visible-page update.
const rawStartedAt = performance.now();
const rawSegment = processSegment(recording, 0, duration, derivations, rawFilters);
const rawBuildMs = performance.now() - rawStartedAt;
collectGarbage();
const rawMemoryMiB = rssMiB();
const displayPlan = planDisplayWindow(viewportStart, viewport, duration, filters);
const displayPrefetch = repeated("buildDisplayWindow prefetched viewport", () =>
  buildDisplayWindow(rawSegment, displayPlan, filters),
);

const rapidFilter = elapsed(() => {
  let checksum = 0;
  for (let i = 0; i < filterIterations; i++) {
    const processed = processSegment(recording, 0, duration, derivations, {
      ...filters,
      lff: [0, 0.5, 1, 1.6, 5][i % 5],
      hff: 70,
    });
    checksum += processed.tracks[0]?.samples[0] ?? 0;
  }
  return checksum;
});

const rapidDisplayFilter = elapsed(() => {
  let checksum = 0;
  for (let i = 0; i < filterIterations; i++) {
    const activeFilters = {
      ...filters,
      lff: [0, 0.5, 1, 1.6, 5][i % 5],
      hff: 70,
    };
    const display = buildDisplayWindow(
      rawSegment,
      planDisplayWindow(viewportStart, viewport, duration, activeFilters),
      activeFilters,
    );
    checksum += display.tracks[0]?.samples[0] ?? 0;
  }
  return checksum;
});
collectGarbage();
const rapidMemoryMiB = rssMiB();

const processed = processSegment(recording, 0, duration, derivations, filters);
const morphology = elapsed(() => detectMorphologies(processed.tracks));
const dsa = elapsed(() => buildDsa(processed.tracks, processed.duration));
collectGarbage();

console.log(
  JSON.stringify(
    {
      parameters: {
        durationSec: duration,
        viewportSec: viewport,
        filterIterations,
        repeats,
        bytes: buffer.byteLength,
        signals: parsed.value.signals.length,
        availableDerivations: derivations.filter((item) => item.available).length,
      },
      stagesMs: {
        syntheticBuild: built.ms,
        parseHeader: parsed.ms,
        loadRecording: loaded.ms,
        fullRead,
        viewportRead,
        fullProcess,
        viewportProcess,
        rapidFilterChanges: {
          iterations: filterIterations,
          totalMs: rapidFilter.ms,
          averageMs: rapidFilter.ms / filterIterations,
        },
        displayPrefetch,
        rapidDisplayFilterChanges: {
          iterations: filterIterations,
          totalMs: rapidDisplayFilter.ms,
          averageMs: rapidDisplayFilter.ms / filterIterations,
        },
        morphology: morphology.ms,
        dsa: dsa.ms,
      },
      outputs: {
        morphologyCount: morphology.value.length,
        dsaFrames: dsa.value?.nTime ?? 0,
        dsaBins: dsa.value?.nFreq ?? 0,
      },
      memoryMiB: {
        afterLoad: afterLoadMemoryMiB,
        afterRawSegment: rawMemoryMiB,
        afterRapidPaths: rapidMemoryMiB,
        afterAnalysis: rssMiB(),
      },
      displayWindow: displayPlan,
      rawBuildMs,
      garbageCollectionExposed: typeof globalThis.gc === "function",
    },
    null,
    2,
  ),
);
