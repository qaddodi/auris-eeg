# Validation

## Automated checks

Run:

```sh
npm test
npm run typecheck
npm run build:pages
```

The test command covers script contracts plus TypeScript suites for app-data,
auth, EEG parsing/DSP, and deterministic event sonification. Current tests
exercise EDF calibration and rejection cases, annotation validation, channel
aliases and montage subtraction, immutable filter/derivation behavior, EKG
display scaling, DSA calculations, audio routing, clipping/NaN handling,
editor behavior, and event provenance/rendering.
The Loui fixture suite additionally asserts 128 events per 10-second 256 Hz
epoch, exact twentieth-sample polling, C-major-pentatonic pitch classes,
published velocity bounds, explicit deterministic 200→256 Hz resampling, and
Hybrid preservation of mapped pitch and timing.

The repository also contains `scripts/browser-smoke.mjs` for desktop/mobile
render and console checks. It requires a local Playwright Chromium executable
and a running app server; it is a browser check, not a substitute for the
unit tests or the Pages build.

## Evidence boundary

Passing automated tests demonstrates code behavior on fixtures. The Loui tests
support symbolic-event fidelity for the disclosed transform; they do not
validate seizure detection, reproduce the proprietary acoustic patch, establish
listener performance, or show clinical utility. `research/EVIDENCE.md` is the
claim registry and release gate.

## Release checks

Before a release, verify the static Pages build, the `/auris-eeg/` base path,
file-only data flow, sound-off default, annotation import/export, no horizontal
overflow on mobile, and the absence of uncaught browser errors. Record only
measured results; do not add throughput or memory claims without a benchmark.
