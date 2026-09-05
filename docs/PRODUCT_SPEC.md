# Product specification

## Product boundary

Auris is a local-first browser workstation for inspecting deidentified EEG and
listening to clearly labeled experimental mappings. It is an educational and
research aid, not a clinical device. The release target is a static GitHub
Pages site, with no account, upload, database, or cross-device session model.

## User flow

1. Open an EDF/EDF+ file or generate the built-in synthetic demo tracing.
2. Review validated recording metadata and selected channels.
3. Choose a montage, optional filters, sensitivity, timebase, and viewport.
4. Review waveforms, DSA, file annotations, and user markers.
5. Select `Evidence`, `Hybrid`, `Experimental`, or `Musical` sound and start
   playback or export a WAV. Sound remains off until the user acts. Evidence
   and Hybrid lock the audio source to raw Fz–Cz and disable unrelated mixer
   controls.
6. Export annotations explicitly when a portable marker file is needed.

## Supported concepts

The product supports referential, longitudinal bipolar, transverse, and custom
derivations; EEG, EKG, EOG, EMG, and other trace classification; mute/solo/gain
and stereo routing; overview plus zoomed waveform navigation; calipers;
keyboard transport; DSA; and JSON annotation import/export.

## Claims and sound modes

Contour and RMS Pulse are experimental transformations. Musical applies a
fixed C-major-pentatonic style to the contour mapping. These mappings do not
detect seizures or establish normality.

Evidence implements the disclosed symbolic transform from Loui et al. (2014)
as the versioned `loui-2014-fz-cz-v1` mapping: Fz–Cz, explicit 256 Hz linear
resampling when necessary, 10-second epoch scaling, every twentieth sample,
and C-major-pentatonic pitch at 12.8 events per second. It is classified Level
B because the underlying paper includes a peer-reviewed listener study while
remaining insufficient for a clinical EEG workflow. Auris substitutes
deterministic velocity and a neutral sine for the paper's randomized velocity
and unavailable proprietary synthesizer patch. Hybrid preserves pitch and
timing and adds the separately versioned `loui-soft-v1` style.

The deterministic event-sonification core drives mapping-audit JSON and mapped
WAV export. Realtime preview uses the corresponding workstation audio path.

## Deferred work

Persistent study storage, formal bad-channel workflows, impedance display,
clinical report formats, independent mapping review, prospective validation,
and a segment-aware EDF+D timeline remain future phases. Each requires a
deliberate product and privacy review before implementation.
