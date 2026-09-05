# Wu 2009 scale-free mapping audit

Source: DOI [10.1371/journal.pone.0005915](https://doi.org/10.1371/journal.pone.0005915), PMID 19526057.

## Source method

Wu et al. detect individual EEG waves using zero crossings. One wave becomes one note. Peak-to-peak wave amplitude controls pitch through a nonlinear relation derived from EEG and music power-law arguments. Wave period becomes note duration. The logarithm of the change rate of average power controls intensity. Timbre is fixed (piano in the reported implementation). For a reported parameterization, MIDI pitch spans 24–108. The sleep example used Cz, 250 Hz sampling, and 0.5–40 Hz filtering.

The article's equations are displayed as equation images. This audit verified the surrounding definitions and reported constants in the publisher full text, but did not obtain a trustworthy machine-readable transcription of equations 1 and 8–9. Those equations must be transcribed manually from the typeset source and checked by a second reviewer before implementation.

## Current Auris Choir mapping

Auris normalizes the trace, applies four fixed band-pass filters (delta, theta, alpha, beta), follows each band envelope, resamples those envelopes, and applies them to four fixed just-intonation tones. Voice gain is `1/(band index + 1)`. The mapping does not segment waves or map peak-to-peak amplitude to pitch, wave period to duration, or power-change logarithm to intensity.

## Fidelity verdict

**Materially different.** Calling the fixed gain weights “1/f loudness (Wu 2009)” conflates an implementation choice with Wu's scale-free mapping. Cite Wu as related literature only, or build a separately named faithful implementation after equation transcription and fixture review.
