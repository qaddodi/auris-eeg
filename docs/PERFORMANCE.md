# Performance notes

The current implementation has automated correctness tests for the DSP and
sonification paths. The following development benchmark is a bounded reference,
not a supported maximum or a cross-device guarantee.

## Reference benchmark

Measured on Node 22.22.3 on macOS 27 using a generated 30-minute EDF+ file with
five 200 Hz EEG channels (4,501,792 bytes): synthetic file construction took
17.4 ms, parsing plus annotation extraction took 14.0 ms, and an original
montage with DC removal took 928.5, 902.8, and 904.3 ms across three runs
(904.3 ms median). Resident memory after the third processing run was 138.3
MiB. These figures cover the scripted data path, not browser rendering or audio
start latency.

The main cost centers are predictable from the code: EDF record decoding,
derivation/filter allocation, whole-record morphology and DSA analysis, canvas
decimation, realtime audio worklet control buffers, and WAV allocation on
export. The reader rejects unsupported discontinuities and unsafe mismatches
instead of hiding timing costs behind silent resampling.

The deterministic event core bounds each requested sonification region to 30
seconds and uses bounded feature windows. That is a correctness limit, not a
claim about device performance. Its tests verify deterministic event counts,
source sample/time provenance, and finite rendered output.

## Measurement plan

Future performance work should report browser and device, file bytes, channel
count, sample rates, duration, montage, filter settings, viewport, memory
high-water mark, time to first waveform, audio start latency, and export time.
Keep raw source buffers immutable and measure display, analysis, and audio
branches separately so a display change cannot hide an audio regression.
