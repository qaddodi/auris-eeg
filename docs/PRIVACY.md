# Privacy and data flow

Auris is client-only. A user selects an EDF/EDF+ file and the browser reads it
into an `ArrayBuffer`. Parsing, calibration, montage derivation, filtering,
analysis, waveform rendering, audio playback, and WAV encoding happen locally.
There is no recording upload endpoint and no database-backed study store. The
app shell does not load third-party web fonts or analytics.

The loaded source buffer and session state live in browser memory. User,
file, and suggested annotations are held in the Zustand store for the current
session; annotations leave the app only when the user explicitly exports JSON.
WAV output is also an explicit local download. Do not add localStorage or
session persistence for clinical data without a new review.

The reader hides common patient and recording identifiers and warns when header
text appears identifying, but that is a UI safeguard rather than a guarantee.
Users must deidentify recordings in their acquisition/export tool before
opening them. Filenames, free-text annotations, and malformed vendor metadata
can still contain identifying information.

Audio is off by default and is generated only after a user selects a sound mode
and starts playback/export. The current modes are experimental or musical and
must not be presented as clinical alerts. See `research/EVIDENCE.md` before
adding evidence-linked language.
