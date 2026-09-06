# Architecture

Auris is a browser application built with React, TanStack Router, Vite, and
Zustand. GitHub Pages builds `pages/` with `vite.pages.config.ts`, aliases
`@` to `src`, and emits a static `dist` directory under `/auris-eeg/`. There
is no recording API, database, or upload path in the product.

The main route renders `Workstation`, which composes the control panel,
transport, waveform editor, mixer, event list, and optional DSA view. The
Zustand store in `src/store/eeg-store.ts` is the session coordinator. Browser
audio is managed by `src/lib/eeg/audio.ts` and `public/contour-worklet.js`.

The module boundaries are:

| Boundary | Owns |
| --- | --- |
| `edf.ts` | EDF/EDF+ parsing, record validation, affine calibration, unit normalization, annotations |
| `channels.ts`, `montages.ts` | Label classification, laterality, channel kinds, derivation availability |
| `preprocessing.ts`, `pipeline.ts` | New-array filters, derivation processing, analysis segments, reproducibility metadata |
| `display.ts`, `view.ts`, `spectrum.ts` | Display scaling, viewport behavior, PSD/DSA calculation |
| `sonify.ts`, `musify.ts`, `contour.ts`, `audio.ts` | Realtime worklet control for experimental, musical, Evidence, and Hybrid modes |
| `sonification/index.ts`, `sonification/loui2014.ts` | Deterministic bounded event sessions, provenance, and the locked Loui mapping |
| `annotations.ts`, `event-list.tsx` | Validation, user/file/suggestion markers, undo/redo, explicit JSON import/export |

The signal flow is:

```text
File -> ArrayBuffer -> EDF header/records -> calibrated source channels
     -> montage derivations -> analysis branch -> realtime audio / analysis
     -> display branch -> waveform, EKG display scale, DSA
```

Source buffers are treated as immutable. A display filter or EKG normalization
must not mutate the calibrated source or silently change the audio branch.
Annotations are session state and explicit file exchange; there is no automatic
save.

## Deployment

`npm run build:pages` is the release build. The Pages workflow installs with
`npm ci`, runs tests and typecheck, builds static assets, uploads `dist`, and
deploys through GitHub Pages. The regular TanStack Start/Vercel scaffolding is
present in the repository but is not the Auris release target.
