# Scientific evidence and release gate

Last reviewed: 2026-09-05

## Scope

This dossier traces the literature claims that are most relevant to Auris's current listening modes. It is a scientific provenance record, not a clinical validation. A paper supporting a general sonification idea does not validate a new implementation that uses different preprocessing, channel selection, scaling, synthesis, or listener training.

## Finding

The locked `loui-2014-fz-cz-v1` mapping reproduces the paper's disclosed
symbolic mapping and is classified **Level B**: peer-reviewed human evaluation,
but insufficient validation for a clinical EEG workflow. Its acoustic
substitutions are disclosed below. No Auris mode is a validated seizure detector.

* **Pen** is a new digital sound design inspired by the historical observation reviewed by Norata et al. (2023). The review describes physical pen motion, mass, friction, paper speed, and noise depending on pen velocity. It does not specify or validate Auris's oscillator/noise synthesis, normalization, derivative gain, filters, or stereo mix.
* **Choir** is not the Wu et al. (2009) scale-free mapping. Auris splits EEG into four conventional bands, uses their envelopes to control fixed just-intonation tones, and applies weights `1/(band index + 1)`. Wu instead segments individual waves, maps peak-to-peak amplitude nonlinearly to MIDI pitch using a power-law-derived relation, maps each wave period to note duration, and maps change in average power logarithmically to note intensity. “1/f loudness (Wu 2009)” is therefore unsupported.
* The historical **Piano** prototype resembles the note vocabulary of Loui et al. (2014), but not its tested pipeline. It is not exposed as the Evidence mapping. The locked Evidence implementation uses Fz-Cz, 10-second epoch normalization, every twentieth 256 Hz sample, and the disclosed C-major-pentatonic transform. It substitutes deterministic velocities and a neutral sine because the publication's random sequence and proprietary patch are unavailable; Hybrid adds a disclosed downstream soft harmonic without changing mapped pitch or timing.
* **Contour, Pulse, Ambient, and Direct** are engineering mappings. They can be described transparently by their transformations. No human-performance or clinical evidence located here transfers automatically to them.

## Primary evidence

### Norata et al., 2023 — historical pen-on-paper sound

Davide Norata, Serena Broggi, Lara Alvisi, Simona Lattanzi, Francesco Brigo, and Paolo Tinuper. “The EEG pen-on-paper sound: History and recent advances.” *Seizure* 107 (2023): 67–70. DOI: [10.1016/j.seizure.2023.03.011](https://doi.org/10.1016/j.seizure.2023.03.011).

This is a narrative review with five supplementary analog video-EEG examples, not a controlled digital-sonification trial. It states that analog pen tips moved with the signal while paper moved at constant speed; physical mass and friction limited response; and writing noise depended on movement velocity. The examples illustrate conspicuous changes during epileptiform discharges, but they do not estimate sensitivity, specificity, false-alarm rate, or reader performance. The authors explicitly discuss historical expert use and future potential.

Implication: cite this paper for the history and physical intuition only. A derivative-controlled synthetic scratch is a plausible hypothesis, but it requires a mechanical/acoustic target recording and fidelity evaluation before it can be called a pen-on-paper emulation.

### Wu, Li, and Yao, 2009 — scale-free brain-wave music

Dan Wu, Chao-Yi Li, and De-Zhong Yao. “Scale-Free Music of the Brain.” *PLOS ONE* 4(6): e5915. DOI: [10.1371/journal.pone.0005915](https://doi.org/10.1371/journal.pone.0005915). PMID: [19526057](https://pubmed.ncbi.nlm.nih.gov/19526057/). PMCID: PMC2691588.

The method assigns each individual EEG wave one note. Peak-to-peak amplitude, measured with a zero-crossing method, maps to pitch through the paper's nonlinear power-law derivation; wave period maps directly to note duration; change in average power maps logarithmically to intensity; and timbre is fixed (piano in the reported work). The authors used a 0.5–40 Hz band-pass, Cz, and 250 Hz data for the sleep example. Their pitch range was MIDI 24–108 under a reported parameter choice.

The evaluation involved 60 healthy students and 25 randomized 30-second pieces (10 REM, 10 slow-wave sleep, 5 white-noise-derived), after exposure to REM and SWS examples. Reported mean identification accuracy was 86.8% (kappa 0.800, p<0.001). This tests discrimination of those constructed stimuli and states, not seizure detection and not arbitrary implementations. The epileptic example was interictal, apparently from one adult, and was not reported as a controlled seizure-classification experiment.

The HTML text exposes the verbal rules and constants but renders several equations as images. The full article was accessible; the exact symbolic equations were not reliably recoverable from the text interface used for this audit. Any faithful implementation must transcribe and independently check equations 1 and 8–9 from the typeset article.

### Loui et al., 2014 — trained discrimination of sonified seizure EEG

Psyche Loui, Matan Koplin-Green, Mark Frick, and Michael Massone. “Rapidly Learned Identification of Epileptic Seizures from Sonified EEG.” *Frontiers in Human Neuroscience* 8:820. DOI: [10.3389/fnhum.2014.00820](https://doi.org/10.3389/fnhum.2014.00820). PMID: [25352802](https://pubmed.ncbi.nlm.nih.gov/25352802/). PMCID: PMC4195310.

The authors selected 10-second Fz-Cz epochs from the pediatric CHB-MIT database. Seizure excerpts began 10 seconds into seizures lasting at least 20 seconds; matched non-seizure epochs avoided obvious movement artifact and pre-ictal activity. The 256 Hz series was polled every twentieth point (12.8 values/s), linearly scaled to 1–40, snapped to C-major-pentatonic scale degrees through 40, assigned randomized MIDI velocities 85–127, and rendered through Native Instruments Massive's “Old and Far Away” patch (three low-pass-filtered sine/saw oscillators with fast attack/release).

Forty-three usable naive listeners completed 26 pre-training trials, six labeled training trials (three seizure, three baseline), and 26 novel post-training trials. Mean accuracy rose from 53.1% to 63.4%; post-training d-prime was 0.751. The authors themselves state that this accuracy is insufficient for successful application. Limits include one channel, selected artifact-free 10-second clips, pediatric refractory epilepsy, offline preparation, loss/exclusion of nine participants, randomized velocities, and no external or prospective clinical validation.

This paper is the best bounded candidate for a faithful “study reproduction” mode because its mapping is described concretely. Reproduction must keep its dataset/epoch rules and listener task separate from general product use.

### Hobbs et al., 2018 — bedside proprietary sonification

Kyle Hobbs et al. “Rapid Bedside Evaluation of Seizures in the ICU by Listening to the Sound of Brainwaves: A Prospective Observational Clinical Trial of Ceribell's Brain Stethoscope Function.” *Neurocritical Care* 29(2):302–312. DOI: [10.1007/s12028-018-0543-7](https://doi.org/10.1007/s12028-018-0543-7). PMID: [29923167](https://pubmed.ncbi.nlm.nih.gov/29923167/).

Thirty-five ICU sonification cases were studied. Treating clinicians listened to 30 seconds from each hemisphere and revised seizure suspicion and treatment decisions; three blinded epileptologists later read EEG. Only one patient seized during the sonification window and another had rhythmic activity followed by seizure. Treatment decisions changed in about 40%, with a reported net reduction in unnecessary additional treatment. The algorithm is proprietary and the sparse seizure count prevents treating this as mapping validation or a diagnostic-accuracy benchmark.

### Shum et al., 2020 — patient-room audio, not EEG sonification

Jennifer Shum et al. “Sounds of seizures.” *Seizure* 78 (2020):86–90. DOI: [10.1016/j.seizure.2020.03.008](https://doi.org/10.1016/j.seizure.2020.03.008). PMID: [32276233](https://pubmed.ncbi.nlm.nih.gov/32276233/). PMCID: PMC7269794.

Five epileptologists rated 166 thirty-second room-audio clips from 83 epilepsy-monitoring patients (one seizure and one control clip per patient). Consensus PPV was 0.91 and NPV 0.66; performance was strongest for hyperkinetic and tonic-clonic seizures and poor for automatisms-only and non-motor seizures. This evaluates naturally produced patient/environment sound, not sound synthesized from EEG. It must not be cited as evidence for an EEG mapping.

## Release gate recommendation

Keep all research-linked modes behind an explicit **experimental sonification** label until each named mode has a versioned mapping specification and automated fidelity fixtures. The minimum gate for a literature name in the UI is:

1. Pin the exact input montage, units, preprocessing, segmentation, normalization, parameter equations, synthesis, and timing in a versioned spec.
2. Build deterministic fixtures from openly licensed or locally generated inputs and assert intermediate events (not only final audio): selected sample indices, wave boundaries, pitch, duration, intensity, and channel routing.
3. Have an independent reviewer compare code and fixtures against the primary method. Record deviations as deviations, not refinements.
4. Run a preregistered, held-out human study before making perceptual or clinical-performance claims. Report sensitivity, specificity, false alarms, uncertainty intervals, participant training, and excluded data.
5. Preserve the present non-diagnostic language. Do not display seizure likelihood, “normal/abnormal,” or alerts without a separately validated detection pathway.

Until that gate passes, safe UI wording is: “Experimental mappings for listening and teaching. Literature links describe related methods; these modes have not been shown to reproduce study results or detect seizures.”

## Implemented faithful bounded mapping

`loui-2014-fz-cz-v1@1.0.0` implements Loui-2014 as a locked,
single-channel **study reproduction** preset rather than the default reader:

* accept Fz-Cz at 256 Hz or resample explicitly to 256 Hz;
* for a selected 10-second epoch, take samples 0, 20, 40, … (128 events total);
* compute the epoch-level linear minimum/maximum map to the paper's 1–40 values; document behavior for a flat epoch;
* round/snap each value to the nearest member of C-major-pentatonic semitone offsets `[0,2,4,7,9,12,...,40]`, with a documented tie rule;
* emit one note per event at 12.8 notes/s, no time compression, and use deterministic velocity for fidelity testing (the paper randomized 85–127; seeded randomization can reproduce that stated range);
* substitute a neutral sine for the unavailable proprietary preset and label the acoustic deviation; Hybrid adds a separately versioned soft harmonic after mapping;
* expose an event log and downloadable mapping manifest so every exported note is traceable to source time, voltage, scaled value, MIDI degree, and velocity.

This reproduces the paper's disclosed symbolic mapping under the documented tie,
base-MIDI, flat-epoch, resampling, and deterministic-velocity choices. It does
not reproduce the proprietary preset exactly, establish the reported listener
accuracy, or validate use on other montages, ages, pathologies, epochs, or
sample rates.

## Claim policy

Use “implements” only after the fidelity gate. Use “inspired by” when a documented concept is adapted. Use “related literature” when the relationship is thematic. Never convert a paper's future-facing language (“potential,” “may”) into a product capability.
