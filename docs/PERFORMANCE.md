# Performance notes

The current implementation has automated correctness tests for the DSP and
sonification paths. The following development benchmark is a bounded reference,
not a supported maximum or a cross-device guarantee.

## Reference benchmark

Measured on Node 22.22.3 on macOS 27 using the reproducible benchmark at
`scripts/eeg-performance-benchmark.mjs` and a generated 30-minute EDF+ file
with five available 200 Hz EEG derivations (4,501,792 bytes, six EDF signals
including the annotation signal). The command was:

```text
node --expose-gc --experimental-strip-types scripts/eeg-performance-benchmark.mjs \
  --duration=1800 --viewport=10 --filter-iterations=3 --repeats=2
```

The measurements below are local development measurements, not support limits.
The “before” column is the pre-calibration-cache path measured earlier on this
machine; the “after” column is the current path. The display-prefetch rows are
new measurements from the bounded `display-pipeline.ts` branch.

| Operation | Before | After | Notes |
| --- | ---: | ---: | --- |
| Full EDF sample decode (`readRecords`) | 0.93–1.22 s | 4.02 ms median | Per-signal calibration/classification is now cached. |
| Full `processSegment` | ~0.96 s | 7.46 ms median | Includes full decode, derivation, and display filter. |
| 10 s `readRecords` viewport | 6.51 ms | 0.030 ms median | Same 30-minute source recording. |
| 10 s `processSegment` viewport | not separately recorded | 0.067 ms median | Legacy path still decodes only this requested interval. |
| Three rapid full-recording filter changes | ~2.89 s* | 91.5 ms | ~30.5 ms/change after decode optimization. |
| One prefetched display filter update | not available | 1.66 ms median | Filters a 30 s prefetched window for a 10 s page. |
| Three rapid prefetched display filter changes | not available | 5.16 ms total | ~1.72 ms/change; source montage remains cached. |

\* The earlier rapid-filter run used ten changes at approximately 962 ms per
change (~9.62 s total); the three-change figure above is normalized from that
same run for easier comparison.

The current run also measured a one-time raw montage build at 3.14 ms,
morphology detection at 51.9 ms, and DSA construction at 66.3 ms. RSS after
explicit GC was 91.3 MiB after load, 134.8 MiB after retaining the raw
full-recording montage, 166.6 MiB after the rapid filter paths, and 183.0 MiB
after morphology/DSA. These are process RSS snapshots; they include the Node
runtime and retained benchmark outputs and are not browser heap measurements.

The main remaining costs are full-recording raw/analysis retention, whole-record
morphology and DSA analysis, canvas decimation, realtime audio worklet control
buffers, and WAV allocation on export. The reader rejects unsupported
discontinuities and unsafe mismatches instead of hiding timing costs behind
silent resampling.

The deterministic event core bounds each requested sonification region to 30
seconds and uses bounded feature windows. That is a correctness limit, not a
claim about device performance. Its tests verify deterministic event counts,
source sample/time provenance, and finite rendered output.

## Measurement plan

The benchmark reports JSON for synthetic file construction, EDF header/load,
full and viewport decode, full and viewport processing, rapid full-recording
filter changes, prefetched display filtering, morphology, DSA, display-window
geometry, and RSS snapshots. It accepts `--duration`, `--viewport`,
`--filter-iterations`, and `--repeats`. `--expose-gc` is optional; when present,
the script performs GC before memory snapshots and reports that fact. Timings
are informational and intentionally have no machine-specific pass/fail
thresholds.

For browser-level follow-up, report browser and device, file bytes, channel
count, sample rates, duration, montage, filter settings, viewport, memory
high-water mark, time to first waveform, audio start latency, and export time.
Keep raw source buffers immutable and measure display, analysis, and audio
branches separately so a display change cannot hide an audio regression.

### Methodology and limitations

The synthetic fixture contains five 200 Hz voltage channels and one EDF+
annotation signal, with a 30-minute continuous timeline. It does not represent
high-channel clinical files, mixed sample rates, discontinuous EDF+D, browser
GC behavior, Retina canvas cost, or AudioWorklet transfer cost. The legacy full
path intentionally includes EDF decode on each filter change. The prefetched
path first builds one immutable raw montage and then applies filters to the
bounded window returned by `planDisplayWindow`; its 30-second window is an
implementation choice for a 10-second page and may be larger for low LFF
settings. The prefetch benchmark validates processing latency, not visual
equivalence, which still requires waveform regression and interactive browser
checks.
