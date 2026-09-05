# Norata 2023 pen-on-paper mapping audit

Source: DOI [10.1016/j.seizure.2023.03.011](https://doi.org/10.1016/j.seizure.2023.03.011).

## Source method

The paper is a historical review, not an algorithm specification. Its physical account is:

`EEG voltage → vertical pen displacement`, while paper advances at constant speed. Pen mass and friction limit tracking. Contact with paper produces sound whose character/intensity depends on pen movement velocity. Five supplementary analog recordings illustrate changes during epileptiform events.

No transfer function, mechanical constants, microphone calibration, channel summation rule, normalization rule, acoustic spectrum, or listener accuracy is supplied.

## Current Auris mapping

The live worklet normalizes voltage per track, computes a one-sample difference, maps its absolute value through a gain/clamp to “speed,” adds a voltage-dependent oscillator frequency, and mixes synthetic noise, sinusoid, and grain components. The offline renderer uses similar but non-identical constants. It then filters, pans, mixes, and limits the result.

## Fidelity verdict

**Inspiration only.** Absolute first difference is directionally consistent with velocity, but sample difference is not physical pen velocity unless divided by time and calibrated to displacement. Robust per-track normalization removes absolute amplitude information. The oscillator and noise model has no measured analog target. The live and exported mappings are not parameter-identical.

## Required fidelity test

Record a representative analog writer with synchronized pen position and sound. Specify paper speed, writer mechanics, channel, sensitivity, sample rate, and microphone chain. Fit and cross-validate a causal acoustic model on held-out events; compare envelopes, spectra, onset timing, and expert discrimination against the recordings. Until then label the mode “experimental pen-inspired scratch.”
