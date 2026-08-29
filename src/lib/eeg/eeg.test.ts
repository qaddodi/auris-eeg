import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aliasKeys,
  canonicalElectrode,
  classifyChannelKind,
  classifyLaterality,
  describeChannel,
} from "./channels.ts";
import {
  applyDerivation,
  buildDoubleBanana,
  buildOriginalMontage,
  montageDerivations,
} from "./montages.ts";
import { listChannels, parseEdfHeader, readRecords } from "./edf.ts";
import {
  amplitudeModulate,
  describeMapping,
  expectedAudioHz,
  mixSonify,
  timeCompress,
} from "./sonify.ts";
import { applyFilters, fadeEdges, hasNan, peakAbs, robustNormalize, softLimit } from "./preprocessing.ts";
import { averageChannels, equalPowerGains } from "./stereo.ts";
import {
  buildSyntheticEdf,
  burstSuppression,
  chirp,
  electrodePop,
  goertzel,
  muscleNoise,
  sine,
  spikeAndWave,
} from "./synthetic.ts";
import { clampView, envelopeWindow, fitSensitivityUv, followViewStart, interpWindow, samplesPerPixel, zoomView } from "./view.ts";
import {
  clampSensitivity,
  DEFAULT_SENSITIVITY_UV,
  snapSensitivity,
  stepSensitivity,
  voltagePxPerUv,
} from "./defaults.ts";
import { choirVoice, eegHzToScaleHz, ekgVoice, scaleVoice } from "./musify.ts";
import { voltageToMidi, renderContour, waveAbnormality } from "./contour.ts";
import { detectMorphologies, detectTransients } from "./patterns.ts";
import { mixdownTracks } from "./audio.ts";
import {
  BAND_COLORS,
  bandFromHz,
  bandPowersFromColumn,
  buildDsa,
  colorForHz,
  dsaColumn,
  fftPower,
  freqWindow,
} from "./spectrum.ts";

const settings = {
  mode: "direct" as const,
  compression: 50,
  carrierHz: 440,
  depth: 0.7,
  amTimeScale: 1,
  timeScale: 4,
  outputRate: 8000,
  hybridMix: 0.4,
  brightness: 0,
  percentile: 0.995,
  scale: "pentatonic" as const,
  rootMidi: 48,
  rangeSemitones: 8,
  quantize: true,
  volume: 1.45,
};

describe("channel normalization", () => {
  it("strips EEG prefixes and references", () => {
    assert.equal(canonicalElectrode("EEG Fp1-REF"), "Fp1");
    assert.equal(canonicalElectrode("FP1"), "Fp1");
    assert.equal(canonicalElectrode("Fp1"), "Fp1");
    assert.equal(canonicalElectrode("EEG FP1-LE"), "Fp1");
    assert.equal(canonicalElectrode("EEG T3"), "T7");
    assert.equal(canonicalElectrode("T7"), "T7");
    assert.equal(canonicalElectrode("EEG T5-REF"), "P7");
    assert.equal(canonicalElectrode("T6"), "P8");
    assert.equal(canonicalElectrode("FZ"), "Fz");
  });

  it("aliases legacy and modern temporal names", () => {
    assert.ok(aliasKeys("T3").includes("T7"));
    assert.ok(aliasKeys("T7").includes("T3"));
    assert.ok(aliasKeys("T5").includes("P7"));
    assert.ok(aliasKeys("P8").includes("T6"));
  });

  it("classifies laterality", () => {
    assert.equal(classifyLaterality("Fp1"), "left");
    assert.equal(classifyLaterality("EEG F4-REF"), "right");
    assert.equal(classifyLaterality("Cz"), "midline");
    assert.equal(classifyLaterality("T3"), "left");
    assert.equal(classifyLaterality("T4"), "right");
  });
});

describe("montage engine", () => {
  const channels = [
    "Fp1",
    "Fp2",
    "F7",
    "F8",
    "T3",
    "T4",
    "T5",
    "T6",
    "O1",
    "O2",
    "F3",
    "F4",
    "C3",
    "C4",
    "P3",
    "P4",
    "Fz",
    "Cz",
    "Pz",
  ].map((l, i) => describeChannel(i, `EEG ${l}`, "uV", 200));

  it("builds a complete double banana when electrodes exist", () => {
    const d = buildDoubleBanana(channels);
    assert.equal(d.length, 18);
    assert.ok(d.every((x) => x.available));
    const t3t5 = d.find((x) => x.label === "T3–T5");
    assert.ok(t3t5);
    assert.equal(t3t5!.laterality, "left");
  });

  it("forms banana pairs from modern T7/T8 labels", () => {
    const modern = [
      "Fp1",
      "F7",
      "T7",
      "P7",
      "O1",
      "Fp2",
      "F8",
      "T8",
      "P8",
      "O2",
      "F3",
      "C3",
      "P3",
      "F4",
      "C4",
      "P4",
      "Fz",
      "Cz",
      "Pz",
    ].map((l, i) => describeChannel(i, l, "uV", 200));
    const d = buildDoubleBanana(modern);
    assert.ok(d.filter((x) => x.available).length >= 16);
  });

  it("reports missing electrodes instead of inventing them", () => {
    const sparse = ["Fp1", "O1"].map((l, i) => describeChannel(i, l, "uV", 200));
    const d = buildDoubleBanana(sparse);
    const missing = d.filter((x) => !x.available);
    assert.ok(missing.length > 0);
    assert.ok(missing[0]!.missing.length > 0);
  });

  it("subtracts bipolar pairs", () => {
    const a = new Float32Array([10, 20, 30]);
    const b = new Float32Array([1, 2, 3]);
    const out = applyDerivation([a, b], {
      id: "x",
      label: "A–B",
      sources: [0, 1],
      laterality: "left",
      kind: "eeg",
      sampleRate: 200,
      available: true,
      missing: [],
    });
    assert.deepEqual([...out], [9, 18, 27]);
  });

  it("original montage keeps referential EEG channels", () => {
    const orig = buildOriginalMontage(channels);
    assert.equal(orig.length, channels.length);
    assert.equal(orig[0]!.sources.length, 1);
  });
});

describe("EDF parser", () => {
  it("reads a synthetic EDF+ header and records", () => {
    const buf = buildSyntheticEdf({
      duration: 1,
      left: sine(10, 200, 1, 50),
      right: sine(10, 200, 1, 10),
    });
    const header = parseEdfHeader(buf);
    assert.equal(header.isEdfPlus, true);
    assert.equal(header.identifierWarning, false);
    assert.ok(Math.abs(header.duration - 1) < 1e-6);
    assert.equal(listChannels(header).length, 5);
    const rec = readRecords(buf, header, 0, 1);
    assert.equal(rec.samples[0]!.length, 200);
    const mean = rec.samples[0]!.reduce((a, b) => a + b, 0) / rec.samples[0]!.length;
    assert.ok(Math.abs(mean) < 5);
    const ptp = Math.max(...rec.samples[0]!) - Math.min(...rec.samples[0]!);
    assert.ok(ptp > 80 && ptp < 120);
  });

  it("rejects truncated files", () => {
    assert.throws(() => parseEdfHeader(new ArrayBuffer(20)));
  });
});

describe("sonification", () => {
  it("maps time-compression duration and 10 Hz → 1 kHz at 100×", () => {
    const fs = 200;
    const eeg = sine(10, fs, 2, 1);
    const audio = timeCompress(eeg, fs, 100, 44100);
    const dur = audio.length / 44100;
    assert.ok(Math.abs(dur - 0.02) < 0.002, `duration ${dur}`);
    const mag1k = goertzel(audio, 44100, 1000);
    const mag200 = goertzel(audio, 44100, 200);
    assert.ok(mag1k > mag200 * 3, `1k=${mag1k} 200=${mag200}`);
    assert.equal(expectedAudioHz(10, 100), 1000);
    assert.match(describeMapping(100), /1\.00 kHz/);
  });

  it("keeps AM finite after robust normalize", () => {
    const eeg = sine(3, 200, 1, 1);
    const audio = amplitudeModulate(robustNormalize(eeg), 200, 8000, 440, 0.8, 1);
    assert.equal(hasNan(audio), false);
    assert.ok(peakAbs(audio) <= 1.0001);
  });

  it("assigns left-only activity to the left channel", () => {
    const left = sine(10, 200, 1, 1);
    const right = new Float32Array(left.length);
    const mix = mixSonify(
      [
        { id: "L", label: "Fp1", samples: left, sampleRate: 200, laterality: "left", kind: "eeg", gain: 1, audible: true },
        { id: "R", label: "Fp2", samples: right, sampleRate: 200, laterality: "right", kind: "eeg", gain: 1, audible: true },
      ],
      settings,
      "per-track",
    );
    const lRms = Math.sqrt(mix.left.reduce((a, b) => a + b * b, 0) / mix.left.length);
    const rRms = Math.sqrt(mix.right.reduce((a, b) => a + b * b, 0) / mix.right.length);
    assert.ok(lRms > rRms * 4, `L ${lRms} R ${rRms}`);
    assert.equal(mix.clipped, false);
    assert.equal(hasNan(mix.left), false);
  });

  it("right-only activity reaches the right channel", () => {
    const right = sine(10, 200, 1, 1);
    const left = new Float32Array(right.length);
    const mix = mixSonify(
      [
        { id: "L", label: "Fp1", samples: left, sampleRate: 200, laterality: "left", kind: "eeg", gain: 1, audible: true },
        { id: "R", label: "Fp2", samples: right, sampleRate: 200, laterality: "right", kind: "eeg", gain: 1, audible: true },
      ],
      settings,
      "per-track",
    );
    const lRms = Math.sqrt(mix.left.reduce((a, b) => a + b * b, 0) / mix.left.length);
    const rRms = Math.sqrt(mix.right.reduce((a, b) => a + b * b, 0) / mix.right.length);
    assert.ok(rRms > lRms * 4);
  });

  it("respects mute via audible flag", () => {
    const s = sine(10, 200, 0.5, 1);
    const mix = mixSonify(
      [{ id: "L", label: "Fp1", samples: s, sampleRate: 200, laterality: "left", kind: "eeg", gain: 1, audible: false }],
      { ...settings, compression: 20 },
      "per-track",
    );
    assert.equal(mix.duration, 0);
  });

  it("soft-limits without NaNs and fades edges", () => {
    const x = new Float32Array(1000);
    x[10] = 50;
    const y = fadeEdges(softLimit(x), 200, 20);
    assert.equal(hasNan(y), false);
    assert.ok(Math.abs(y[0]!) < 1e-6);
    assert.ok(peakAbs(y) <= 1.0001);
  });
});

describe("synthetic morphologies stay structured after compression", () => {
  const s = { ...settings, compression: 40, outputRate: 16000 };

  function mixOne(samples: Float32Array) {
    return mixSonify(
      [{ id: "c", label: "Cz", samples, sampleRate: 200, laterality: "midline", kind: "eeg", gain: 1, audible: true }],
      s,
      "per-track",
    );
  }

  it("alpha remains tonal", () => {
    const mix = mixOne(sine(10, 200, 2, 1));
    assert.ok(peakAbs(mix.left) > 0.1);
    assert.equal(hasNan(mix.left), false);
  });

  it("spike-and-wave-like 3 Hz stays periodic", () => {
    const mix = mixOne(spikeAndWave(200, 2));
    assert.ok(peakAbs(mix.left) > 0.1);
  });

  it("burst suppression has quiet gaps", () => {
    const mix = mixOne(burstSuppression(200, 4));
    const hop = Math.floor(mix.left.length / 20);
    let quiet = 0;
    for (let i = 0; i < mix.left.length; i += hop) {
      let e = 0;
      for (let j = 0; j < hop && i + j < mix.left.length; j++) e += mix.left[i + j]! ** 2;
      if (e / hop < 0.01) quiet++;
    }
    assert.ok(quiet >= 1, `quiet frames ${quiet}`);
  });

  it("chirp, muscle, and pops stay finite", () => {
    for (const sig of [chirp(200, 1), muscleNoise(200, 1), electrodePop(200, 1)]) {
      const mix = mixOne(sig);
      assert.equal(hasNan(mix.left), false);
      assert.equal(mix.clipped, false);
    }
  });
});

describe("filters", () => {
  it("optional bandpass/notch do not introduce NaNs", () => {
    const x = sine(10, 200, 1, 1);
    const y = applyFilters(x, 200, {
      bandpass: true,
      bandpassLow: 0.5,
      bandpassHigh: 70,
      lff: 0,
      hff: 0,
      notch60: true,
      removeDc: true,
    });
    assert.equal(hasNan(y), false);
    assert.equal(y.length, x.length);
  });
});

describe("stereo math", () => {
  it("center pan is equal power", () => {
    const { l, r } = equalPowerGains(0);
    assert.ok(Math.abs(l - r) < 1e-9);
    assert.ok(Math.abs(l * l + r * r - 1) < 1e-9);
  });

  it("averages selected channels", () => {
    const avg = averageChannels([new Float32Array([0, 2]), new Float32Array([2, 4])]);
    assert.deepEqual([...avg], [1, 3]);
  });
});

describe("editor view", () => {
  it("clamps zoom so the window stays inside the recording", () => {
    const v = clampView(90, 20, 100);
    assert.equal(v.duration, 20);
    assert.equal(v.start, 80);
    const all = clampView(0, 999, 50);
    assert.equal(all.duration, 50);
    assert.equal(all.start, 0);
  });

  it("zooms around an anchor without losing it", () => {
    const z = zoomView(0, 10, 100, 0.5, 5);
    assert.ok(Math.abs(z.duration - 5) < 1e-9);
    assert.ok(z.start <= 5 && z.start + z.duration >= 5);
  });

  it("follow keeps the playhead inside the window", () => {
    const start = followViewStart(40, 10, 100, 0.3);
    assert.ok(40 >= start && 40 <= start + 10);
    assert.equal(followViewStart(0, 10, 100, 0.3), 0);
    assert.equal(followViewStart(99, 10, 100, 0.3), 90);
  });

  it("envelope covers the requested window", () => {
    const x = sine(10, 200, 1, 50);
    const { min, max } = envelopeWindow(x, 200, 0, 1, 20);
    assert.equal(min.length, 20);
    assert.ok(Math.max(...max) > 40);
    assert.ok(Math.min(...min) < -40);
  });

  it("interpolated zoom keeps the sine amplitude", () => {
    const x = sine(10, 256, 1, 50);
    assert.ok(samplesPerPixel(256, 0, 0.5, 1000) < 1);
    const y = interpWindow(x, 256, 0, 0.5, 400);
    const peak = Math.max(...y.map(Math.abs));
    assert.ok(peak > 40 && peak < 55, `peak ${peak}`);
    const { min, max } = envelopeWindow(x, 256, 0, 0.5, 400);
    let same = 0;
    for (let i = 0; i < min.length; i++) if (Math.abs(max[i]! - min[i]!) < 1e-6) same++;
    assert.ok(same > min.length * 0.8, "zoomed-in envelope is degenerate");
  });

  it("sensitivity steps and snaps like a gain control", () => {
    assert.equal(stepSensitivity(70, -1), 50);
    assert.equal(stepSensitivity(70, 1), 100);
    assert.equal(stepSensitivity(15, -1), 15);
    assert.equal(snapSensitivity(68), 70);
    assert.equal(clampSensitivity(3), 10);
    assert.ok(voltagePxPerUv(40, 70) > voltagePxPerUv(40, 150));
    assert.equal(DEFAULT_SENSITIVITY_UV, 70);
  });

  it("fit sensitivity grows when the tracing is small", () => {
    const fs = 200;
    const quiet = sine(10, fs, 1, 8);
    const loud = sine(10, fs, 1, 80);
    const q = fitSensitivityUv([{ samples: quiet, sampleRate: fs, kind: "eeg" }], 0, 1);
    const l = fitSensitivityUv([{ samples: loud, sampleRate: fs, kind: "eeg" }], 0, 1);
    assert.ok(q < l, `quiet ${q} loud ${l}`);
    assert.ok(q <= 50, `quiet fit ${q}`);
    assert.ok(l >= 150, `loud fit ${l}`);
  });
});

describe("mixdown mute/solo", () => {
  it("muted tracks stay silent without shrinking duration", () => {
    const s = sine(10, 8000, 0.1, 0.5);
    const mix = mixdownTracks(
      [
        {
          id: "L",
          samples: s,
          sampleRate: 8000,
          pan: -1,
          gain: 1,
          mute: true,
          solo: false,
        },
      ],
      0.1,
      1,
    );
    assert.ok(mix.duration > 0);
    assert.ok(peakAbs(mix.left) < 1e-6);
  });
});

describe("polygraphy channel kinds", () => {
  it("labels EKG, lids, and 10-20 correctly", () => {
    assert.equal(classifyChannelKind("EEG X1", "uV"), "ekg");
    assert.equal(classifyChannelKind("EEG X2", "uV"), "ekg");
    assert.equal(classifyChannelKind("ECG", "uV"), "ekg");
    assert.equal(classifyChannelKind("EEG PG1", "uV"), "eog");
    assert.equal(classifyChannelKind("EEG PG2", "uV"), "eog");
    assert.equal(classifyChannelKind("EOG LOC", "uV"), "eog");
    assert.equal(classifyChannelKind("EEG Fp1", "uV"), "eeg");
    assert.equal(classifyChannelKind("DC01", "mV"), "dc");
    assert.equal(classifyChannelKind("EEG X5", "uV"), "extra");
  });

  it("appends EKG and lid tracks to a banana montage", () => {
    const ch = [
      ...["Fp1", "F7", "T3", "T5", "O1", "Fp2", "F8", "T4", "T6", "O2"].map((l, i) =>
        describeChannel(i, `EEG ${l}`, "uV", 200),
      ),
      describeChannel(20, "EEG PG1", "uV", 200),
      describeChannel(21, "EEG PG2", "uV", 200),
      describeChannel(22, "EEG X1", "uV", 200),
      describeChannel(23, "EEG X2", "uV", 200),
    ];
    const d = montageDerivations("double-banana", ch);
    assert.ok(d.some((x) => x.kind === "ekg" && x.label === "EKG" && x.available));
    assert.ok(d.some((x) => x.kind === "eog" && x.label === "Lid L"));
    assert.ok(d.some((x) => x.kind === "eog" && x.label === "Lid R"));
    assert.ok(d.filter((x) => x.kind === "eeg").length >= 8);
  });
});

describe("musical sonify", () => {
  const musical = { ...settings, mode: "choir" as const, timeScale: 4, outputRate: 8000 };

  it("choir duration follows the time scale", () => {
    const eeg = sine(3, 200, 2, 1);
    const audio = choirVoice(eeg, 200, musical);
    assert.ok(Math.abs(audio.length / 8000 - 0.5) < 0.06);
    assert.equal(hasNan(audio), false);
    assert.ok(peakAbs(audio) > 0.05);
    assert.ok(peakAbs(audio) <= 1.0001);
  });

  it("scale duration follows the time scale and stays finite", () => {
    const eeg = sine(10, 200, 1, 1);
    const audio = scaleVoice(eeg, 200, musical);
    assert.ok(Math.abs(audio.length / 8000 - 0.25) < 0.06);
    assert.equal(hasNan(audio), false);
  });

  it("maps 10 Hz alpha onto a mid-register scale tone", () => {
    const hz = eegHzToScaleHz(10, 48, "pentatonic");
    assert.ok(hz > 120 && hz < 400, `got ${hz}`);
  });

  it("maps 3 Hz below 10 Hz on the scale", () => {
    const lo = eegHzToScaleHz(3, 48, "pentatonic");
    const hi = eegHzToScaleHz(10, 48, "pentatonic");
    assert.ok(lo < hi);
  });

  it("EKG voice is not silent on a pulse train", () => {
    const eeg = spikeAndWave(200, 2);
    const audio = ekgVoice(eeg, 200, musical);
    assert.equal(hasNan(audio), false);
    assert.ok(peakAbs(audio) > 0.02);
  });
});

describe("contour polarity", () => {
  it("maps graph-up to a higher pitch than graph-down when Neg-up is on", () => {
    const up = voltageToMidi(1, 48, 8, true, null);
    const down = voltageToMidi(-1, 48, 8, true, null);
    assert.ok(up > down, `up ${up} should be above down ${down}`);
  });

  it("flips with Neg-up off so the visible direction still owns pitch", () => {
    const up = voltageToMidi(-1, 48, 8, false, null);
    const down = voltageToMidi(1, 48, 8, false, null);
    assert.ok(up > down, `up ${up} should be above down ${down}`);
  });

  it("labels spike vs slow vs ordinary field", () => {
    assert.equal(waveAbnormality(0.7, 0.4, 0.2), "spike");
    assert.equal(waveAbnormality(0.5, 0.03, 0.45), "slow");
    assert.equal(waveAbnormality(0.15, 0.25, 0.1), "grit");
    assert.equal(waveAbnormality(0.2, 0.05, 0.15), "ok");
  });
});

describe("spectrum", () => {
  it("colors clinical bands", () => {
    assert.equal(bandFromHz(2), "delta");
    assert.equal(bandFromHz(6), "theta");
    assert.equal(bandFromHz(10), "alpha");
    assert.equal(bandFromHz(20), "beta");
    assert.equal(bandFromHz(40), "gamma");
    assert.equal(colorForHz(10), BAND_COLORS.alpha);
  });

  it("zero-crossing window on a 10 Hz sine is near 10 Hz", () => {
    const fs = 200;
    const x = sine(10, fs, 2, 40);
    const hz = freqWindow(x, fs, 0.2, 1.8, 16);
    const mean = [...hz].reduce((a, b) => a + b, 0) / hz.length;
    assert.ok(mean > 8 && mean < 12, `got ${mean}`);
  });

  it("FFT of a 10 Hz sine peaks near 10 Hz", () => {
    const fs = 256;
    const n = 256 * 8;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * 10 * i) / fs);
    const mag = fftPower(x.subarray(0, 256));
    let peak = 0;
    let peakI = 0;
    for (let i = 1; i < mag.length; i++) {
      if (mag[i]! > peak) {
        peak = mag[i]!;
        peakI = i;
      }
    }
    const peakHz = (peakI * fs) / 256;
    assert.ok(Math.abs(peakHz - 10) < 1.5, `peak ${peakHz}`);
  });

  it("DSA of a 10 Hz left-hemisphere sine is alpha-dominant", () => {
    const fs = 256;
    const n = fs * 4;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * 10 * i) / fs);
    const tracks = [
      {
        id: "L",
        label: "C3",
        laterality: "left" as const,
        kind: "eeg" as const,
        samples: x,
        sampleRate: fs,
      },
    ];
    const frame = buildDsa(tracks, n / fs);
    assert.ok(frame);
    assert.ok(frame!.nTime >= 4);
    const col = dsaColumn(frame!, 2, "l");
    const p = bandPowersFromColumn(col, frame!.fMax);
    assert.ok(p.alpha > p.delta, `alpha ${p.alpha} delta ${p.delta} peak ${p.peakHz}`);
    assert.ok(p.peakHz > 7 && p.peakHz < 14, `peakHz ${p.peakHz}`);
  });
});

