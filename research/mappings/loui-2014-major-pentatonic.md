# Loui 2014 mapping and bounded reproduction spec

Source: DOI [10.3389/fnhum.2014.00820](https://doi.org/10.3389/fnhum.2014.00820), PMCID PMC4195310.

## Published pipeline

1. Select a 10-second Fz-Cz epoch from 256 Hz CHB-MIT scalp EEG (2,560 samples).
2. Read every twentieth sample, giving 12.8 values per second and 128 values per epoch.
3. Linearly scale the numeric data to values 1–40.
4. Snap each value to the nearest C-major-pentatonic degree in the list `0, 2, 4, 7, 9, 12, 14, 16, …, 40`. The paper gives 11→12 as an example.
5. Send these as MIDI note data; randomize velocity from 85 through 127.
6. Render with Native Instruments Massive preset “Old and Far Away,” described as three low-pass-filtered sine/saw oscillators with fast attack and release.
7. Preserve the 10-second duration; the method does not time-compress the EEG.

## Historical Auris Piano mapping

Auris estimates a local dominant rate with zero crossings, derives pitch from that rate or instantaneous normalized voltage, supports user-selected roots/scales, adds a six-semitone transient heuristic, rate-limits note changes, and uses a custom additive piano-like oscillator. It groups EEG by laterality. These are substantial differences from the evaluated single-channel pipeline.

## Fidelity verdict

**Materially different.** The paper supports neither the current “ordinary vs abnormal” musical behavior nor clinical classification from this mapping.

## Implemented locked preset

`loui-2014-fz-cz-v1@1.0.0` implements steps 1–5 as a bounded Level B
symbolic study reproduction. It uses epoch min/max, maps flat epochs to 20.5
before snapping, resolves exact ties toward the lower degree, uses MIDI 48 as
the base for the published 0–40 offsets, gives each event a 20/256-second gate,
and derives deterministic velocity in the published 85–127 range. Its audit
table records resampled sample index/time, source voltage, scaled value, snapped
offset, MIDI frequency, velocity, filters, and original sample-rate provenance.

The proprietary preset prevents exact acoustic reproduction unless the original
instrument/version and preset are available. Evidence therefore uses a neutral
sine; Hybrid adds a separately versioned soft second harmonic while preserving
mapped pitch and timing. Realtime preview uses fixed envelope gain, while WAV
export uses the deterministic velocity. Human results do not transfer until a
held-out listener study reproduces them.
