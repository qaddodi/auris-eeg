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

## Automated review candidates

Auris generates deterministic, non-diagnostic review candidates using a local
30-second robust median/MAD baseline. It uses descriptive duration bands of
20–<70 ms and 70–200 ms, plus morphology support and cross-track clustering.
Candidates are independently capped within 30-second buckets so early parts of
a recording cannot consume a global quota. Candidate IDs are deterministic for
the same recording and processing inputs.

These cues make no claim of normality, abnormality, epileptiformity, or seizure
detection, and have no validation metrics. They require expert visual review.

## Derivations and display

Referential channels, standard longitudinal bipolar chains, transverse chains,
and user-defined pairs are represented as explicit derivations. A bipolar pair
is available only when its source rates and lengths are compatible. Filters
reject invalid cutoff/rate combinations and return new arrays.

Optional display-only Artifact Reduction, ICA, and Spatial Filter use EOG and
EMG (or frontal Fp leads as ocular proxies) to subtract noise from EEG traces
after LFF/HFF/notch. They never write the raw montage, analysis, or audio
branches, and they are not a diagnostic artifact-rejection system.

Waveforms use the display branch. Review pages plot every calibrated sample at
its true time as a polyline (native mode) so no point is dropped before
filtering. When a window is both denser than one sample per pixel and longer
than the native sample budget, the renderer switches to peak-hold columns:
every source sample in a physical pixel contributes to that pixel's min and
max, so spikes keep their true amplitude. EKG has a whole-record median
baseline and robust display profile independent of EEG sensitivity; that
normalization is never sent to audio or export. DSA uses the analysis data
and exposes a stable cursor-linked view.

## Annotations and privacy

Users can add, edit, undo, redo, import, filter, and export annotations. JSON
imports are validated as a whole, with bounded text, valid timing, known types,
and optional known track IDs. Imported data is marked as `file`; suggestions
are marked `auto`; user edits are marked `user`. Nothing is persisted by the
reader, and the source file stays in browser memory for the session.

The reader is not a clinical viewer. Optional EOG/EMG display cleaning is an
educational aid, not validated artifact rejection. The reader does not promise
impedance data, clinical reports, or diagnostic interpretation. Deidentify
files before opening them.
