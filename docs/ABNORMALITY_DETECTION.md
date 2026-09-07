# Local EEG finding assistance

Auris provides a modular, entirely local pipeline for generating candidate EEG
findings for expert review. It is review assistance, not autonomous diagnosis.
Every result requires interpretation by a qualified EEG reader. This
implementation has not been clinically validated for Auris's intended
population, browsers, acquisition systems, channel configurations, or use
environment.

## Supported finding families

The deterministic screening adapter can generate auditable candidates for
focal or generalized slowing, hemispheric asymmetry, suppression or
attenuation, flat or disconnected electrodes, high-amplitude movement, eye
movement, muscle contamination, line noise, and clipping or saturation. These
outputs are explicitly classified as `deterministic-screening`; their
confidence values are screening scores, not calibrated clinical probabilities.

Optional model adapters describe local integration contracts for SpikeNet2
interictal epileptiform discharge candidates and SPaRCNet probabilities for
seizure, LPD, GPD, LRDA, GRDA, and Other.

The model adapters do not contain models or substitute synthetic, random, or
heuristic predictions when a model is absent. Until compatible user-supplied
weights and a local execution backend are configured, the UI reports **model
not installed** and manual EEG review remains fully available.

## Architecture and data separation

The pipeline keeps six concepts separate:

1. The EDF/EDF+ reader's calibrated source samples.
2. Canonical electrode signals with source-label, unit, sample-rate, reference,
   and reversibility metadata.
3. Versioned, adapter-specific model inputs and windows.
4. The user-selected display montage, filters, polarity, sensitivity, and page
   duration.
5. Machine findings with detector and preprocessing provenance.
6. Human and imported annotations, including explicit review decisions.

Interactive LFF, HFF, notch, sensitivity, polarity, timebase, and montage
controls do not become detector inputs. Short transient, longer rhythmic, and
background/context detectors own their own declared windowing and
preprocessing. Work is dispatched outside the waveform rendering path, is
cancellable, and is identified by a recording/run key so stale results cannot
be applied to a newly opened file.

Result caching is keyed by recording identity, detector/model version,
preprocessing version, and input interval. Display-only changes therefore do
not rerun inference. A montage change remaps existing electrode evidence to
visible derivations; it does not change the underlying prediction.

## Models and user-supplied weights

Model files are imported or configured locally by the user. Auris validates a
manifest containing the adapter identifier, model version, preprocessing
version, expected channels, window definition, and local backend before an
adapter can run. Model bytes stay in the browser session and are never fetched
by Auris. Compatible local backends can be added behind the typed adapter
interface; no external inference API is used.

Host integrations create a `SpikeNet2Adapter` or `SparcnetAdapter` with the
authorized local artifact/backend and register it through
`registerLocalDetector`. The adapter API accepts `File`, `Blob`, or
`ArrayBuffer` artifacts rather than URLs. Because the upstream projects do not
publish one interchangeable browser model format, Auris does not pretend that
an arbitrary checkpoint can be opened without a compatible local loader.

SpikeNet2's official code is published separately under noncommercial terms,
and its checkpoints require credentialed BDSP access. Auris does not bundle,
download, or redistribute its code, data, or weights. Obtain authorized access
from the [SpikeNet2 project](https://bdsp.io/content/spikenet2/1.0/), then
configure a compatible local model package. See the
[paper (PMID 40689158)](https://pubmed.ncbi.nlm.nih.gov/40689158/) and
[official implementation](https://github.com/bdsp-core/SpikeNet2).

SPaRCNet is also an adapter contract rather than bundled inference. Review its
[paper (PMID 36878708)](https://pubmed.ncbi.nlm.nih.gov/36878708/),
[official implementation](https://github.com/bdsp-core/IIIC-SPaRCNet), and
[BDSP dataset terms](https://bdsp.io/content/bdsp-sparcnet/1.1/) before supplying
an authorized compatible model. Its class distribution is preserved, including
uncertainty. SPaRCNet class output is not represented as exact electrode-level
onset localization; any spatial assignment must come from a separate,
explicitly identified input-evidence stage.

The repository does not integrate SCORE-AI inference or weights. SCORE-AI is
listed only as a scientific benchmark; see its
[publication (PMID 37338864)](https://pubmed.ncbi.nlm.nih.gov/37338864/).

## Channels, montages, and localization

The canonical input layer recognizes conventional 10-20 labels and common
legacy/modern temporal aliases (T3/T7, T4/T8, T5/P7, and T6/P8). Each channel
retains its original label, source index, source unit, normalized microvolt
unit, sample rate, and reference/derivation description. Mixed-rate channels
remain explicit; adapters must reject or deliberately resample them according
to declared preprocessing rather than assuming a common rate.

Missing required channels are reported to the adapter and finding limitations.
The pipeline exposes referential electrode signals only when the recording
provides recoverable electrode channels. It does not pretend to reconstruct
electrode potentials from irreversible bipolar-only recordings.

A bipolar derivation identifies a voltage difference, not a unique generating
electrode. Findings therefore prefer referential electrode evidence, retain
polarity and surrounding spatial-field information, and map that evidence to
the current visible montage. With bipolar-only input, results name implicated
derivations and candidate endpoint electrodes and record localization
ambiguity. Neural-network attention alone is never treated as proof of
localization.

## Finding provenance and review

Every machine finding carries an exact start/end interval, finding type,
confidence or score, candidate electrodes, electrode probabilities when the
adapter provides them, displayed derivations, distribution, laterality,
artifact probability, detector name/version/classification, preprocessing
version, provenance, review status, and limitations. Findings remain visually
and structurally separate from clinician annotations. They can be accepted,
rejected, edited, or converted to a user annotation without silently changing
the original machine result.

The classifications mean:

- `validated-model`: output from the named configured model, reflecting only
  the validation described by that model's authors—not validation of Auris or
  the current patient population.
- `experimental`: a model or localization stage without sufficient validation
  for the current integration or intended use.
- `deterministic-screening`: reproducible signal measurements and thresholds,
  not a learned or clinically validated diagnostic model.

## Privacy

EDF samples, model inputs, filenames, patient identifiers, findings, and human
annotations remain in the local browser session. The detection feature adds no
upload, server persistence, telemetry, or analytics path. Export happens only
through an explicit user action. Users should still follow local data-handling
policy because browser memory, downloaded exports, and the source EDF may
contain protected health information.

## Scientific and licensing references

Relevant public research resources include the
[TUH EEG Corpus (PMID 27242402)](https://pubmed.ncbi.nlm.nih.gov/27242402/),
[TUH download portal](https://isip.piconepress.com/projects/nedc/html/tuh_eeg/),
and [TUH Seizure Corpus (PMID 30487743)](https://pubmed.ncbi.nlm.nih.gov/30487743/).
Their presence here is attribution and implementation context, not a claim
that the datasets, trained weights, or their licenses are bundled with Auris.
Users are responsible for obtaining authorized data/model access and complying
with all licenses and data-use agreements.
