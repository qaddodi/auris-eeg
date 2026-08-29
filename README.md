# Auris

Local EEG sonification workstation. Educational and research aid — **not a medical device**.

Auris opens deidentified EDF/EDF+ recordings in the browser, draws every selected derivation in one un-scrolled tracing, and turns those waves into sound. Nothing is uploaded. Files are not stored beyond the session.

## What it does

1. Reads EDF/EDF+ locally (Nihon Kohden / Natus-style exports).
2. Builds referential, longitudinal bipolar (double banana), transverse, or custom pairs.
3. Normalizes labels such as `EEG Fp1-REF`, `FP1`, and T3/T7, T4/T8, T5/P7, T6/P8.
4. Sonifies the **entire recording** continuously:
   - **Direct** — the tracing itself, time-compressed (20× / 50× / 100× / 200×). At 100×, 10 Hz alpha is about 1 kHz.
   - **Ambient** — smoothed band power mapped to a restrained harmonic bed.
   - **Piano** — scale-quantized contour with rate-limited transient accents.
   - **Pen / Pulse / Choir** — alternate educational mappings.
5. Maps left electrodes to the left speaker, right to the right, midline centered. Override per track.
6. Mute and solo (including multiple solos) on every trace, live, like a mixer — playback does not restart.
7. DAW-style editor: overview of the whole file, a zoomable window, playhead that can follow while you zoom.
8. Downloads a 16-bit stereo WAV and prints a reproducibility block of every setting.

Review-oriented additions include a stable semantic trace palette, an independently
normalized EKG display, a robust PSD/dB DSA strip with synchronized cursor, prominent
annotation/suggestion visibility controls, a top-level Follow transport, a collapsed
Extra tools mixer, and optional audible scrubbing. EKG normalization is display-only;
the physical samples and exported audio are unchanged.

Filtering is optional and explicit (DC, 0.5–70 Hz bandpass, 60 Hz notch). Normalization is a high percentile plus a soft limiter. Short fades only exist to stop edge clicks.

## Editor

- **Overview** (top) — the entire recording. Drag the highlighted window to pan; drag its edges to zoom; click to seek.
- **Editor** — all channels fitted in the remaining height (no vertical scroll). Wheel zooms around the cursor; Shift+wheel pans; click/drag scrubs.
- **Follow (F)** — keeps the playhead in the window while sound plays, like a music editor. Manual pan or scrub turns it off so the viewport never fights the user.
- **S / M** on each lane — solo (multi-solo) and mute. Double-click S for exclusive solo. Faders stay live during playback.

Trace colors are assigned from a stable derivation identity. Zoom, pan, decimation,
montage order, and signal amplitude do not recolor a channel. EKG uses a full-recording
median baseline and percentile/peak-envelope scale with an outlier clamp, independent
of the EEG sensitivity control.

## Keyboard

| Key            | Action                          |
| -------------- | ------------------------------- |
| Space          | Play / pause                    |
| Esc            | Stop                            |
| L              | Loop                            |
| F              | Follow playhead                 |
| Home / End     | Start / end of recording        |
| ← →            | Skip 1 s (Shift 5 s, Alt 0.2 s) |
| + / − or ] / [ | Zoom in / out                   |
| 0              | Show entire recording           |
| 1–5            | Window 2 / 5 / 10 / 30 / 60 s   |
| ?              | Shortcut list                   |

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

Ambient maps smoothed delta / theta / alpha / beta power onto a restrained harmonic
choir: slow activity is the low drone, alpha is the central harmonic voice, and faster
activity adds quieter upper roles. Piano uses a configurable scale, compressed amplitude,
pitch hysteresis, and a minimum note interval so transient accents do not chatter. Direct
is the raw wave sped up — solo one or two chains or it is hiss. Audible scrubbing uses
short tapered grains around the pointer, rate-limited to prevent overlapping bursts.

Every EEG chain, plus **EKG** (X1–X2) and **lids** (PG1/PG2 / EOG), has Mute and Solo in the mixer and on the lane. Several tracks can be soloed at once.

## Limits

Auris does not detect seizures, mark spikes, or interpret EEG. Ambient, piano, choir, and
scale are musical readings of band power and frequency, not diagnoses. Direct mode is a
sped-up waveform, not “what the brain sounds like.”

## Review workflow scope

Implemented: quick montage and filter access, sensitivity/timebase controls, caliper
measurement, channel labels with M/S state, event navigation, keyboard shortcuts,
page-forward/page-back review, synchronized cursor values, stable DSA navigation, and
compact recording status in the transport. Deferred: persistent study/session storage,
formal bad-channel annotations, annotation editing dialogs, impedance display, and
clinical report/export formats; those need a larger data model than this local teaching aid.

## Development

```
npm install
npm run dev
npm test
```

Tests cover channel aliases, EKG/lid classification, montage subtraction, missing electrodes, independent EKG display gain, stable trace colors, time-compression frequency mapping, choir/scale duration, stereo assignment, clipping/NaNs, synthetic morphologies (alpha, 3 Hz spike-and-wave-like, burst suppression, chirp, muscle, transients), editor zoom/follow, DSA PSD/robust dB scaling, audible-scrub bounds/cleanup, and mute mixdown.
