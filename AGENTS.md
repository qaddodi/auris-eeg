# Auris agent contract

Auris is a client-only EEG review and sonification workstation. Keep the app
educational and non-diagnostic. Raw EDF/EDF+ data is read in the browser and
must not be uploaded or persisted by new features unless the user explicitly
changes that product boundary.

## Source of truth

- `src/lib/eeg/edf.ts` owns EDF parsing, calibration, annotation extraction,
  and input validation.
- `src/lib/eeg/pipeline.ts` and `src/lib/eeg/montages.ts` own derivations and
  processing; `src/lib/eeg/display.ts` owns display-only auxiliary scaling.
- `src/store/eeg-store.ts` owns session state, controls, playback wiring, and
  annotation import/export. Do not add silent persistence.
- `src/lib/eeg/sonify.ts` owns the realtime experimental/musical controls.
  `src/lib/sonification/index.ts` owns deterministic bounded event sessions,
  and `src/lib/sonification/loui2014.ts` owns the locked Level B Loui mapping
  used by realtime Evidence/Hybrid playback and deterministic exports.
- `research/EVIDENCE.md` and `docs/` define claim and evidence boundaries.

Preserve calibrated source samples. Keep display, analysis, and audio branches
explicit and traceable. Do not call a mapping evidence-based, clinical, or a
seizure detector without a versioned fidelity and validation gate.

## Work roles

Use Terra for substantial implementation, architecture, and cross-module
changes. Use Luna for bounded mechanical work such as tests, docs, and small
isolated fixes. Do not use Sol for this repository.

## Checks

Run `npm test`, `npm run typecheck`, and `npm run build:pages` for changes that
affect the app or release path. The Pages build uses `vite.pages.config.ts`
with base `/auris-eeg/`. Keep the app deployable as a static GitHub Pages site.
Use browser smoke/visual checks for UI changes when the local browser tooling is
available. Do not introduce secrets, database writes, accounts, or server data
flows into the client-only product.

## Platform compatibility

The hosting platform still owns the `/workspace` preview contract when this
repository is run in its Linux builder. Keep `/workspace/startup.sh` as the
idempotent `npm run dev` entrypoint for that environment, and keep generated
platform files under `public/__grok/` and `server/` intact. The branding pass
uses `/workspace/.grok/og-pending`; its marker is stale after 10 minutes.

6. **Brand-asset pass**: If a task tool exists, dispatch the pass for branded
   assets and continue the implementation. **Never wait_tasks** for that pass
   and **never get_task_output** from it; the pass may finish independently.
   The pass remains independent: **never wait_tasks**, and **never
   get_task_output** to turn it into a blocking dependency.
7. Verify the rendered app, tests, typecheck, and release build before handing
   off work.
