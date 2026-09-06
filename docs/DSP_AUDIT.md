# EEG DSP audit

This audit covers EDF/EDF+ parsing, calibration, montage derivation, preprocessing, and the display/audio processing boundary. The application is a creative sonification tool, not a clinical EEG reader; unsupported inputs are rejected when continuing would silently alter timing or voltage.

## Reference basis

- The [EDF specification](https://www.edfplus.info/specs/edf.html) defines fixed-width headers, little-endian signed 16-bit samples, per-signal samples per data record, and the physical/digital affine calibration.
- The [EDF+ specification](https://www.edfplus.info/specs/edfplus.html) defines UTF-8 time-stamped annotation lists and makes each TAL onset relative to file start. It also defines EDF+D records as potentially discontinuous.
- The [EDF programming guidelines](https://www.edfplus.info/specs/guidelines.html) confirm that ordinary samples are evenly spaced only inside each record and that gaps can occur between EDF+D records.
- The [EDF standard texts](https://www.edfplus.info/specs/edftexts.html) define signal polarity as physical minimum plus the scaled offset from digital minimum, and map legacy T3/T4/T5/T6 positions to T7/T8/P7/P8.
- [ACNS Guideline 3](https://www.acns.org/UserFiles/file/EEGGuideline3Montage_final20160323revclean_v1.pdf) describes standard longitudinal and transverse bipolar montage classes. The implemented 18-channel longitudinal chains match the conventional double-banana ordering.

## Findings and disposition

| Area | Prior behavior | Disposition |
| --- | --- | --- |
| Truncation | A short final record was accepted and its unread samples remained zero-filled. | Reject partial records and record-count/file-length mismatches. Support the standard `-1` unknown count only when complete records can be derived exactly. |
| Calibration | The EDF affine calibration was correct, including negative physical gain, but downstream sensitivity treated every voltage channel as µV. | Preserve the affine mapping and normalize recognized EEG/EOG/EMG/ECG voltage units (`V`, `mV`, `uV`/`µV`, `nV`) to internal µV. Non-voltage channels retain their declared physical unit. |
| EDF+D | Records were concatenated as though continuous. | Reject EDF+D. Correct support requires a segment-aware time axis throughout display, analysis, and audio. |
| EDF+ annotations | The record origin was added to an onset that is already relative to file start; only the first annotation signal was read; malformed UTF-8 was silently discarded by `loadRecording`. | Use absolute TAL onsets, read all annotation signals, decode UTF-8 strictly, and propagate malformed annotation errors. |
| Mixed rates | Bipolar channels were subtracted by array index and shortened to the smaller buffer. | Mark pairs unavailable when rates differ; defensively reject unequal source lengths and inconsistent external derivations. Referential channels with different rates remain supported. |
| Filters | Invalid frequency settings were clamped, which could produce a materially different filter without notice. | Reject invalid rates, reversed bands, and active cutoffs at or above Nyquist. All transforms return new arrays. |
| Source ownership | Most processing already allocated output arrays. | Regression tests now verify derivation/filter paths do not mutate source buffers. |

## Remaining engineering limits

The forward/backward biquad implementation gives zero phase for interior samples but does not use reflected padding or initial-condition estimation. Edge transients can therefore be stronger than in established offline EEG packages. Segments should include processing margin and trim it before display or export if clinical-looking edge fidelity becomes a requirement.

Display and audio currently consume the same filtered `ProcessedTrack.samples`. This keeps what is heard aligned with what is shown, but it also couples a display filter change to sonification and morphology analysis. The store should retain immutable calibrated source segments, derive a named display/analysis branch, and derive audio from the source (or from an explicitly selected shared-filter branch). Reproducibility metadata should state which branch was sonified. That store-level change is outside this audit's bounded files.
