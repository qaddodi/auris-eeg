# Sonification architecture

Auris has a realtime preview path and a deterministic export path.

The realtime workstation uses `src/lib/eeg/audio.ts`, `sonify.ts`,
`contour.ts`, and `src/lib/sonification/loui2014.ts`. Experimental mode exposes
the versioned contour and RMS-pulse mappings. Musical mode fixes the contour
mapping and adds the versioned C-major-pentatonic style. Evidence locks the
source to Fz–Cz and applies `loui-2014-fz-cz-v1`; Hybrid preserves that mapped
pitch and timing and adds `loui-soft-v1`. The general mixer applies mute, solo,
gain, laterality, and stereo routing without restarting playback, while the
locked study-reproduction modes intentionally bypass those controls. Sound
starts off by default.

Audio uses the analysis branch. Display sensitivity, display filters, EKG
display normalization, annotation overlays, DSA rendering, and display polarity
are not audio features. Every available mapping is educational and experimental.

`src/lib/sonification/index.ts` is the deterministic event and export core;
`src/lib/sonification/loui2014.ts` is the dedicated locked-mapping generator. It
limits requested regions to 30 seconds, computes bounded feature windows, maps
them through versioned mapping/style IDs, freezes provenance objects, and
renders browser-independent PCM for the mapped WAV download. Its output includes
source sample ranges, source times, channel and derivation information, filter
settings, normalization, and an explicit non-diagnostic statement. The same
session object is available as the mapping-audit JSON export.

## Current mapping language

Use “study reproduction · Level B” for the locked Loui mapping and
“Hybrid · B + style” for its styled derivative. Use “experimental mapping” or
“musical mapping” for the engineering transforms. Historical Pen, Choir, and
Piano prototypes remain in source for research comparison and are not exposed
as current product mappings. The research registry explains why they do not
reproduce the related publications. Do not expose seizure likelihood, abnormal
labels, or clinical alerts from any transformation.

## Next audio work

The next safe phase is independent review of the locked event fixtures against
the primary method, followed by a preregistered prospective listener study.
Neither the implementation nor the paper's results establish performance on
new recordings, populations, montages, or clinical workflows.
