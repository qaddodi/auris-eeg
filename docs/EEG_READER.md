# EEG reader

## Accepted input

Auris reads EDF and EDF+ files locally. It validates the EDF version, signal
header dimensions, calibration ranges, record duration, complete record count,
and data-record byte alignment. A record count of `-1` is accepted only when
the complete count can be derived from the file length. EDF+D is rejected
because discontinuities require a segment-aware time axis that the current
reader does not provide.

Each digital sample uses the EDF affine physical calibration. Recognized
voltage units (`V`, `mV`, `uV`/`µV`, and `nV`) are normalized to internal µV;
other declared units remain in their declared physical scale. Channel labels
are canonicalized for common EEG aliases, including legacy temporal names.

The reader extracts EDF+ annotations from all annotation signals using absolute
file-relative TAL onsets and strict UTF-8 decoding. The UI treats these as
file annotations and does not interpret them as diagnoses.

## Derivations and display

Referential channels, standard longitudinal bipolar chains, transverse chains,
and user-defined pairs are represented as explicit derivations. A bipolar pair
is available only when its source rates and lengths are compatible. Filters
reject invalid cutoff/rate combinations and return new arrays.

Waveforms use the display branch. EKG has a whole-record median baseline and
robust display profile independent of EEG sensitivity; that normalization is
never sent to audio or export. DSA uses the analysis data and exposes a stable
cursor-linked view.

## Annotations and privacy

Users can add, edit, undo, redo, import, filter, and export annotations. JSON
imports are validated as a whole, with bounded text, valid timing, known types,
and optional known track IDs. Imported data is marked as `file`; suggestions
are marked `auto`; user edits are marked `user`. Nothing is persisted by the
reader, and the source file stays in browser memory for the session.

The reader is not a clinical viewer. It does not promise artifact rejection,
impedance data, clinical reports, or diagnostic interpretation. Deidentify
files before opening them.
