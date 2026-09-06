# Professional EEG workflow gap analysis

This document compares Auris with the workflow expectations of a professional
EEG review workstation. Natus NeuroWorks and similar systems are used only as
functional references; no proprietary code, assets, or branding are copied.

Auris remains a local, educational, non-diagnostic workstation. Automated
morphology markers are suggestions, not diagnoses or seizure detections. Any
future channel-distribution or confidence display must be backed by explicit
annotation data and a versioned validation gate.

## Classification

| Capability | Status | Findings |
| --- | --- | --- |
| Montage selection | Already good | Referential/original, double-banana, transverse, and custom are selectable. |
| Longitudinal bipolar | Already good | Double-banana derivations are defined and rendered. |
| Transverse bipolar | Already good | Transverse derivations are implemented and selectable. |
| Referential montages | Already good | Original montage exposes calibrated EEG channels. |
| Custom montages | Exists but needs improvement | Pair creation/removal works; ordering and editing are limited. |
| Channel reordering | Missing and lower priority | Derivation order is fixed by montage definitions. |
| Channel hiding | Exists but needs improvement | Mute/solo exists, but muted traces remain visible and there is no collapse/hide state. |
| Sensitivity | Already good | Presets, gain nudges, Fit, and continuous display scaling exist. |
| Timebase | Already good | Window presets, zoom, overview drag, wheel zoom, and page navigation exist. |
| LFF/HFF/notch | Exists but needs improvement | Controls exist, but filtering recomputes the entire recording synchronously. |
| Polarity convention | Already good | Negative-up is an explicit display-only setting. |
| Calibration | Exists but needs improvement | EDF physical/digital calibration is applied; no visible calibration pulse/reference. |
| Channel labels | Already good | Trace gutter labels are present. |
| Per-channel metadata | Exists but needs improvement | Unit, kind, and rate are modeled but not fully exposed per trace. |
| Cursor measurements | Exists but needs improvement | Caliper gives duration/frequency; channel-specific amplitude is absent. |
| Amplitude measurement | Missing and high priority | No calibrated ΔµV/peak-to-peak tool. |
| Duration measurement | Already good | Caliper measures interval and frequency. |
| Page forward/back | Already good | Buttons and PageUp/PageDown shortcuts exist. |
| Continuous scrolling | Exists but needs improvement | Follow is tied primarily to playback; continuous manual review is limited. |
| Keyboard review | Exists but needs improvement | Strong base shortcuts, but no next/previous-event commands. |
| Annotation entry | Already good | Click, form, type, duration, channel, note, import, and export are supported. |
| Annotation editing | Exists but needs improvement | User markers edit; auto/file markers lack accept/copy/review workflow. |
| Annotation deletion | Already good | User markers support deletion and undo/redo. |
| Event navigation | Missing and high priority | No next/previous event controls. |
| Annotation search/filter | Already good | Text and source filters exist. |
| Bad-channel marking | Missing and high priority | No explicit bad-channel state or visual indicator. |
| Artifact marking | Exists but needs improvement | Artifact-like types exist, but no dedicated artifact rail/exclusion semantics. |
| Playback | Already good | Play/pause/stop/loop and synchronized visual cursor exist. |
| Playback speed | Exists but needs improvement | Sonification time scale exists; visual review speed is not independent. |
| Synchronized cursor | Exists but needs improvement | Selection seeks, but rebuilds and viewport operations can desynchronize state. |
| Zoom | Already good | Wheel, buttons, presets, and overview/DSA window controls exist. |
| Patient/study metadata | Exists but needs improvement | Safe duration/rate/format display exists; start date/time is parsed but hidden. |
| EDF annotations | Exists but needs improvement | TAL annotations parse correctly but become channel-less comments. |
| Recording start time | Exists internally, missing in UI | `startDate`/`startTime` are parsed in the EDF header. |
| Elapsed time | Already good | EEG cursor and window elapsed times are visible. |
| Absolute clock time | Missing and high priority | No header-start plus elapsed clock display. |
| Channel sampling rate | Exists but needs improvement | Aggregate/primary rate is shown, not a complete per-channel view. |
| Units | Exists internally, missing in UI | Source units are parsed/calibrated but not clearly surfaced per trace. |
| Gain | Already good | Per-track audio gain and display sensitivity are available. |
| Review history | Missing and lower priority | Annotation undo/redo exists, but no review/session history. |
| Human vs automated source | Already good | User/auto/file sources are modeled and filterable. |
| Suggestion confidence/rationale | Exists but needs improvement | Confidence is stored but not prominently explained or spatially contextualized. |

## Prioritized remaining gaps

### High priority

1. Make event review spatial: selecting an event should center its span, focus
   affected tracks, shade only those lanes, and expose channel/time/duration/source
   in one synchronized view.
2. Add next/previous event navigation and keyboard shortcuts.
3. Add calibrated amplitude measurement to the existing duration caliper.
4. Make filter changes cancellable and viewport-aware while preserving raw data,
   cursor position, and the independent analysis/sonification branches.
5. Add explicit channel visibility and bad-channel/artifact review states.
6. Show EDF recording start plus elapsed time as a clearly labelled recording
   clock, without implying a timezone.

### Medium priority

- Channel reorder/collapse and richer per-channel metadata.
- Accept/copy/reject workflow for automated suggestions.
- Independent visual playback speed.
- Visible calibration reference and source-unit details.
- Continuous manual review-scroll mode.

### Lower priority

- Review history beyond annotation undo/redo.
- More custom montage editing and saved layouts.
- Broader keyboard coverage for montage and filter controls.

## Non-diagnostic boundary

“Suggestion,” “candidate,” and “educational marker” language must remain in the
UI. The application must not present automated morphology as a confirmed seizure,
epileptiform finding, or clinical diagnosis. Channel distributions may only be
shown when explicitly represented by annotation metadata; they must not be
inferred from colors, montage geometry, or sonification output. Raw calibrated
samples must remain preserved, and display sensitivity/filtering must stay clearly
separate from analysis and audio transformations.
