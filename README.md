# Auris

Auris is a client-only EEG review and sonification workstation for education
and research. It is not a medical device and does not diagnose, classify, or
alert on seizures.

Open a deidentified EDF or EDF+ file in the browser. The file is parsed and
calibrated locally; no recording is uploaded and annotations are held in the
current session only. The app can also generate a built-in synthetic tracing.

The current workstation provides:

- EDF/EDF+ header validation, physical-unit calibration, channel aliases, and
  referential, longitudinal bipolar, transverse, or custom derivations.
- An overview plus a zoomable waveform editor, follow transport, calipers,
  synchronized spectrum/DSA view, montage and filter controls, and mixer mute,
  solo, gain, and stereo placement.
- Explicit annotation import/export, user markers, file annotations, and
  clearly labeled analysis suggestions. Imported annotations are not persisted.
- A locked Loui et al. (2014) Fz–Cz study-reproduction mapping under
  `Evidence`, with a separately disclosed downstream style under `Hybrid`.
  Versioned contour/RMS-pulse mappings remain under `Experimental`, and sound
  remains off until the user selects a mode.
- Deterministic event sonification in `src/lib/sonification/` with bounded
  windows, feature provenance, mapping/style IDs, mapping-audit JSON, and
  browser-independent PCM rendering for the mapped WAV download.

## Data and signal paths

EDF digital samples are converted to their declared physical units and then to
internal microvolts for recognized voltage channels. The loaded recording keeps
the original `ArrayBuffer` and parsed annotations. Derivations and filters
allocate new arrays. The store retains a calibrated analysis path and a
separate display path; EKG display normalization is display-only. Realtime
audio is driven from the analysis path, while the deterministic event core
records its own filter and source-time provenance.

EDF+D discontinuous recordings, incomplete records, mismatched record counts,
unsafe calibration, and unequal-rate bipolar pairs are rejected rather than
silently concatenated or resampled.

## Local development

```sh
npm install
npm run dev
npm test
npm run typecheck
npm run build:pages
npm run preview:pages
```

The development server listens on `0.0.0.0:8080`; the Pages preview uses
`127.0.0.1:4173`. `npm test` runs the JavaScript script tests and all
TypeScript tests under `src/lib/app-data`, `src/lib/auth`, `src/lib/eeg`, and
`src/lib/sonification`. GitHub Pages deployment is defined in
`.github/workflows/deploy-pages.yml` and builds the static `dist` directory.

## Privacy and limits

Use vendor tooling to deidentify files before opening them. Auris hides common
patient and recording identifiers in the UI and warns on suspicious header
text, but a local browser tool is not a deidentification guarantee. Do not add
network upload, durable recording storage, or clinical report claims without a
new product decision and review.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/EEG_READER.md](docs/EEG_READER.md),
[docs/SONIFICATION_ARCHITECTURE.md](docs/SONIFICATION_ARCHITECTURE.md), and
[research/EVIDENCE.md](research/EVIDENCE.md) for implementation and evidence
boundaries.
