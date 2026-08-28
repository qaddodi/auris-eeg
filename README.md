# Auris

Local EEG sonification workstation. Educational and research aid — **not a medical device**.

Auris opens deidentified EDF/EDF+ recordings in the browser, draws every selected derivation in one un-scrolled tracing, and turns those waves into sound. Nothing is uploaded. Files are not stored beyond the session.

## What it does

1. Reads EDF/EDF+ locally (Nihon Kohden / Natus-style exports).
2. Builds referential, longitudinal bipolar (double banana), transverse, or custom pairs.
3. Normalizes labels such as `EEG Fp1-REF`, `FP1`, and T3/T7, T4/T8, T5/P7, T6/P8.
4. Sonifies the **entire recording** continuously:
   - **Direct** — the tracing itself, time-compressed (20× / 50× / 100× / 200×). At 100×, 10 Hz alpha is about 1 kHz.
   - **AM** — amplitude modulation of an audible carrier (interpretation).
   - **Hybrid** — mix of the two.
5. Maps left electrodes to the left speaker, right to the right, midline centered. Override per track.
6. Mute and solo (including multiple solos) on every trace, live, like a mixer — playback does not restart.
7. DAW-style editor: overview of the whole file, a zoomable window, playhead that can follow while you zoom.
8. Downloads a 16-bit stereo WAV and prints a reproducibility block of every setting.

Filtering is optional and explicit (DC, 0.5–70 Hz bandpass, 60 Hz notch). Normalization is a high percentile plus a soft limiter. Short fades only exist to stop edge clicks.

## Editor

- **Overview** (top) — the entire recording. Drag the highlighted window to pan; drag its edges to zoom; click to seek.
- **Editor** — all channels fitted in the remaining height (no vertical scroll). Wheel zooms around the cursor; Shift+wheel pans; click/drag scrubs.
- **Follow (F)** — keeps the playhead in the window while sound plays, like a music editor.
- **S / M** on each lane — solo (multi-solo) and mute. Double-click S for exclusive solo. Faders stay live during playback.

## Keyboard

| Key | Action |
| --- | --- |
| Space | Play / pause |
| Esc | Stop |
| L | Loop |
| F | Follow playhead |
| Home / End | Start / end of recording |
| ← → | Skip 1 s (Shift 5 s, Alt 0.2 s) |
| + / − or ] / [ | Zoom in / out |
| 0 | Show entire recording |
| 1–5 | Window 2 / 5 / 10 / 30 / 60 s |
| ? | Shortcut list |

## Privacy

- Patient-name and patient-ID header fields are **not shown**.
- If leftover text looks identifying, a warning appears.
- Do not load identifiable recordings. Deidentify in Natus (or equivalent) **before** export.

## Natus / Nihon Kohden export notes

- Export raw EEG as EDF or EDF+.
- Include the EEG channels you need; annotations only if necessary.
- Apply vendor deidentification, then check patient, recording, annotation, and filename fields.
- Prefer unfiltered signals. Note the original montage, reference, sampling rate, and filters.
- Channel labels vary by installation — correct aliases in Auris if a pair does not form.

## Listening

Choir (default) maps delta / theta / alpha / beta onto a scale so 3 Hz spike-wave pulses the bass and 10 Hz alpha sings. Scale mode turns instantaneous frequency into melody. Direct is the raw wave sped up — solo one or two chains or it is hiss. AM is a carrier tremolo.

Every EEG chain, plus **EKG** (X1–X2) and **lids** (PG1/PG2 / EOG), has Mute and Solo in the mixer and on the lane. Several tracks can be soloed at once.

## Limits

Auris does not detect seizures, mark spikes, or interpret EEG. Choir and scale are musical readings of band power and frequency, not diagnoses. Direct mode is a sped-up waveform, not “what the brain sounds like.”

## Development

```
npm install
npm run dev
npm test
```

Tests cover channel aliases, EKG/lid classification, montage subtraction, missing electrodes, time-compression frequency mapping, choir/scale duration, stereo assignment, clipping/NaNs, synthetic morphologies (alpha, 3 Hz spike-and-wave-like, burst suppression, chirp, muscle, transients), editor zoom/follow, and mute mixdown.
