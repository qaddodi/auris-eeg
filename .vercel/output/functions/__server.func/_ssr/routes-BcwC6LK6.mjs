import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Square, c as Play, d as Keyboard, f as Info, l as Pause, n as ZoomOut, o as Scan, p as Download, r as Upload, s as Repeat, t as ZoomIn, u as PanelLeft } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BcwC6LK6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function formatTime(seconds, withMs = false) {
	if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
	const m = Math.floor(seconds / 60);
	const s = seconds - m * 60;
	if (withMs) return `${m}:${s.toFixed(2).padStart(5, "0")}`;
	return `${m}:${String(Math.floor(s)).padStart(2, "0")}`;
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg hover:bg-accent/90",
			secondary: "bg-surface-2 text-fg shadow-border hover:bg-surface-2/80",
			ghost: "text-muted hover:bg-surface-2 hover:text-fg",
			outline: "text-fg shadow-border hover:bg-surface-2",
			danger: "bg-danger/15 text-danger hover:bg-danger/25"
		},
		size: {
			default: "h-10 rounded-md px-3.5 text-sm",
			sm: "h-8 rounded-sm px-2.5 text-xs",
			lg: "h-11 rounded-md px-4 text-sm",
			icon: "size-8 rounded-sm",
			iconSm: "size-7 rounded-sm"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
var DEFAULT_FILTERS = {
	bandpass: false,
	bandpassLow: .5,
	bandpassHigh: 70,
	lff: 0,
	hff: 0,
	notch60: false,
	removeDc: true
};
var DEFAULT_SONIFY = {
	mode: "contour",
	compression: 50,
	carrierHz: 180,
	depth: .72,
	amTimeScale: 4,
	timeScale: 2,
	outputRate: 44100,
	hybridMix: .35,
	brightness: 0,
	percentile: .995,
	scale: "pentatonic",
	rootMidi: 50,
	rangeSemitones: 8,
	quantize: true,
	volume: 1.45
};
var COMPRESSION_PRESETS = [
	20,
	50,
	100,
	200
];
var TIME_SCALE_PRESETS = [
	1,
	2,
	4
];
var PAGE_PRESETS = [
	10,
	15,
	30
];
var SENSITIVITY_PRESETS = [
	50,
	70,
	100,
	150,
	200,
	300
];
var LFF_PRESETS = [
	0,
	.5,
	1,
	1.6,
	5
];
var HFF_PRESETS = [
	0,
	15,
	35,
	70,
	100
];
var ROOT_NOTES = [
	{
		midi: 45,
		label: "A"
	},
	{
		midi: 47,
		label: "B"
	},
	{
		midi: 48,
		label: "C"
	},
	{
		midi: 50,
		label: "D"
	},
	{
		midi: 52,
		label: "E"
	},
	{
		midi: 53,
		label: "F"
	},
	{
		midi: 55,
		label: "G"
	}
];
var ANNOTATION_TYPES = [
	{
		id: "spike",
		label: "Spike"
	},
	{
		id: "sharp",
		label: "Sharp"
	},
	{
		id: "spike-wave",
		label: "Spike-and-wave"
	},
	{
		id: "polyspike",
		label: "Polyspike"
	},
	{
		id: "periodic",
		label: "Periodic (LPD/GPD)"
	},
	{
		id: "triphasic",
		label: "Triphasic"
	},
	{
		id: "slow",
		label: "Slow wave"
	},
	{
		id: "spindle",
		label: "Spindle"
	},
	{
		id: "alpha",
		label: "Alpha"
	},
	{
		id: "burst-suppression",
		label: "Burst-suppression"
	},
	{
		id: "blink",
		label: "Blink / lid"
	},
	{
		id: "qrs",
		label: "EKG"
	},
	{
		id: "muscle",
		label: "Muscle"
	},
	{
		id: "comment",
		label: "Comment"
	}
];
var MORPH_COLOR = {
	spike: "#e8a0a0",
	sharp: "#e0b070",
	slow: "#8bb8c8",
	"spike-wave": "#7ec8d9",
	polyspike: "#d98989",
	periodic: "#c4a0d9",
	"burst-suppression": "#9aa3ad",
	spindle: "#a0c4a8",
	alpha: "#7eaea0",
	triphasic: "#d4b06a",
	blink: "#c4b48a",
	qrs: "#e07a7a",
	muscle: "#b8a3d4",
	comment: "#c8ccd4"
};
function subtractMean(x) {
	if (x.length === 0) return x;
	let sum = 0;
	for (let i = 0; i < x.length; i++) sum += x[i];
	const mean = sum / x.length;
	const out = new Float32Array(x.length);
	for (let i = 0; i < x.length; i++) out[i] = x[i] - mean;
	return out;
}
/** Direct-form II transposed biquad. coefs: [b0,b1,b2,a1,a2] (a0=1). */
function biquad(x, c) {
	const [b0, b1, b2, a1, a2] = c;
	const y = new Float32Array(x.length);
	let z1 = 0;
	let z2 = 0;
	for (let i = 0; i < x.length; i++) {
		const xn = x[i];
		const yn = b0 * xn + z1;
		z1 = b1 * xn - a1 * yn + z2;
		z2 = b2 * xn - a2 * yn;
		y[i] = yn;
	}
	return y;
}
function reverse(x) {
	const y = new Float32Array(x.length);
	for (let i = 0; i < x.length; i++) y[i] = x[x.length - 1 - i];
	return y;
}
function filtfilt(x, c) {
	return reverse(biquad(reverse(biquad(x, c)), c));
}
function rbjLowpass(fs, f0, q = Math.SQRT1_2) {
	const w0 = 2 * Math.PI * f0 / fs;
	const alpha = Math.sin(w0) / (2 * q);
	const cos = Math.cos(w0);
	const b0 = (1 - cos) / 2;
	const b1 = 1 - cos;
	const b2 = (1 - cos) / 2;
	const a0 = 1 + alpha;
	const a1 = -2 * cos;
	const a2 = 1 - alpha;
	return [
		b0 / a0,
		b1 / a0,
		b2 / a0,
		a1 / a0,
		a2 / a0
	];
}
function rbjHighpass(fs, f0, q = Math.SQRT1_2) {
	const w0 = 2 * Math.PI * f0 / fs;
	const alpha = Math.sin(w0) / (2 * q);
	const cos = Math.cos(w0);
	const b0 = (1 + cos) / 2;
	const b1 = -(1 + cos);
	const b2 = (1 + cos) / 2;
	const a0 = 1 + alpha;
	const a1 = -2 * cos;
	const a2 = 1 - alpha;
	return [
		b0 / a0,
		b1 / a0,
		b2 / a0,
		a1 / a0,
		a2 / a0
	];
}
function rbjNotch(fs, f0, q = 30) {
	const w0 = 2 * Math.PI * f0 / fs;
	const alpha = Math.sin(w0) / (2 * q);
	const cos = Math.cos(w0);
	const b0 = 1;
	const b1 = -2 * cos;
	const b2 = 1;
	const a0 = 1 + alpha;
	const a1 = -2 * cos;
	const a2 = 1 - alpha;
	return [
		b0 / a0,
		b1 / a0,
		b2 / a0,
		a1 / a0,
		a2 / a0
	];
}
function applyFilters(x, fs, settings) {
	let y = settings.removeDc ? subtractMean(x) : new Float32Array(x);
	if (y.length < 8) return y;
	const nyquist = fs / 2 - 1;
	const lo = settings.lff > 0 ? settings.lff : settings.bandpass ? settings.bandpassLow : 0;
	const hi = settings.hff > 0 ? settings.hff : settings.bandpass ? settings.bandpassHigh : 0;
	if (lo > 0) {
		const f = Math.max(.01, Math.min(lo, nyquist * .8));
		y = filtfilt(y, rbjHighpass(fs, f));
	}
	if (hi > 0) {
		const f = Math.max((lo || .1) + 1, Math.min(hi, nyquist));
		y = filtfilt(y, rbjLowpass(fs, f));
	}
	if (settings.notch60 && fs > 130) y = filtfilt(y, rbjNotch(fs, 60));
	return y;
}
function percentileAbs(x, p) {
	if (x.length === 0) return 1;
	const abs = new Float64Array(x.length);
	for (let i = 0; i < x.length; i++) abs[i] = Math.abs(x[i]);
	abs.sort();
	const v = abs[Math.min(abs.length - 1, Math.max(0, Math.floor(p * (abs.length - 1))))];
	return v > 1e-12 ? v : 1;
}
function softLimit(x, drive = 1) {
	const y = new Float32Array(x.length);
	const k = Math.max(.1, drive);
	for (let i = 0; i < x.length; i++) y[i] = Math.tanh(x[i] * k);
	return y;
}
function fadeEdges(x, sampleRate, ms = 8) {
	const n = Math.min(x.length >> 1, Math.max(1, Math.round(ms / 1e3 * sampleRate)));
	const y = new Float32Array(x);
	for (let i = 0; i < n; i++) {
		const w = .5 - .5 * Math.cos(Math.PI * i / n);
		y[i] *= w;
		y[x.length - 1 - i] *= w;
	}
	return y;
}
function peakAbs(x) {
	let m = 0;
	for (let i = 0; i < x.length; i++) {
		const a = Math.abs(x[i]);
		if (a > m) m = a;
	}
	return m;
}
function hasNan(x) {
	for (let i = 0; i < x.length; i++) if (!Number.isFinite(x[i])) return true;
	return false;
}
var SCALE_DEGREES = {
	pentatonic: [
		0,
		3,
		5,
		7,
		10
	],
	dorian: [
		0,
		2,
		3,
		5,
		7,
		9,
		10
	],
	harmonic: [
		0,
		2,
		3,
		5,
		7,
		8,
		11
	],
	major: [
		0,
		2,
		4,
		5,
		7,
		9,
		11
	]
};
var SCALE_LABELS = {
	pentatonic: "Minor pentatonic",
	dorian: "Dorian",
	harmonic: "Harmonic minor",
	major: "Major"
};
function midiToHz(midi) {
	return 440 * 2 ** ((midi - 69) / 12);
}
function quantizeMidi(midi, degrees, rootMidi) {
	const rel = midi - rootMidi;
	const oct = Math.floor(rel / 12);
	const pc = rel - oct * 12;
	let best = degrees[0];
	let bestD = 99;
	for (const d of degrees) {
		const err = Math.abs(d - pc);
		const wrap = Math.abs(d + 12 - pc);
		if (err < bestD) {
			bestD = err;
			best = d;
		}
		if (wrap < bestD) {
			bestD = wrap;
			best = d;
		}
	}
	return rootMidi + oct * 12 + best;
}
function timeScaleFor(settings) {
	if (settings.mode === "direct") return settings.compression;
	return settings.timeScale;
}
var PREFIX = /^(eeg|eog|emg|ecg|ekg|pg|eog)\s+/i;
var SUFFIX = /(-ref|-le|-re|-avg|-ar|-a1|-a2|-m1|-m2|-cz|-linkedears|-linked-ears|-avr|-g2|-n\/a)*$/i;
/** Legacy 10-20 temporal names ↔ modern 10-10. */
var TEMPORAL_ALIASES = {
	T3: "T7",
	T4: "T8",
	T5: "P7",
	T6: "P8",
	T7: "T7",
	T8: "T8",
	P7: "P7",
	P8: "P8",
	T1: "FT9",
	T2: "FT10",
	FT9: "FT9",
	FT10: "FT10"
};
var LEGACY_FROM_MODERN = {
	T7: "T3",
	T8: "T4",
	P7: "T5",
	P8: "T6",
	FT9: "T1",
	FT10: "T2"
};
function stripChannelDecorations(raw) {
	let s = raw.trim();
	s = s.replace(PREFIX, "");
	s = s.replace(SUFFIX, "");
	s = s.replace(/\s+/g, "");
	return s;
}
function canonicalElectrode(raw) {
	const stripped = stripChannelDecorations(raw);
	const upper = stripped.toUpperCase();
	if (!upper) return stripped;
	const modern = TEMPORAL_ALIASES[upper] ?? upper;
	if (/^FP[12Z]$/.test(modern)) return `Fp${modern.slice(2)}`;
	if (modern.endsWith("Z") && modern.length <= 3) return modern[0] + "z";
	return modern;
}
function electrodeKey(raw) {
	return canonicalElectrode(raw).toUpperCase();
}
function aliasKeys(raw) {
	const key = electrodeKey(raw);
	const keys = /* @__PURE__ */ new Set([key, stripChannelDecorations(raw).toUpperCase()]);
	const modern = TEMPORAL_ALIASES[key];
	if (modern) keys.add(modern);
	const legacy = LEGACY_FROM_MODERN[key];
	if (legacy) keys.add(legacy);
	return [...keys];
}
function classifyLaterality(raw) {
	const key = electrodeKey(raw);
	if (!key) return "unknown";
	if (key === "FZ" || key === "CZ" || key === "PZ" || key === "OZ" || key === "NZ") return "midline";
	if (/Z$/.test(key) && key.length <= 3) return "midline";
	const num = key.match(/(\d+)$/);
	if (num) {
		if (Number(num[1]) % 2 === 1) return "left";
		return "right";
	}
	if (key === "A1" || key === "M1" || key === "PG1" || key === "E1") return "left";
	if (key === "A2" || key === "M2" || key === "PG2" || key === "E2") return "right";
	return "unknown";
}
var EEG_ELECTRODE = /^(FP[12Z]|F[PZ]|F[3-8]|C[PZ]|C[34]|P[PZ]|P[34]|O[12Z]|T[3-8]|T[12]|A[12]|M[12]|FT[79]|FT10|P[78])$/i;
function classifyChannelKind(label, unit) {
	const key = electrodeKey(label);
	const raw = label.toUpperCase();
	if (/ANNOT/i.test(label)) return "other";
	if (/^DC\d+/i.test(key)) return "dc";
	if (/\b(ECG|EKG)\b/.test(raw) || /^EKG/.test(key) || /^ECG/.test(key)) return "ekg";
	if (/^X[12]$/.test(key)) return "ekg";
	if (/\b(EOG|LOC|ROC|EYE|LID|BLINK)\b/.test(raw)) return "eog";
	if (/^PG[12]$/.test(key) || /^E[12]$/.test(key)) return "eog";
	if (key === "E") return "other";
	if (/\b(EMG|CHIN|SUBM)\b/.test(raw)) return "emg";
	if (/^X\d+$/.test(key)) return "extra";
	const u = unit.toLowerCase();
	if (EEG_ELECTRODE.test(key)) return "eeg";
	if ((u === "uv" || u === "µv" || u === "μv") && !/^X\d+$/i.test(key) && !/^DC/i.test(key)) return EEG_ELECTRODE.test(key) ? "eeg" : "extra";
	return "other";
}
function auxDisplayLabel(kind, canonical) {
	if (kind === "ekg") return canonical === "X1" || canonical === "X2" ? `EKG ${canonical}` : `EKG ${canonical}`;
	if (kind === "eog") {
		if (/^PG1$/i.test(canonical)) return "Lid L";
		if (/^PG2$/i.test(canonical)) return "Lid R";
		if (/^E1$/i.test(canonical) || /LOC/i.test(canonical)) return "Lid L";
		if (/^E2$/i.test(canonical) || /ROC/i.test(canonical)) return "Lid R";
		return `EOG ${canonical}`;
	}
	if (kind === "emg") return `EMG ${canonical}`;
	return canonical;
}
function describeChannel(index, label, unit, sampleRate) {
	const kind = classifyChannelKind(label, unit);
	return {
		originalLabel: label,
		index,
		canonical: canonicalElectrode(label),
		laterality: classifyLaterality(label),
		kind,
		isEeg: kind === "eeg",
		unit,
		sampleRate
	};
}
function lateralityPan(lat) {
	if (lat === "left") return -1;
	if (lat === "right") return 1;
	return 0;
}
function panForLaterality(lat) {
	return lateralityPan(lat);
}
function expectedAudioHz(eegHz, compression) {
	return eegHz * compression;
}
function describeMapping(compression) {
	const alpha = expectedAudioHz(10, compression);
	const delta = expectedAudioHz(3, compression);
	const fmt = (hz) => hz >= 1e3 ? `${(hz / 1e3).toFixed(2)} kHz` : `${hz.toFixed(0)} Hz`;
	return `10 Hz alpha → ${fmt(alpha)}; 3 Hz delta → ${fmt(delta)}`;
}
var DOUBLE_BANANA = [
	["Fp1", "F7"],
	["F7", "T3"],
	["T3", "T5"],
	["T5", "O1"],
	["Fp2", "F8"],
	["F8", "T4"],
	["T4", "T6"],
	["T6", "O2"],
	["Fp1", "F3"],
	["F3", "C3"],
	["C3", "P3"],
	["P3", "O1"],
	["Fp2", "F4"],
	["F4", "C4"],
	["C4", "P4"],
	["P4", "O2"],
	["Fz", "Cz"],
	["Cz", "Pz"]
];
var TRANSVERSE = [
	["F7", "Fp1"],
	["Fp1", "Fp2"],
	["Fp2", "F8"],
	["F7", "F3"],
	["F3", "Fz"],
	["Fz", "F4"],
	["F4", "F8"],
	["T3", "C3"],
	["C3", "Cz"],
	["Cz", "C4"],
	["C4", "T4"],
	["T5", "P3"],
	["P3", "Pz"],
	["Pz", "P4"],
	["P4", "T6"],
	["T5", "O1"],
	["O1", "O2"],
	["O2", "T6"]
];
function indexByKeys(channels) {
	const map = /* @__PURE__ */ new Map();
	for (const ch of channels) {
		for (const k of aliasKeys(ch.originalLabel)) if (!map.has(k)) map.set(k, ch.index);
		map.set(electrodeKey(ch.originalLabel), ch.index);
	}
	return map;
}
function pairLaterality(a, b) {
	const la = classifyLaterality(a);
	const lb = classifyLaterality(b);
	if (la === lb) return la;
	if (la === "unknown") return lb;
	if (lb === "unknown") return la;
	return "midline";
}
function referential(c, kind, label) {
	return {
		id: `aux:${kind}:${c.index}`,
		label,
		sources: [c.index],
		laterality: c.laterality,
		kind,
		sampleRate: c.sampleRate,
		available: true,
		missing: []
	};
}
function auxDerivations(channels) {
	const ekg = channels.filter((c) => c.kind === "ekg");
	const eog = channels.filter((c) => c.kind === "eog");
	const emg = channels.filter((c) => c.kind === "emg");
	const extra = channels.filter((c) => c.kind === "extra");
	const out = [];
	if (ekg.length >= 2) out.push({
		id: "aux:ekg",
		label: "EKG",
		sources: [ekg[0].index, ekg[1].index],
		laterality: "midline",
		kind: "ekg",
		sampleRate: ekg[0].sampleRate,
		available: true,
		missing: []
	});
	else for (const c of ekg) out.push(referential(c, "ekg", auxDisplayLabel("ekg", c.canonical)));
	for (const c of eog) out.push(referential(c, "eog", auxDisplayLabel("eog", c.canonical)));
	for (const c of emg) out.push(referential(c, "emg", auxDisplayLabel("emg", c.canonical)));
	for (const c of extra) out.push(referential(c, "extra", c.canonical));
	return out;
}
function buildOriginalMontage(channels) {
	return channels.filter((c) => c.isEeg).map((c) => ({
		id: `ref:${c.index}`,
		label: c.canonical || c.originalLabel,
		sources: [c.index],
		laterality: c.laterality,
		kind: "eeg",
		sampleRate: c.sampleRate,
		available: true,
		missing: []
	}));
}
function buildPairs(channels, pairs, prefix) {
	const map = indexByKeys(channels);
	const rate = channels.find((c) => c.isEeg)?.sampleRate ?? channels[0]?.sampleRate ?? 0;
	return pairs.map(([a, b]) => {
		const ia = findElectrode(map, a);
		const ib = findElectrode(map, b);
		const missing = [];
		if (ia == null) missing.push(a);
		if (ib == null) missing.push(b);
		const available = ia != null && ib != null;
		return {
			id: `${prefix}:${a}-${b}`,
			label: `${a}–${b}`,
			sources: available ? [ia, ib] : [ia ?? -1, ib ?? -1],
			laterality: pairLaterality(a, b),
			kind: "eeg",
			sampleRate: rate,
			available,
			missing
		};
	});
}
function findElectrode(map, name) {
	for (const k of aliasKeys(name)) {
		const hit = map.get(k);
		if (hit != null) return hit;
	}
	return map.get(electrodeKey(name));
}
function buildDoubleBanana(channels) {
	return buildPairs(channels, DOUBLE_BANANA, "banana");
}
function buildTransverse(channels) {
	return buildPairs(channels, TRANSVERSE, "trans");
}
function buildCustomPairs(channels, pairs) {
	return buildPairs(channels, pairs, "custom");
}
function montageDerivations(kind, channels, customPairs = []) {
	let core;
	if (kind === "original") core = buildOriginalMontage(channels);
	else if (kind === "double-banana") core = buildDoubleBanana(channels);
	else if (kind === "transverse") core = buildTransverse(channels);
	else core = buildCustomPairs(channels, customPairs);
	return [...core, ...auxDerivations(channels)];
}
function applyDerivation(samplesBySignal, der) {
	if (!der.available) return /* @__PURE__ */ new Float32Array(0);
	if (der.sources.length === 1) {
		const src = samplesBySignal[der.sources[0]];
		return src ? new Float32Array(src) : /* @__PURE__ */ new Float32Array(0);
	}
	const a = samplesBySignal[der.sources[0]];
	const b = samplesBySignal[der.sources[1]];
	if (!a || !b) return /* @__PURE__ */ new Float32Array(0);
	const n = Math.min(a.length, b.length);
	const out = new Float32Array(n);
	for (let i = 0; i < n; i++) out[i] = a[i] - b[i];
	return out;
}
var STANDARD_ELECTRODES = [
	"Fp1",
	"Fp2",
	"F7",
	"F3",
	"Fz",
	"F4",
	"F8",
	"T3",
	"C3",
	"Cz",
	"C4",
	"T4",
	"T5",
	"P3",
	"Pz",
	"P4",
	"T6",
	"O1",
	"O2",
	"A1",
	"A2",
	"T1",
	"T2"
];
function ascii(buf, start, len) {
	const bytes = new Uint8Array(buf, start, len);
	let s = "";
	for (let i = 0; i < bytes.length; i++) {
		const c = bytes[i];
		if (c === 0) break;
		s += String.fromCharCode(c);
	}
	return s.trim();
}
function looksIdentifying(patient, recording) {
	const blob = `${patient} ${recording}`.toLowerCase();
	if (!blob.trim()) return false;
	if (blob.split(/\s+/).filter((t) => t && t !== "x" && t !== "xx").filter((t) => t !== "x").length === 0) return false;
	if (/\b(mr|ms|mrs|dr|patient|name)\b/.test(blob)) return true;
	if (/[a-z]{3,}/.test(patient) && !/^x(\s+x)*$/i.test(patient)) return true;
	return patient.length > 0 && !/^x(\s+x)*$/i.test(patient.trim());
}
function parseSignalHeaders(buffer, nsig) {
	let off = 256;
	const take = (width) => {
		const arr = [];
		for (let i = 0; i < nsig; i++) {
			arr.push(ascii(buffer, off, width));
			off += width;
		}
		return arr;
	};
	const labels = take(16);
	const transducers = take(80);
	const units = take(8);
	const pmins = take(8);
	const pmaxs = take(8);
	const dmins = take(8);
	const dmaxs = take(8);
	const prefilters = take(80);
	const nsps = take(8);
	const reserveds = take(32);
	const signals = [];
	for (let i = 0; i < nsig; i++) {
		const label = labels[i];
		const samplesPerRecord = Number(nsps[i]);
		const isAnnotation = /edf\s*annotations/i.test(label);
		signals.push({
			index: i,
			label,
			transducer: transducers[i],
			unit: units[i],
			physicalMin: Number(pmins[i]),
			physicalMax: Number(pmaxs[i]),
			digitalMin: Number(dmins[i]),
			digitalMax: Number(dmaxs[i]),
			prefilter: prefilters[i],
			samplesPerRecord: Number.isFinite(samplesPerRecord) ? samplesPerRecord : 0,
			reserved: reserveds[i],
			sampleRate: 0,
			isAnnotation
		});
	}
	return signals;
}
function parseEdfHeader(buffer) {
	if (buffer.byteLength < 256) throw new Error("File is too small to be an EDF/EDF+ recording.");
	const version = ascii(buffer, 0, 8);
	if (version !== "0" && version !== "") {}
	const patient = ascii(buffer, 8, 80);
	const recording = ascii(buffer, 88, 80);
	const startDate = ascii(buffer, 168, 8);
	const startTime = ascii(buffer, 176, 8);
	const headerBytes = Number(ascii(buffer, 184, 8));
	const reserved = ascii(buffer, 192, 44);
	const recordCount = Number(ascii(buffer, 236, 8));
	const recordDuration = Number(ascii(buffer, 244, 8));
	const nsig = Number(ascii(buffer, 252, 4));
	if (!Number.isFinite(nsig) || nsig < 1 || nsig > 512) throw new Error("This file does not look like a valid EDF header (signal count).");
	if (!Number.isFinite(headerBytes) || headerBytes < 256 + nsig * 256) throw new Error("EDF header size does not match the signal count.");
	if (!Number.isFinite(recordDuration) || recordDuration <= 0) throw new Error("EDF record duration is missing or invalid.");
	if (!Number.isFinite(recordCount) || recordCount < 1) throw new Error("EDF has no data records.");
	const signals = parseSignalHeaders(buffer, nsig);
	for (const s of signals) s.sampleRate = s.samplesPerRecord / recordDuration;
	const bytesPerRecord = signals.reduce((a, s) => a + s.samplesPerRecord * 2, 0);
	const expected = headerBytes + recordCount * bytesPerRecord;
	if (buffer.byteLength < headerBytes + bytesPerRecord) throw new Error("EDF file is truncated before the first data record.");
	if (buffer.byteLength < expected - bytesPerRecord) {}
	return {
		version,
		identifierWarning: looksIdentifying(patient, recording),
		startDate,
		startTime,
		headerBytes,
		reserved,
		recordCount,
		recordDuration,
		duration: recordCount * recordDuration,
		signals,
		bytesPerRecord,
		isEdfPlus: reserved.toUpperCase().startsWith("EDF+")
	};
}
function listChannels(header) {
	return header.signals.filter((s) => !s.isAnnotation).map((s) => describeChannel(s.index, s.label, s.unit, s.sampleRate));
}
function physical(s, digital) {
	const spanD = s.digitalMax - s.digitalMin;
	if (spanD === 0) return 0;
	return (digital - s.digitalMin) / spanD * (s.physicalMax - s.physicalMin) + s.physicalMin;
}
function readRecords(buffer, header, startSec, durationSec) {
	const startRec = Math.max(0, Math.floor(startSec / header.recordDuration));
	const nRecWanted = Math.max(1, Math.ceil(durationSec / header.recordDuration));
	const nRec = Math.min(nRecWanted, header.recordCount - startRec);
	if (nRec <= 0) throw new Error("Requested interval is outside the recording.");
	const view = new DataView(buffer);
	const nsig = header.signals.length;
	const out = header.signals.map((s) => new Float32Array(s.samplesPerRecord * nRec));
	const offsets = [];
	let run = 0;
	for (const s of header.signals) {
		offsets.push(run);
		run += s.samplesPerRecord * 2;
	}
	for (let r = 0; r < nRec; r++) {
		const recOff = header.headerBytes + (startRec + r) * header.bytesPerRecord;
		if (recOff + header.bytesPerRecord > buffer.byteLength) break;
		for (let c = 0; c < nsig; c++) {
			const sig = header.signals[c];
			const dest = out[c];
			const base = recOff + offsets[c];
			const destOff = r * sig.samplesPerRecord;
			if (sig.isAnnotation) for (let i = 0; i < sig.samplesPerRecord; i++) dest[destOff + i] = view.getInt16(base + i * 2, true);
			else for (let i = 0; i < sig.samplesPerRecord; i++) {
				const d = view.getInt16(base + i * 2, true);
				dest[destOff + i] = physical(sig, d);
			}
		}
	}
	return {
		samples: out,
		start: startRec * header.recordDuration,
		duration: nRec * header.recordDuration
	};
}
function parseTals(bytes, recordOrigin) {
	const text = Array.from(bytes).map((b) => b === 0 ? "\0" : String.fromCharCode(b)).join("");
	const out = [];
	const chunks = text.split("\0").filter(Boolean);
	for (const chunk of chunks) {
		const parts = chunk.split("");
		if (!parts[0]) continue;
		const durSplit = parts[0].split("");
		const onset = Number(durSplit[0]);
		if (!Number.isFinite(onset)) continue;
		const duration = durSplit[1] != null && durSplit[1] !== "" ? Number(durSplit[1]) : null;
		const anns = parts.slice(1).map((s) => s.replace(/\0/g, "").trim()).filter(Boolean);
		if (anns.length === 0) out.push({
			onset: recordOrigin + onset,
			duration,
			text: ""
		});
		else for (const a of anns) out.push({
			onset: recordOrigin + onset,
			duration,
			text: a
		});
	}
	return out;
}
function readAnnotations(buffer, header) {
	const idx = header.signals.findIndex((s) => s.isAnnotation);
	if (idx < 0) return [];
	const sig = header.signals[idx];
	const view = new DataView(buffer);
	const offsets = [];
	let run = 0;
	for (const s of header.signals) {
		offsets.push(run);
		run += s.samplesPerRecord * 2;
	}
	const out = [];
	const nRec = header.recordCount;
	for (let r = 0; r < nRec; r++) {
		const recOff = header.headerBytes + r * header.bytesPerRecord;
		if (recOff + header.bytesPerRecord > buffer.byteLength) break;
		const base = recOff + offsets[idx];
		const bytes = new Uint8Array(sig.samplesPerRecord * 2);
		for (let i = 0; i < sig.samplesPerRecord; i++) {
			const v = view.getInt16(base + i * 2, true);
			bytes[i * 2] = v & 255;
			bytes[i * 2 + 1] = v >> 8 & 255;
		}
		const origin = r * header.recordDuration;
		out.push(...parseTals(bytes, origin));
	}
	return out.filter((a) => a.text);
}
async function loadRecording(file, name) {
	const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
	const header = parseEdfHeader(buffer);
	let annotations = [];
	try {
		annotations = readAnnotations(buffer, header);
	} catch {
		annotations = [];
	}
	return {
		name,
		header,
		buffer,
		annotations
	};
}
function sampleRateSummary(header) {
	const rates = [...new Set(header.signals.filter((s) => !s.isAnnotation).map((s) => Math.round(s.sampleRate * 1e3) / 1e3))];
	const primary = header.signals.filter((s) => !s.isAnnotation && /uv/i.test(s.unit)).map((s) => s.sampleRate)[0] ?? rates[0] ?? 0;
	return {
		unique: rates,
		mixed: rates.length > 1,
		primary
	};
}
var MIN_VIEW_SEC = .5;
var FOLLOW_FRAC = .3;
var VIEW_PRESETS = [
	2,
	5,
	10,
	15,
	30,
	60
];
function clamp(n, lo, hi) {
	return Math.min(hi, Math.max(lo, n));
}
function clampView(start, duration, total) {
	const tot = Math.max(0, total);
	const minD = Math.min(MIN_VIEW_SEC, tot || .5);
	const dur = clamp(duration, minD, Math.max(tot, minD));
	return {
		start: clamp(start, 0, Math.max(0, tot - dur)),
		duration: dur
	};
}
/** Zoom `duration` by `factor`, keeping `anchor` (eeg seconds) fixed in the window. */
function zoomView(start, duration, total, factor, anchor) {
	const nextDur = duration * Math.max(.001, factor);
	const rel = duration > 1e-9 ? (anchor - start) / duration : FOLLOW_FRAC;
	const { duration: d } = clampView(0, nextDur, total);
	return clampView(anchor - clamp(rel, 0, 1) * d, d, total);
}
function followViewStart(playhead, viewDur, total, frac = FOLLOW_FRAC) {
	return clampView(playhead - viewDur * frac, viewDur, total).start;
}
function timeAtFraction(frac, start, duration) {
	return start + clamp(frac, 0, 1) * duration;
}
/** Min/max envelope of samples in [t0, t1) mapped onto `nPix` columns. */
function envelopeWindow(samples, sampleRate, t0, t1, nPix) {
	const min = new Float32Array(Math.max(0, nPix));
	const max = new Float32Array(Math.max(0, nPix));
	if (samples.length === 0 || nPix <= 0 || t1 <= t0 || sampleRate <= 0) return {
		min,
		max
	};
	const span = t1 - t0;
	for (let p = 0; p < nPix; p++) {
		const a = t0 + p / nPix * span;
		const b = t0 + (p + 1) / nPix * span;
		let i0 = Math.floor(a * sampleRate);
		let i1 = Math.floor(b * sampleRate);
		if (i1 <= i0) i1 = i0 + 1;
		i0 = Math.max(0, i0);
		i1 = Math.min(samples.length, i1);
		let lo = Infinity;
		let hi = -Infinity;
		for (let i = i0; i < i1; i++) {
			const v = samples[i];
			if (v < lo) lo = v;
			if (v > hi) hi = v;
		}
		min[p] = lo === Infinity ? 0 : lo;
		max[p] = hi === -Infinity ? 0 : hi;
	}
	return {
		min,
		max
	};
}
function Label({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: cn("text-xs font-medium tracking-wide text-muted", className),
		...props
	});
}
function Separator({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "separator",
		className: cn("h-px w-full bg-border", className)
	});
}
function Badge({ className, tone = "muted", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center rounded-full px-2 py-0.5 font-medium tracking-wide text-xs", tone === "muted" && "bg-surface-2 text-muted", tone === "accent" && "bg-accent/15 text-accent", tone === "hemi-l" && "bg-hemi-l/15 text-hemi-l", tone === "hemi-r" && "bg-hemi-r/15 text-hemi-r", tone === "warn" && "bg-warn/15 text-warn", className),
		...props
	});
}
function voltageToMidi(v, root, range, negativeUp, degrees) {
	const signed = negativeUp ? v : -v;
	const midi = root + Math.max(-1, Math.min(1, signed)) * range;
	if (!degrees) return midi;
	return quantizeMidi(midi, degrees, root);
}
function interp(x, idx) {
	if (x.length === 0) return 0;
	if (idx <= 0) return x[0];
	if (idx >= x.length - 1) return x[x.length - 1];
	const i = Math.floor(idx);
	const f = idx - i;
	return x[i] * (1 - f) + x[i + 1] * f;
}
function settingsToOpts(s, negativeUp) {
	return {
		timeScale: s.mode === "direct" ? s.compression : s.timeScale,
		rootMidi: s.rootMidi,
		rangeSemitones: s.rangeSemitones,
		scale: s.scale,
		quantize: s.quantize,
		negativeUp,
		outputRate: s.outputRate,
		mode: s.mode
	};
}
/**
* Warm realtime-style renderer: voltage → pitch (contour), |voltage| → loudness.
* Used for tests and WAV bounce. The live path is the AudioWorklet copy.
*/
function renderContour(tracks, eegDuration, opts) {
	const audible = tracks.filter((t) => {
		if (t.mute || t.voltage.length === 0) return false;
		return true;
	});
	const anySolo = tracks.some((t) => t.solo);
	const voices = audible.filter((t) => anySolo ? t.solo : true);
	const timeScale = Math.max(.25, opts.timeScale);
	const audioDur = Math.max(.05, eegDuration / timeScale);
	const n = Math.max(1, Math.round(audioDur * opts.outputRate));
	const left = new Float32Array(n);
	const right = new Float32Array(n);
	if (voices.length === 0) return {
		left,
		right,
		sampleRate: opts.outputRate,
		duration: 0,
		eegDuration,
		compressionUsed: timeScale,
		peak: 0,
		clipped: false
	};
	const degrees = opts.quantize ? SCALE_DEGREES[opts.scale] : null;
	const voiceGain = .72 / Math.sqrt(voices.length);
	const phases = voices.map(() => 0);
	const ampS = voices.map(() => 0);
	const hzS = voices.map(() => midiToHz(opts.rootMidi));
	const prevV = voices.map(() => 0);
	const scales = voices.map((tr) => 1 / Math.max(1e-6, percentileAbs(tr.voltage, .995)));
	let lpL = 0;
	let lpR = 0;
	const lpA = 1 - Math.exp(-2 * Math.PI * (opts.mode === "pen" ? 2800 : 1600) / opts.outputRate);
	const spikeGain = .18;
	const spikeIdx = voices.map(() => 0);
	for (let i = 0; i < n; i++) {
		const eegT = i / opts.outputRate * timeScale;
		let l = 0;
		let r = 0;
		for (let v = 0; v < voices.length; v++) {
			const tr = voices[v];
			const idx = eegT * tr.sampleRate;
			const raw = interp(tr.voltage, idx);
			const vn = Math.max(-1, Math.min(1, raw * scales[v]));
			const gL = (.5 - .5 * tr.pan) * Math.SQRT2;
			const gR = (.5 + .5 * tr.pan) * Math.SQRT2;
			if (opts.mode === "direct") {
				const sample = vn * voiceGain * tr.gain;
				l += sample * gL;
				r += sample * gR;
			} else if (opts.mode === "pen") {
				const vel = vn - prevV[v];
				prevV[v] = vn;
				const speed = Math.min(1, Math.abs(vel) * 14);
				ampS[v] = ampS[v] + .08 * (.1 + .9 * speed - ampS[v]);
				const signed = opts.negativeUp ? vn : -vn;
				const thz = 620 + speed * 1480 + signed * 160;
				hzS[v] = hzS[v] + .05 * (thz - hzS[v]);
				phases[v] = phases[v] + 2 * Math.PI * hzS[v] / opts.outputRate;
				const noise = Math.sin(i * 12.9898 + vn * 78.233) * 43758.5453 % 1 * 2 - 1;
				const scratch = Math.sin(phases[v]) * speed;
				const paper = noise * (.28 + .72 * speed);
				const s = (scratch * .58 + paper * .42) * ampS[v] * voiceGain * tr.gain;
				l += s * gL;
				r += s * gR;
			} else {
				const targetAmp = Math.min(1, Math.abs(vn) * 1.35);
				ampS[v] = ampS[v] + .04 * (targetAmp - ampS[v]);
				let targetHz;
				if (opts.mode === "pulse") targetHz = midiToHz(opts.rootMidi - 12);
				else targetHz = midiToHz(voltageToMidi(vn, opts.rootMidi, opts.rangeSemitones, opts.negativeUp, degrees));
				hzS[v] = hzS[v] + .08 * (targetHz - hzS[v]);
				phases[v] = phases[v] + 2 * Math.PI * hzS[v] / opts.outputRate;
				const s = Math.sin(phases[v]) * ampS[v] * voiceGain * tr.gain;
				const sub = Math.sin(phases[v] * .5) * ampS[v] * .12 * voiceGain * tr.gain;
				l += (s + sub) * gL;
				r += (s + sub) * gR;
			}
			const spikes = tr.spikes;
			let si = spikeIdx[v];
			while (si < spikes.length && spikes[si] < eegT - .05) si++;
			spikeIdx[v] = si;
			if (si < spikes.length) {
				const dt = eegT - spikes[si];
				if (dt >= 0 && dt < .045) {
					const env = Math.exp(-dt * 55);
					const tap = Math.sin(2 * Math.PI * 168 * (i / opts.outputRate)) * env * spikeGain * tr.gain;
					l += tap * gL;
					r += tap * gR;
				}
			}
		}
		lpL += lpA * (l - lpL);
		lpR += lpA * (r - lpR);
		left[i] = Math.tanh(lpL * .85);
		right[i] = Math.tanh(lpR * .85);
	}
	const peak = Math.max(peakAbs(left), peakAbs(right), 1e-9);
	if (peak > .89) {
		const g = .89 / peak;
		for (let i = 0; i < n; i++) {
			left[i] *= g;
			right[i] *= g;
		}
	}
	const fl = fadeEdges(softLimit(left, .9), opts.outputRate, 16);
	const fr = fadeEdges(softLimit(right, .9), opts.outputRate, 16);
	return {
		left: fl,
		right: fr,
		sampleRate: opts.outputRate,
		duration: n / opts.outputRate,
		eegDuration,
		compressionUsed: timeScale,
		peak: Math.max(peakAbs(fl), peakAbs(fr)),
		clipped: hasNan(fl) || hasNan(fr)
	};
}
function writeString(view, offset, s) {
	for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}
function encodeWav(mix, bitDepth = 16) {
	const n = mix.left.length;
	const ch = 2;
	const bytesPerSample = bitDepth / 8;
	const dataSize = n * ch * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);
	writeString(view, 0, "RIFF");
	view.setUint32(4, 36 + dataSize, true);
	writeString(view, 8, "WAVE");
	writeString(view, 12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, ch, true);
	view.setUint32(24, mix.sampleRate, true);
	view.setUint32(28, mix.sampleRate * ch * bytesPerSample, true);
	view.setUint16(32, ch * bytesPerSample, true);
	view.setUint16(34, bitDepth, true);
	writeString(view, 36, "data");
	view.setUint32(40, dataSize, true);
	let o = 44;
	for (let i = 0; i < n; i++) {
		const l = Math.max(-1, Math.min(1, mix.left[i] ?? 0));
		const r = Math.max(-1, Math.min(1, mix.right[i] ?? 0));
		if (bitDepth === 16) {
			view.setInt16(o, Math.round(l * 32767), true);
			view.setInt16(o + 2, Math.round(r * 32767), true);
			o += 4;
		} else {
			const sl = Math.round(l * 8388607);
			const sr = Math.round(r * 8388607);
			view.setUint8(o, sl & 255);
			view.setUint8(o + 1, sl >> 8 & 255);
			view.setUint8(o + 2, sl >> 16 & 255);
			view.setUint8(o + 3, sr & 255);
			view.setUint8(o + 4, sr >> 8 & 255);
			view.setUint8(o + 5, sr >> 16 & 255);
			o += 6;
		}
	}
	return new Blob([buffer], { type: "audio/wav" });
}
/**
* Realtime contour player. Mute/solo/gain/pan are messages to the worklet —
* nothing is resynthesized.
*/
var MixerEngine = class {
	ctx = null;
	master = null;
	lp = null;
	node = null;
	playing = false;
	loop = false;
	eegDur = 0;
	timeScale = 2;
	eegOffset = 0;
	startedAt = 0;
	ready = null;
	onEnded = null;
	endedFired = false;
	controls = [];
	sonify = null;
	negativeUp = true;
	async ensure() {
		if (!this.ctx) this.ctx = new AudioContext();
		if (this.ctx.state === "suspended") await this.ctx.resume();
		if (!this.ready) this.ready = this.ctx.audioWorklet.addModule("/contour-worklet.js?v=pen-dsa").then(() => {
			if (!this.ctx) return;
			this.node = new AudioWorkletNode(this.ctx, "contour-synth", { outputChannelCount: [2] });
			this.node.port.onmessage = (ev) => {
				if (ev.data?.type === "ended") {
					if (this.loop) {
						this.seek(0);
						this.play();
						return;
					}
					if (!this.endedFired) {
						this.endedFired = true;
						this.playing = false;
						this.eegOffset = this.eegDur;
						this.onEnded?.();
					}
				}
			};
			this.lp = this.ctx.createBiquadFilter();
			this.lp.type = "lowpass";
			this.lp.frequency.value = 2600;
			this.lp.Q.value = .65;
			this.master = this.ctx.createGain();
			this.master.gain.value = 1.15;
			this.node.connect(this.lp);
			this.lp.connect(this.master);
			this.master.connect(this.ctx.destination);
		}).catch((err) => {
			console.warn("contour worklet failed", err);
		});
		await this.ready;
		return this.ctx;
	}
	setControlTracks(tracks, eegDuration) {
		this.controls = tracks;
		this.eegDur = eegDuration;
		this.endedFired = false;
		const payload = tracks.map((t) => ({
			id: t.id,
			voltage: t.voltage,
			sampleRate: t.sampleRate,
			pan: t.pan,
			gain: t.gain,
			mute: t.mute,
			solo: t.solo,
			spikes: t.spikes,
			scale: 1 / Math.max(1e-6, percentileAbs(t.voltage, .995)),
			kind: t.kind
		}));
		this.ensure().then(() => {
			this.node?.port.postMessage({
				type: "session",
				eegDuration,
				tracks: payload
			});
			this.pushSettings();
		});
	}
	applyParams(params) {
		for (const p of params) {
			const c = this.controls.find((t) => t.id === p.id);
			if (c) {
				c.pan = p.pan;
				c.gain = p.gain;
				c.mute = p.mute;
				c.solo = p.solo;
			}
		}
		this.node?.port.postMessage({
			type: "params",
			tracks: params
		});
	}
	setSettings(sonify, negativeUp) {
		this.sonify = sonify;
		this.negativeUp = negativeUp;
		this.timeScale = sonify.mode === "direct" ? sonify.compression : sonify.timeScale;
		this.pushSettings();
	}
	pushSettings() {
		const s = this.sonify;
		if (!s || !this.node) return;
		if (this.lp) this.lp.frequency.value = s.mode === "pen" ? 4200 : s.mode === "piano" ? 2800 : s.mode === "choir" ? 2200 : 2400;
		this.node.port.postMessage({
			type: "settings",
			timeScale: this.timeScale,
			rootMidi: s.rootMidi,
			rangeSemitones: s.rangeSemitones,
			negativeUp: this.negativeUp,
			quantize: s.quantize,
			degrees: SCALE_DEGREES[s.scale],
			mode: s.mode,
			volume: s.volume ?? 1.45
		});
	}
	/** EEG seconds. */
	currentTime() {
		if (!this.playing || !this.ctx) return Math.min(this.eegDur, Math.max(0, this.eegOffset));
		let t = this.eegOffset + (this.ctx.currentTime - this.startedAt) * this.timeScale;
		if (this.loop && this.eegDur > 0) t = (t % this.eegDur + this.eegDur) % this.eegDur;
		else t = Math.min(this.eegDur, Math.max(0, t));
		if (!this.loop && this.eegDur > 0 && t >= this.eegDur - .001) {
			if (!this.endedFired) {
				this.endedFired = true;
				this.playing = false;
				this.eegOffset = this.eegDur;
				this.node?.port.postMessage({ type: "pause" });
				this.onEnded?.();
			}
			return this.eegDur;
		}
		return t;
	}
	duration() {
		return this.eegDur;
	}
	audioDuration() {
		return this.eegDur / Math.max(.25, this.timeScale);
	}
	async play() {
		if (this.eegDur <= 0) return;
		const ctx = await this.ensure();
		if (!this.node) return;
		this.endedFired = false;
		if (this.eegOffset >= this.eegDur - .001) this.eegOffset = 0;
		this.node.port.postMessage({
			type: "play",
			eegTime: this.eegOffset
		});
		this.startedAt = ctx.currentTime;
		this.playing = true;
	}
	pause() {
		if (!this.playing) return;
		this.eegOffset = this.currentTime();
		this.node?.port.postMessage({ type: "pause" });
		this.playing = false;
	}
	stop() {
		this.node?.port.postMessage({ type: "pause" });
		this.node?.port.postMessage({
			type: "seek",
			eegTime: 0
		});
		this.playing = false;
		this.eegOffset = 0;
		this.endedFired = false;
	}
	seek(eegT) {
		this.eegOffset = Math.min(this.eegDur, Math.max(0, eegT));
		this.endedFired = false;
		this.node?.port.postMessage({
			type: "seek",
			eegTime: this.eegOffset
		});
		if (this.playing && this.ctx) {
			this.startedAt = this.ctx.currentTime;
			this.node?.port.postMessage({
				type: "play",
				eegTime: this.eegOffset
			});
		}
	}
	setLoop(loop) {
		this.loop = loop;
	}
	bounceWav(negativeUp) {
		if (!this.sonify || this.controls.length === 0) return null;
		return renderContour(this.controls, this.eegDur, settingsToOpts(this.sonify, negativeUp));
	}
	/** @deprecated buffer API — kept so old mixdown tests still typecheck via mixdownTracks */
	setTracks(_tracks) {}
};
var playback = new MixerEngine();
function derivationsFor(recording, kind, customPairs) {
	return montageDerivations(kind, listChannels(recording.header), customPairs);
}
function processSegment(recording, start, duration, derivations, filters) {
	const rec = readRecords(recording.buffer, recording.header, start, duration);
	const tracks = derivations.filter((d) => d.available).map((d) => {
		const filtered = applyFilters(applyDerivation(rec.samples, d), d.sampleRate, filters);
		return {
			id: d.id,
			label: d.label,
			laterality: d.laterality,
			kind: d.kind,
			samples: filtered,
			sampleRate: d.sampleRate
		};
	});
	return {
		start: rec.start,
		duration: rec.duration,
		tracks
	};
}
function audibleIds(tracks) {
	const anySolo = tracks.some((t) => t.solo);
	const set = /* @__PURE__ */ new Set();
	for (const t of tracks) {
		if (t.mute) continue;
		if (anySolo && !t.solo) continue;
		set.add(t.id);
	}
	return set;
}
function controlTracksFrom(processed, trackState, combine, spikes) {
	return processed.map((p) => {
		const st = trackState[p.id];
		const lat = st?.lateralityOverride ?? p.laterality;
		return {
			id: p.id,
			label: p.label,
			kind: p.kind,
			laterality: lat,
			voltage: p.samples,
			sampleRate: p.sampleRate,
			pan: combine === "average" ? 0 : panForLaterality(lat),
			gain: st?.gain ?? 1,
			mute: Boolean(st?.mute),
			solo: Boolean(st?.solo),
			spikes: spikes[p.id] ?? /* @__PURE__ */ new Float32Array(0)
		};
	});
}
function buildRepro(opts) {
	const f = [];
	if (opts.filters.removeDc) f.push("DC offset removed");
	if (opts.filters.lff > 0) f.push(`LFF ${opts.filters.lff} Hz`);
	if (opts.filters.hff > 0) f.push(`HFF ${opts.filters.hff} Hz`);
	if (opts.filters.bandpass) f.push(`${opts.filters.bandpassLow}–${opts.filters.bandpassHigh} Hz bandpass (zero-phase)`);
	if (opts.filters.notch60) f.push("60 Hz notch (zero-phase)");
	if (f.length === 0) f.push("none");
	const method = opts.settings.mode === "direct" ? "direct time compression of the waveform" : opts.settings.mode === "choir" ? `just-intonation 1/f choir (${opts.settings.scale})` : opts.settings.mode === "pulse" ? "pulse (amplitude follows |wave|)" : opts.settings.mode === "piano" ? `experimental piano (in-scale unless abnormal, ${opts.settings.scale})` : opts.settings.mode === "pen" ? "analog pen-on-paper (velocity → scratch)" : `contour (voltage → pitch, ${opts.settings.scale} root MIDI ${opts.settings.rootMidi})`;
	const compression = opts.settings.mode === "direct" ? `${opts.settings.compression}× (${describeMapping(opts.settings.compression)})` : `${timeScaleFor(opts.settings)}× playback time scale`;
	return {
		file: opts.file,
		montage: opts.montage,
		channels: opts.labels,
		interval: `${opts.start.toFixed(2)}–${(opts.start + opts.duration).toFixed(2)} s`,
		filters: f,
		normalization: `robust ${opts.settings.percentile} percentile, soft-limit`,
		method,
		compression,
		carrier: opts.settings.mode === "direct" ? "n/a" : `${opts.settings.rootMidi} MIDI root`,
		outputRate: `${opts.settings.outputRate} Hz`,
		stereo: opts.combine,
		audible: opts.audible
	};
}
function uid(prefix) {
	return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
function ev(type, start, end, trackId, confidence, text = "") {
	return {
		id: uid(type),
		start,
		end: Math.max(end, start),
		trackId,
		type,
		text,
		source: "auto",
		confidence
	};
}
/** Width at half-maximum around a peak, in samples. */
function widthAtHalf(x, peak, half) {
	let i0 = peak;
	let i1 = peak;
	while (i0 > 0 && Math.abs(x[i0]) >= half) i0--;
	while (i1 < x.length - 1 && Math.abs(x[i1]) >= half) i1++;
	return {
		i0,
		i1
	};
}
function detectTransients(x, fs, trackId, kind) {
	if (x.length < fs * .2) return [];
	const sigma = percentileAbs(x, .8);
	const thr = Math.max(sigma * 4.2, 1e-6);
	const out = [];
	let i = 1;
	while (i < x.length - 1) {
		const v = x[i];
		if (Math.abs(v) < thr || Math.abs(v) < Math.abs(x[i - 1]) || Math.abs(v) < Math.abs(x[i + 1])) {
			i++;
			continue;
		}
		const { i0, i1 } = widthAtHalf(x, i, Math.abs(v) * .5);
		const ms = (i1 - i0) / fs * 1e3;
		const t = i / fs;
		if (kind === "eog" && ms >= 80 && ms <= 450) out.push(ev("blink", t - ms / 2e3, t + ms / 2e3, trackId, .7));
		else if (kind === "ekg" && ms >= 20 && ms <= 120) out.push(ev("qrs", t, t + .04, trackId, .75));
		else if (kind === "eeg" && ms >= 20 && ms < 70) out.push(ev("spike", t - .03, t + .04, trackId, .72));
		else if (kind === "eeg" && ms >= 70 && ms <= 200) out.push(ev("sharp", t - .05, t + .08, trackId, .68));
		else if (kind === "eeg" && ms > 200 && ms <= 500 && Math.abs(v) > thr * 1.2) out.push(ev("slow", t - ms / 2e3, t + ms / 2e3, trackId, .55));
		i = Math.max(i + 1, i1);
		if (out.length > 80) break;
	}
	return out;
}
function zcrHz(x, fs, a, b) {
	let z = 0;
	let prev = x[a] ?? 0;
	for (let i = a + 1; i < b; i++) {
		const v = x[i];
		if (prev <= 0 && v > 0) z++;
		prev = v;
	}
	return z / Math.max(1e-6, (b - a) / fs);
}
function rms(x, a, b) {
	let s = 0;
	const n = Math.max(1, b - a);
	for (let i = a; i < b; i++) s += x[i] * x[i];
	return Math.sqrt(s / n);
}
function detectRhythms(x, fs, trackId) {
	const out = [];
	const hop = Math.max(1, Math.round(.25 * fs));
	const win = Math.max(8, Math.round(1 * fs));
	let i = 0;
	let run = null;
	const close = (end, conf) => {
		if (run && end - run.start >= .8) out.push(ev(run.type, run.start, end, trackId, conf));
		run = null;
	};
	while (i + win < x.length) {
		const f = zcrHz(x, fs, i, i + win);
		const e = rms(x, i, i + win);
		const t = i / fs;
		let hit = null;
		if (e > 1e-6 && f >= 8 && f <= 13) hit = "alpha";
		else if (e > 1e-6 && f >= 11 && f <= 16) hit = "spindle";
		else if (e > 1e-6 && f >= 2.3 && f <= 4.2) hit = "spike-wave";
		if (run !== null && hit !== null && run.type === hit) {} else if (hit) {
			close(t, .6);
			run = {
				type: hit,
				start: t
			};
		} else close(t, .6);
		i += hop;
	}
	close(x.length / fs, .55);
	return out.slice(0, 40);
}
function detectBurstSuppression(x, fs, trackId) {
	const hop = Math.max(1, Math.round(.1 * fs));
	const energies = [];
	for (let i = 0; i + hop <= x.length; i += hop) energies.push(rms(x, i, i + hop));
	if (energies.length < 20) return [];
	const sorted = [...energies].sort((a, b) => a - b);
	const lo = sorted[Math.floor(sorted.length * .25)];
	const hi = sorted[Math.floor(sorted.length * .7)];
	if (hi < lo * 4) return [];
	const thr = (lo + hi) / 2;
	const out = [];
	let i = 0;
	while (i < energies.length) {
		while (i < energies.length && energies[i] < thr) i++;
		const b0 = i;
		while (i < energies.length && energies[i] >= thr) i++;
		const b1 = i;
		const s0 = i;
		while (i < energies.length && energies[i] < thr) i++;
		const s1 = i;
		const burst = (b1 - b0) * .1;
		const supp = (s1 - s0) * .1;
		if (burst >= .2 && burst <= 1.4 && supp >= .4) out.push(ev("burst-suppression", b0 * .1, s1 * .1, trackId, .65));
	}
	return out.slice(0, 20);
}
function detectPeriodic(events, trackId) {
	const trans = events.filter((e) => (e.type === "spike" || e.type === "sharp") && e.trackId === trackId).sort((a, b) => a.start - b.start);
	if (trans.length < 4) return [];
	const out = [];
	let run = [trans[0]];
	const flush = () => {
		if (run.length < 4) return;
		const iv = [];
		for (let i = 1; i < run.length; i++) iv.push(run[i].start - run[i - 1].start);
		const mean = iv.reduce((a, b) => a + b, 0) / iv.length;
		if (mean < .4 || mean > 2.2) return;
		if (Math.sqrt(iv.reduce((a, b) => a + (b - mean) ** 2, 0) / iv.length) / mean > .45) return;
		out.push(ev("periodic", run[0].start, run[run.length - 1].end, trackId, .7, `~${(1 / mean).toFixed(1)} Hz`));
	};
	for (let i = 1; i < trans.length; i++) {
		const dt = trans[i].start - trans[i - 1].start;
		if (dt >= .35 && dt <= 2.4) run.push(trans[i]);
		else {
			flush();
			run = [trans[i]];
		}
	}
	flush();
	return out;
}
function polyspikeFrom(spikes, trackId) {
	const s = spikes.filter((e) => e.type === "spike" && e.trackId === trackId).sort((a, b) => a.start - b.start);
	const out = [];
	for (let i = 0; i < s.length; i++) {
		let j = i + 1;
		while (j < s.length && s[j].start - s[i].start <= .09) j++;
		if (j - i >= 2) {
			out.push(ev("polyspike", s[i].start, s[j - 1].end, trackId, .66));
			i = j - 1;
		}
	}
	return out;
}
function detectMorphologies(tracks) {
	const all = [];
	const eeg = tracks.filter((t) => t.kind === "eeg");
	const sample = eeg.length > 8 ? [
		eeg[0],
		eeg[Math.floor(eeg.length / 2)],
		eeg[eeg.length - 1]
	] : eeg;
	for (const tr of tracks) {
		if (tr.kind === "extra") continue;
		const trans = detectTransients(tr.samples, tr.sampleRate, tr.id, tr.kind);
		all.push(...trans);
		if (tr.kind === "eeg" && sample.includes(tr)) {
			all.push(...detectRhythms(tr.samples, tr.sampleRate, tr.id));
			all.push(...detectBurstSuppression(tr.samples, tr.sampleRate, tr.id));
			all.push(...detectPeriodic(trans, tr.id));
			all.push(...polyspikeFrom(trans, tr.id));
		}
	}
	all.sort((a, b) => a.start - b.start);
	return mergeNearby(all).slice(0, 240);
}
function mergeNearby(events) {
	const out = [];
	for (const e of events) {
		const prev = out[out.length - 1];
		if (prev && prev.type === e.type && prev.trackId === e.trackId && e.start - prev.end < .12) {
			prev.end = Math.max(prev.end, e.end);
			prev.confidence = Math.max(prev.confidence, e.confidence);
		} else out.push({ ...e });
	}
	return out;
}
function spikesForTrack(events, trackId) {
	const times = events.filter((e) => e.trackId === trackId && (e.type === "spike" || e.type === "sharp" || e.type === "qrs")).map((e) => e.start);
	return Float32Array.from(times);
}
var BAND_COLORS = {
	delta: "#5b8def",
	theta: "#4ec4c0",
	alpha: "#7dce8a",
	beta: "#e0b070",
	gamma: "#e07a7a"
};
var BAND_LABELS = [
	{
		id: "delta",
		glyph: "Δ",
		range: "<4"
	},
	{
		id: "theta",
		glyph: "θ",
		range: "4–8"
	},
	{
		id: "alpha",
		glyph: "α",
		range: "8–13"
	},
	{
		id: "beta",
		glyph: "β",
		range: "13–30"
	},
	{
		id: "gamma",
		glyph: "γ",
		range: ">30"
	}
];
function bandFromHz(hz) {
	if (hz < 4) return "delta";
	if (hz < 8) return "theta";
	if (hz < 13) return "alpha";
	if (hz < 30) return "beta";
	return "gamma";
}
/** Instantaneous frequency via zero-crossings in each display column. */
function freqWindow(samples, sampleRate, t0, t1, nPix) {
	const hz = new Float32Array(Math.max(0, nPix));
	if (samples.length === 0 || nPix <= 0 || t1 <= t0 || sampleRate <= 0) return hz;
	const span = t1 - t0;
	for (let p = 0; p < nPix; p++) {
		const a = t0 + p / nPix * span;
		const b = t0 + (p + 1) / nPix * span;
		let i0 = Math.max(0, Math.floor(a * sampleRate));
		let i1 = Math.min(samples.length, Math.floor(b * sampleRate));
		if (i1 <= i0) i1 = Math.min(samples.length, i0 + 1);
		let zc = 0;
		let prev = samples[i0] ?? 0;
		for (let i = i0 + 1; i < i1; i++) {
			const v = samples[i];
			if (prev <= 0 && v > 0) zc++;
			prev = v;
		}
		hz[p] = zc / Math.max(1e-6, (i1 - i0) / sampleRate);
	}
	return smoothHz(hz, 2);
}
function smoothHz(hz, k = 2) {
	const y = new Float32Array(hz.length);
	for (let i = 0; i < hz.length; i++) {
		let s = 0;
		let n = 0;
		for (let j = i - k; j <= i + k; j++) {
			if (j < 0 || j >= hz.length) continue;
			s += hz[j];
			n++;
		}
		y[i] = n ? s / n : 0;
	}
	return y;
}
function dominantHz(samples, fs, t, winSec = 1) {
	if (samples.length === 0 || fs <= 0) return 0;
	const i0 = Math.max(0, Math.floor((t - winSec / 2) * fs));
	const i1 = Math.min(samples.length, Math.floor((t + winSec / 2) * fs));
	if (i1 - i0 < 8) return 0;
	let zc = 0;
	let prev = samples[i0] ?? 0;
	for (let i = i0 + 1; i < i1; i++) {
		const v = samples[i];
		if (prev <= 0 && v > 0) zc++;
		prev = v;
	}
	return zc / Math.max(1e-6, (i1 - i0) / fs);
}
function rmsAbs(samples, fs, t, winSec = .25) {
	if (samples.length === 0 || fs <= 0) return 0;
	const i0 = Math.max(0, Math.floor((t - winSec / 2) * fs));
	const i1 = Math.min(samples.length, Math.floor((t + winSec / 2) * fs));
	if (i1 <= i0) return 0;
	let s = 0;
	for (let i = i0; i < i1; i++) s += samples[i] * samples[i];
	return Math.sqrt(s / (i1 - i0));
}
function bitReverseFft(re, im) {
	const n = re.length;
	for (let i = 1, j = 0; i < n; i++) {
		let bit = n >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			const tr = re[i];
			re[i] = re[j];
			re[j] = tr;
			const ti = im[i];
			im[i] = im[j];
			im[j] = ti;
		}
	}
	for (let len = 2; len <= n; len <<= 1) {
		const ang = -2 * Math.PI / len;
		const wlenRe = Math.cos(ang);
		const wlenIm = Math.sin(ang);
		const half = len >> 1;
		for (let i = 0; i < n; i += len) {
			let wRe = 1;
			let wIm = 0;
			for (let j = 0; j < half; j++) {
				const ur = re[i + j];
				const ui = im[i + j];
				const vr = re[i + j + half] * wRe - im[i + j + half] * wIm;
				const vi = re[i + j + half] * wIm + im[i + j + half] * wRe;
				re[i + j] = ur + vr;
				im[i + j] = ui + vi;
				re[i + j + half] = ur - vr;
				im[i + j + half] = ui - vi;
				const nRe = wRe * wlenRe - wIm * wlenIm;
				wIm = wRe * wlenIm + wIm * wlenRe;
				wRe = nRe;
			}
		}
	}
}
function hann(n, i) {
	return .5 - .5 * Math.cos(2 * Math.PI * i / Math.max(1, n - 1));
}
function fftPower(frame) {
	const n = frame.length;
	const re = new Float32Array(n);
	const im = new Float32Array(n);
	for (let i = 0; i < n; i++) re[i] = frame[i];
	bitReverseFft(re, im);
	const half = n >> 1;
	const mag = new Float32Array(half);
	for (let k = 0; k < half; k++) mag[k] = re[k] * re[k] + im[k] * im[k];
	return mag;
}
function spectrogram(x, fs, win = 256, hop = 64, fMax = 30) {
	const nFreq = Math.max(2, Math.floor(fMax * win / fs) + 1);
	const nTime = Math.max(1, Math.round((x.length - win) / hop) + 1);
	const out = new Float32Array(nTime * nFreq);
	const frame = new Float32Array(win);
	for (let t = 0; t < nTime; t++) {
		const i0 = t * hop;
		for (let i = 0; i < win; i++) frame[i] = (x[i0 + i] ?? 0) * hann(win, i);
		const mag = fftPower(frame);
		for (let f = 0; f < nFreq; f++) out[t * nFreq + f] = mag[f] ?? 0;
	}
	return out;
}
function meanPowerSpec(tracks, side, win, hop, fMax) {
	const list = tracks.filter((t) => {
		if (t.kind !== "eeg" || !t.samples.length) return false;
		if (side === "all") return true;
		return t.laterality === side;
	});
	if (list.length === 0) return null;
	const fs = list[0].sampleRate;
	const nFreq = Math.max(2, Math.floor(fMax * win / fs) + 1);
	let acc = null;
	let nTime = 1;
	for (const t of list) {
		const spec = spectrogram(t.samples, t.sampleRate, win, hop, fMax);
		nTime = Math.max(1, Math.round((t.samples.length - win) / hop) + 1);
		if (!acc) acc = spec;
		else {
			const m = Math.min(acc.length, spec.length);
			for (let i = 0; i < m; i++) acc[i] += spec[i];
		}
	}
	const n = list.length;
	if (acc && n > 1) for (let i = 0; i < acc.length; i++) acc[i] /= n;
	return acc ? {
		spec: acc,
		nTime,
		nFreq,
		fs
	} : null;
}
function logMaxOf(a, b) {
	let m = 1e-18;
	const step = Math.max(1, Math.floor((a.length + b.length) / 4e3));
	const samples = [];
	for (let i = 0; i < a.length; i += step) if (a[i] > 0) samples.push(a[i]);
	for (let i = 0; i < b.length; i += step) if (b[i] > 0) samples.push(b[i]);
	if (samples.length === 0) return 0;
	samples.sort((x, y) => x - y);
	m = samples[Math.min(samples.length - 1, Math.floor(samples.length * .96))] ?? m;
	return Math.log10(m + 1e-12);
}
function buildDsa(tracks, duration) {
	const eeg = tracks.filter((t) => t.kind === "eeg" && t.samples.length);
	if (eeg.length === 0) return null;
	const fs = eeg[0].sampleRate;
	const win = 256;
	let hop = 64;
	const fMax = 30;
	if (Math.max(1, Math.round((eeg[0].samples.length - win) / hop) + 1) > 1400) hop = Math.max(64, Math.ceil((eeg[0].samples.length - win) / 1399));
	let left = meanPowerSpec(eeg, "left", win, hop, fMax);
	let right = meanPowerSpec(eeg, "right", win, hop, fMax);
	if (!left && !right) {
		const all = meanPowerSpec(eeg, "all", win, hop, fMax);
		if (!all) return null;
		left = all;
		right = all;
	}
	if (!left) left = right;
	if (!right) right = left;
	return {
		l: left.spec,
		r: right.spec,
		nTime: left.nTime,
		nFreq: left.nFreq,
		fMax,
		duration,
		sampleRate: fs,
		logMax: logMaxOf(left.spec, right.spec)
	};
}
function dsaColumn(frame, t, side) {
	const col = new Float32Array(frame.nFreq);
	if (frame.duration <= 0 || frame.nTime <= 0) return col;
	const i = Math.max(0, Math.min(frame.nTime - 1, Math.floor(t / frame.duration * frame.nTime)));
	const src = side === "l" ? frame.l : frame.r;
	col.set(src.subarray(i * frame.nFreq, i * frame.nFreq + frame.nFreq));
	return col;
}
function bandPowersFromColumn(col, fMax) {
	const n = col.length;
	const hzPerBin = fMax / Math.max(1, n - 1);
	let delta = 0;
	let theta = 0;
	let alpha = 0;
	let beta = 0;
	let gamma = 0;
	let peak = 0;
	let peakHz = 0;
	let total = 0;
	for (let i = 1; i < n; i++) {
		const p = col[i];
		const hz = i * hzPerBin;
		total += p;
		if (p > peak) {
			peak = p;
			peakHz = hz;
		}
		if (hz < 4) delta += p;
		else if (hz < 8) theta += p;
		else if (hz < 13) alpha += p;
		else if (hz < 30) beta += p;
		else gamma += p;
	}
	const s = Math.max(1e-12, total);
	return {
		delta: delta / s,
		theta: theta / s,
		alpha: alpha / s,
		beta: beta / s,
		gamma: gamma / s,
		peakHz,
		total
	};
}
/** Classic DSA ramp: black → teal → gold → white. `u` is 0–1 log power. */
function dsaRgb(u) {
	const x = Math.max(0, Math.min(1, u));
	if (x < .33) {
		const t = x / .33;
		return [
			8 + t * 20,
			16 + t * 110,
			24 + t * 90
		];
	}
	if (x < .66) {
		const t = (x - .33) / .33;
		return [
			28 + t * 180,
			126 + t * 70,
			114 - t * 40
		];
	}
	const t = (x - .66) / .34;
	return [
		208 + t * 36,
		196 + t * 40,
		74 + t * 160
	];
}
function dsaUnit(p, logMax) {
	const u = Math.log10(p + 1e-12) / Math.max(1e-6, logMax);
	const x = Math.max(0, Math.min(1, (u + .12) / 1.12));
	return Math.pow(x, .7);
}
function readoutAt(tracks, t, dsa) {
	const eeg = tracks.filter((tr) => tr.kind === "eeg" && tr.samples.length);
	let hz = 0;
	let uv = 0;
	let n = 0;
	for (const tr of eeg) {
		hz += dominantHz(tr.samples, tr.sampleRate, t, 1);
		uv += rmsAbs(tr.samples, tr.sampleRate, t, .25);
		n++;
	}
	const nSafe = Math.max(1, n);
	hz /= nSafe;
	uv /= nSafe;
	return {
		hz,
		band: bandFromHz(hz),
		uv,
		l: dsa ? bandPowersFromColumn(dsaColumn(dsa, t, "l"), dsa.fMax) : null,
		r: dsa ? bandPowersFromColumn(dsaColumn(dsa, t, "r"), dsa.fMax) : null
	};
}
function defaultTrack(id, kind) {
	return {
		id,
		mute: kind === "extra",
		solo: false,
		gain: kind === "ekg" ? 1.15 : kind === "eog" ? 1.05 : 1,
		lateralityOverride: null
	};
}
function syncTracks(derivations, prev) {
	const next = {};
	for (const d of derivations.filter((x) => x.available)) next[d.id] = prev[d.id] ?? defaultTrack(d.id, d.kind);
	return next;
}
var wavUrlLocal = null;
function revoke() {
	if (wavUrlLocal) URL.revokeObjectURL(wavUrlLocal);
	wavUrlLocal = null;
}
function stubMix(eegDuration, timeScale) {
	const dur = eegDuration / Math.max(.25, timeScale);
	return {
		left: /* @__PURE__ */ new Float32Array(0),
		right: /* @__PURE__ */ new Float32Array(0),
		sampleRate: 44100,
		duration: dur,
		eegDuration,
		compressionUsed: timeScale,
		peak: 0,
		clipped: false
	};
}
function nid() {
	return `ann-${Math.random().toString(36).slice(2, 10)}`;
}
function eegNow(state) {
	const s = state ?? useEegStore.getState();
	if (!s.segment) return 0;
	if (playback.duration() <= 0) return s.playheadEeg;
	return playback.currentTime();
}
var useEegStore = create((set, get) => {
	const liveViewCommit = () => {
		const { segment, viewDuration, followPlayhead } = get();
		if (!segment || !followPlayhead) return;
		const t = eegNow(get());
		set({
			viewStart: followViewStart(t, viewDuration, segment.duration),
			playheadEeg: t
		});
	};
	const pushEngine = () => {
		const { segment, tracks, combine, sonify, negativeUp, annotations } = get();
		if (!segment) {
			playback.setControlTracks([], 0);
			set({
				mix: null,
				busy: false
			});
			return;
		}
		const spikes = {};
		for (const tr of segment.tracks) spikes[tr.id] = spikesForTrack(annotations, tr.id);
		const controls = controlTracksFrom(segment.tracks, tracks, combine, spikes);
		playback.setControlTracks(controls, segment.duration);
		playback.setSettings(sonify, negativeUp);
		const ts = sonify.mode === "direct" ? sonify.compression : sonify.timeScale;
		set({
			mix: stubMix(segment.duration, ts),
			busy: false
		});
	};
	const liveParams = () => {
		const { segment, tracks, combine } = get();
		if (!segment) return;
		playback.applyParams(segment.tracks.map((p) => {
			const st = tracks[p.id];
			const lat = st?.lateralityOverride ?? p.laterality;
			return {
				id: p.id,
				pan: combine === "average" ? 0 : panForLaterality(lat),
				gain: st?.gain ?? 1,
				mute: Boolean(st?.mute),
				solo: Boolean(st?.solo)
			};
		}));
	};
	const rebuildSession = () => {
		const { recording, derivations, filters, viewStart, viewDuration } = get();
		if (!recording) return;
		const total = recording.header.duration;
		const seg = processSegment(recording, 0, total, derivations, filters);
		const view = clampView(viewStart, viewDuration || Math.min(10, total), seg.duration);
		const auto = detectMorphologies(seg.tracks);
		const fromFile = recording.annotations.map((a) => ({
			id: nid(),
			start: a.onset,
			end: a.onset + (a.duration ?? 0),
			trackId: null,
			type: "comment",
			text: a.text,
			source: "file",
			confidence: 1
		}));
		const keepUser = get().annotations.filter((x) => x.source === "user");
		set({
			segment: seg,
			playheadEeg: Math.min(get().playheadEeg, seg.duration),
			viewStart: view.start,
			viewDuration: view.duration,
			annotations: [
				...keepUser,
				...fromFile,
				...auto
			],
			dsa: buildDsa(seg.tracks, seg.duration)
		});
		pushEngine();
	};
	return {
		status: "idle",
		error: null,
		recording: null,
		montage: "double-banana",
		customPairs: [],
		customA: "Fp1",
		customB: "O1",
		derivations: [],
		tracks: {},
		filters: { ...DEFAULT_FILTERS },
		sonify: { ...DEFAULT_SONIFY },
		combine: "stereo",
		negativeUp: true,
		sensitivityUv: 150,
		segment: null,
		mix: null,
		wavUrl: null,
		playing: false,
		loop: false,
		playheadEeg: 0,
		viewStart: 0,
		viewDuration: 10,
		followPlayhead: true,
		busy: false,
		aboutOpen: false,
		keysOpen: false,
		annotations: [],
		selectedAnnotation: null,
		showAuto: true,
		showAnnotations: true,
		tool: "pointer",
		pendingType: "comment",
		colorBy: "band",
		showDsa: true,
		dsa: null,
		loadFile: async (file, name) => {
			set({
				status: "loading",
				error: null,
				playing: false,
				busy: true,
				annotations: [],
				dsa: null
			});
			playback.stop();
			await new Promise((r) => setTimeout(r, 16));
			try {
				const recording = await loadRecording(file, name);
				const banana = derivationsFor(recording, "double-banana", []);
				const montage = banana.filter((d) => d.available).length >= 4 ? "double-banana" : "original";
				const derivations = montage === "double-banana" ? banana : derivationsFor(recording, "original", []);
				if (derivations.filter((d) => d.available).length === 0) throw new Error("No EEG channels could be read from this file.");
				const total = recording.header.duration;
				set({
					recording,
					montage,
					derivations,
					tracks: syncTracks(derivations, {}),
					viewStart: 0,
					viewDuration: Math.min(10, total),
					playheadEeg: 0,
					followPlayhead: true,
					status: "ready",
					busy: true
				});
				await new Promise((r) => setTimeout(r, 10));
				rebuildSession();
			} catch (err) {
				set({
					status: "error",
					busy: false,
					error: err instanceof Error ? err.message : "Could not read this EDF file."
				});
			}
		},
		setMontage: (m) => {
			const { recording, customPairs, tracks } = get();
			if (!recording) return;
			const derivations = derivationsFor(recording, m, customPairs);
			set({
				montage: m,
				derivations,
				tracks: syncTracks(derivations, tracks),
				busy: true
			});
			rebuildSession();
		},
		setFilters: (p) => {
			set({
				filters: {
					...get().filters,
					...p
				},
				busy: true
			});
			rebuildSession();
		},
		setSonify: (p) => {
			const next = {
				...get().sonify,
				...p
			};
			set({ sonify: next });
			playback.setSettings(next, get().negativeUp);
			const { segment } = get();
			if (segment) {
				const ts = next.mode === "direct" ? next.compression : next.timeScale;
				set({ mix: stubMix(segment.duration, ts) });
			}
		},
		setCombine: (c) => {
			set({ combine: c });
			liveParams();
		},
		toggleMute: (id) => {
			const t = get().tracks[id];
			if (!t) return;
			set({ tracks: {
				...get().tracks,
				[id]: {
					...t,
					mute: !t.mute
				}
			} });
			liveParams();
		},
		toggleSolo: (id) => {
			const t = get().tracks[id];
			if (!t) return;
			set({ tracks: {
				...get().tracks,
				[id]: {
					...t,
					solo: !t.solo
				}
			} });
			liveParams();
		},
		soloExclusive: (id) => {
			const tracks = { ...get().tracks };
			for (const k of Object.keys(tracks)) {
				const t = tracks[k];
				tracks[k] = {
					...t,
					solo: t.id === id
				};
			}
			set({ tracks });
			liveParams();
		},
		clearSolos: () => {
			const tracks = { ...get().tracks };
			for (const k of Object.keys(tracks)) tracks[k] = {
				...tracks[k],
				solo: false
			};
			set({ tracks });
			liveParams();
		},
		soloHemi: (side) => {
			const { segment } = get();
			const tracks = { ...get().tracks };
			for (const tr of segment?.tracks ?? []) {
				const st = tracks[tr.id];
				if (!st) continue;
				const lat = st.lateralityOverride ?? tr.laterality;
				tracks[tr.id] = {
					...st,
					solo: lat === side
				};
			}
			set({ tracks });
			liveParams();
		},
		unmuteAll: () => {
			const tracks = { ...get().tracks };
			for (const k of Object.keys(tracks)) tracks[k] = {
				...tracks[k],
				mute: false,
				solo: false
			};
			set({ tracks });
			liveParams();
		},
		setGain: (id, gain) => {
			const t = get().tracks[id];
			if (!t) return;
			set({ tracks: {
				...get().tracks,
				[id]: {
					...t,
					gain
				}
			} });
			liveParams();
		},
		setLaterality: (id, lat) => {
			const t = get().tracks[id];
			if (!t) return;
			set({ tracks: {
				...get().tracks,
				[id]: {
					...t,
					lateralityOverride: lat
				}
			} });
			liveParams();
		},
		addCustomPair: () => {
			const { customA, customB, customPairs, recording, tracks } = get();
			if (!customA || !customB || customA === customB) return;
			const next = [...customPairs, [customA, customB]];
			if (!recording) {
				set({
					customPairs: next,
					montage: "custom"
				});
				return;
			}
			const derivations = derivationsFor(recording, "custom", next);
			set({
				customPairs: next,
				montage: "custom",
				derivations,
				tracks: syncTracks(derivations, tracks),
				busy: true
			});
			rebuildSession();
		},
		removeCustomPair: (i) => {
			const next = get().customPairs.filter((_, idx) => idx !== i);
			const { recording, tracks } = get();
			if (!recording) {
				set({ customPairs: next });
				return;
			}
			const derivations = derivationsFor(recording, "custom", next);
			set({
				customPairs: next,
				derivations,
				tracks: syncTracks(derivations, tracks),
				busy: true
			});
			rebuildSession();
		},
		setCustomAB: (a, b) => set({
			customA: a,
			customB: b
		}),
		setSensitivity: (n) => set({ sensitivityUv: n }),
		setNegativeUp: (v) => {
			set({ negativeUp: v });
			playback.setSettings(get().sonify, v);
		},
		setAboutOpen: (v) => set({ aboutOpen: v }),
		setKeysOpen: (v) => set({ keysOpen: v }),
		setColorBy: (m) => set({ colorBy: m }),
		setShowDsa: (v) => set({ showDsa: v }),
		seekEeg: (t) => {
			const { segment } = get();
			if (!segment) {
				set({ playheadEeg: t });
				return;
			}
			const tt = Math.max(0, Math.min(segment.duration, t));
			playback.seek(tt);
			set({
				playheadEeg: tt,
				playing: playback.playing
			});
		},
		togglePlay: async () => {
			if (playback.duration() <= 0) return;
			if (playback.playing) {
				playback.pause();
				liveViewCommit();
				set({
					playing: false,
					playheadEeg: eegNow(get())
				});
				return;
			}
			playback.onEnded = () => {
				if (!playback.loop) set({
					playing: false,
					playheadEeg: 0,
					viewStart: get().followPlayhead ? 0 : get().viewStart
				});
			};
			await playback.play();
			set({ playing: true });
		},
		stop: () => {
			playback.stop();
			const { segment, viewDuration, followPlayhead } = get();
			const total = segment?.duration ?? 0;
			set({
				playing: false,
				playheadEeg: 0,
				viewStart: (followPlayhead ? clampView(0, viewDuration, total) : {
					start: get().viewStart,
					duration: viewDuration
				}).start
			});
		},
		setLoop: (v) => {
			playback.setLoop(v);
			set({ loop: v });
		},
		download: () => {
			const mix = playback.bounceWav(get().negativeUp);
			if (!mix || mix.left.length === 0) return;
			revoke();
			const blob = encodeWav(mix, 16);
			const url = URL.createObjectURL(blob);
			wavUrlLocal = url;
			set({ wavUrl: url });
			const a = document.createElement("a");
			a.href = url;
			a.download = "auris-sonify.wav";
			a.click();
		},
		zoomAt: (factor, anchor) => {
			const { segment, viewStart, viewDuration, followPlayhead } = get();
			if (!segment) return;
			const t = eegNow(get());
			const a = anchor ?? t;
			let next = zoomView(viewStart, viewDuration, segment.duration, factor, a);
			if (followPlayhead) next = clampView(followViewStart(t, next.duration, segment.duration), next.duration, segment.duration);
			set({
				viewStart: next.start,
				viewDuration: next.duration
			});
		},
		setViewDuration: (d) => {
			const { segment, followPlayhead } = get();
			if (!segment) return;
			const t = eegNow(get());
			const next = clampView(followPlayhead ? followViewStart(t, d, segment.duration) : get().viewStart, d, segment.duration);
			set({
				viewStart: next.start,
				viewDuration: next.duration
			});
		},
		setView: (start, duration, opts) => {
			const { segment } = get();
			if (!segment) return;
			const next = clampView(start, duration, segment.duration);
			set({
				viewStart: next.start,
				viewDuration: next.duration,
				followPlayhead: opts?.follow ?? false
			});
		},
		panView: (deltaSec) => {
			const { segment, viewStart, viewDuration } = get();
			if (!segment) return;
			set({
				viewStart: clampView(viewStart + deltaSec, viewDuration, segment.duration).start,
				followPlayhead: false
			});
		},
		setFollow: (v) => {
			const { segment, viewDuration } = get();
			if (v && segment) set({
				followPlayhead: true,
				viewStart: followViewStart(eegNow(get()), viewDuration, segment.duration)
			});
			else {
				liveViewCommit();
				set({ followPlayhead: false });
			}
		},
		nudge: (deltaSec) => {
			const { segment } = get();
			if (!segment) return;
			const t = Math.max(0, Math.min(segment.duration, eegNow(get()) + deltaSec));
			get().seekEeg(t);
		},
		page: (dir) => {
			const { segment, viewStart, viewDuration } = get();
			if (!segment) return;
			const next = clampView(viewStart + dir * viewDuration, viewDuration, segment.duration);
			set({
				viewStart: next.start,
				followPlayhead: false
			});
			get().seekEeg(next.start);
		},
		addAnnotation: (a) => {
			const item = {
				...a,
				id: nid()
			};
			set({
				annotations: [...get().annotations, item],
				selectedAnnotation: item.id,
				tool: "pointer"
			});
		},
		removeAnnotation: (id) => {
			set({
				annotations: get().annotations.filter((x) => x.id !== id),
				selectedAnnotation: get().selectedAnnotation === id ? null : get().selectedAnnotation
			});
		},
		selectAnnotation: (id) => {
			set({ selectedAnnotation: id });
			const a = get().annotations.find((x) => x.id === id);
			if (a) get().seekEeg(a.start);
		},
		setShowAuto: (v) => set({ showAuto: v }),
		setShowAnnotations: (v) => set({ showAnnotations: v }),
		setTool: (t) => set({ tool: t }),
		setPendingType: (t) => set({ pendingType: t }),
		exportAnnotations: () => {
			const data = get().annotations.map((a) => ({
				start: a.start,
				end: a.end,
				type: a.type,
				text: a.text,
				track: a.trackId,
				source: a.source
			}));
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "auris-annotations.json";
			a.click();
			URL.revokeObjectURL(url);
		}
	};
});
function currentRepro(state) {
	if (!state.recording || !state.segment) return null;
	const processed = state.segment.tracks;
	const audible = [...audibleIds(Object.values(state.tracks))];
	return buildRepro({
		file: state.recording.name,
		montage: state.montage,
		labels: processed.map((t) => t.label),
		start: state.segment.start,
		duration: state.segment.duration,
		filters: state.filters,
		settings: state.sonify,
		combine: state.combine,
		audible: processed.filter((t) => audible.includes(t.id)).map((t) => t.label)
	});
}
var KIND_LABEL = {
	eeg: "EEG",
	ekg: "EKG",
	eog: "Lids",
	emg: "EMG",
	extra: "Extra",
	dc: "DC",
	other: "Other"
};
function kindOf(tr) {
	return tr.kind ?? "eeg";
}
function MixerStrip() {
	const segment = useEegStore((s) => s.segment);
	const tracks = useEegStore((s) => s.tracks);
	const toggleMute = useEegStore((s) => s.toggleMute);
	const toggleSolo = useEegStore((s) => s.toggleSolo);
	const soloExclusive = useEegStore((s) => s.soloExclusive);
	const clearSolos = useEegStore((s) => s.clearSolos);
	const unmuteAll = useEegStore((s) => s.unmuteAll);
	const soloHemi = useEegStore((s) => s.soloHemi);
	const setGain = useEegStore((s) => s.setGain);
	const list = segment?.tracks ?? [];
	if (list.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-xs text-subtle",
		children: "Load a recording to get per-track mute, solo, and gain."
	});
	const groups = [];
	for (const kind of [
		"eeg",
		"eog",
		"ekg",
		"emg",
		"extra"
	]) {
		const rows = list.filter((t) => kindOf(t) === kind);
		if (rows.length) groups.push({
			kind,
			rows
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-1",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "secondary",
					onClick: () => soloHemi("left"),
					children: "Solo L"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "secondary",
					onClick: () => soloHemi("right"),
					children: "Solo R"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "ghost",
					onClick: clearSolos,
					children: "Clear solos"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "ghost",
					onClick: unmuteAll,
					children: "Unmute all"
				})
			]
		}), groups.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[0.625rem] font-medium uppercase tracking-wider text-subtle",
				children: KIND_LABEL[g.kind]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-0.5",
				children: g.rows.map((tr) => {
					const st = tracks[tr.id];
					const muted = Boolean(st?.mute);
					const solo = Boolean(st?.solo);
					const lat = st?.lateralityOverride ?? tr.laterality;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: cn("flex items-center gap-1 rounded-sm px-1 py-0.5", muted && "opacity-50", solo && "bg-ok/10"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								title: "Solo (multiple allowed). Double-click = exclusive.",
								onClick: () => toggleSolo(tr.id),
								onDoubleClick: () => soloExclusive(tr.id),
								className: cn("h-6 min-w-7 rounded-sm px-1.5 text-[0.625rem] font-semibold tracking-wide", solo ? "bg-ok text-bg" : "bg-bg text-subtle shadow-border hover:text-fg"),
								children: "S"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								title: muted ? "Unmute" : "Mute",
								onClick: () => toggleMute(tr.id),
								className: cn("h-6 min-w-7 rounded-sm px-1.5 text-[0.625rem] font-semibold tracking-wide", muted ? "bg-danger text-bg" : "bg-bg text-subtle shadow-border hover:text-fg"),
								children: "M"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "min-w-0 flex-1 truncate font-mono text-[0.6875rem] text-fg",
								children: tr.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cn("w-3 shrink-0 text-center text-[0.625rem] uppercase", lat === "left" && "text-hemi-l", lat === "right" && "text-hemi-r", (lat === "midline" || lat === "unknown") && "text-subtle"),
								children: latLetter(lat)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: 0,
								max: 2,
								step: .05,
								value: typeof st?.gain === "number" ? st.gain : 1,
								onChange: (e) => setGain(tr.id, Number(e.target.value)),
								className: "h-1 w-14 shrink-0 cursor-pointer accent-accent",
								"aria-label": `${tr.label} gain`
							})
						]
					}, tr.id);
				})
			})]
		}, g.kind))]
	});
}
function latLetter(lat) {
	if (lat === "left") return "L";
	if (lat === "right") return "R";
	if (lat === "midline") return "C";
	return "—";
}
function EventList() {
	const annotations = useEegStore((s) => s.annotations);
	const selected = useEegStore((s) => s.selectedAnnotation);
	const showAuto = useEegStore((s) => s.showAuto);
	const setShowAuto = useEegStore((s) => s.setShowAuto);
	const showAnnotations = useEegStore((s) => s.showAnnotations);
	const setShowAnnotations = useEegStore((s) => s.setShowAnnotations);
	const selectAnnotation = useEegStore((s) => s.selectAnnotation);
	const removeAnnotation = useEegStore((s) => s.removeAnnotation);
	const pendingType = useEegStore((s) => s.pendingType);
	const setPendingType = useEegStore((s) => s.setPendingType);
	const setTool = useEegStore((s) => s.setTool);
	const exportAnnotations = useEegStore((s) => s.exportAnnotations);
	const segment = useEegStore((s) => s.segment);
	const visible = annotations.filter((a) => showAuto || a.source === "user" || a.source === "file");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-pretty text-xs text-muted",
				children: "Suggested waveforms are educational markers, not a diagnosis. Press A or use Annotate, then click the tracing."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-1",
				children: ANNOTATION_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						setPendingType(t.id);
						setTool("annotate");
					},
					className: "h-6 rounded-sm px-1.5 text-[0.625rem]",
					style: {
						background: pendingType === t.id ? MORPH_COLOR[t.id] : "var(--color-bg, #07080a)",
						color: pendingType === t.id ? "#111" : void 0
					},
					children: t.label
				}, t.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center justify-between text-xs text-muted",
				children: ["Show annotations", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: showAnnotations,
					onChange: (e) => setShowAnnotations(e.target.checked),
					className: "size-3.5 accent-accent"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center justify-between text-xs text-muted",
				children: ["Show suggested", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: showAuto,
					onChange: (e) => setShowAuto(e.target.checked),
					className: "size-3.5 accent-accent"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "max-h-48 space-y-0.5 overflow-auto",
				children: [visible.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "text-xs text-subtle",
					children: "No markers yet."
				}), visible.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => selectAnnotation(a.id),
					className: `flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-left text-[0.6875rem] ${selected === a.id ? "bg-surface-2" : "hover:bg-bg"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "size-2 shrink-0 rounded-full",
							style: { background: MORPH_COLOR[a.type] }
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-12 shrink-0 font-mono tabular-nums text-muted",
							children: formatTime(a.start)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1 truncate text-fg",
							children: [ANNOTATION_TYPES.find((t) => t.id === a.type)?.label ?? a.type, a.text ? ` · ${a.text}` : ""]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[0.625rem] uppercase text-subtle",
							children: a.source === "auto" ? "sug" : a.source
						})
					]
				}) }, a.id))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "secondary",
					onClick: exportAnnotations,
					disabled: !annotations.length,
					children: "Export JSON"
				}), selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "ghost",
					onClick: () => removeAnnotation(selected),
					children: "Delete"
				})]
			}),
			segment && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-[0.625rem] text-subtle",
				children: [visible.length, " markers on this recording."]
			})
		]
	});
}
var field = "h-8 w-full rounded-sm bg-bg px-2 text-sm text-fg shadow-border outline-none focus:ring-2 focus:ring-accent/50";
function ControlPanel() {
	const inputRef = (0, import_react.useRef)(null);
	const loadFile = useEegStore((s) => s.loadFile);
	const recording = useEegStore((s) => s.recording);
	const status = useEegStore((s) => s.status);
	const error = useEegStore((s) => s.error);
	const montage = useEegStore((s) => s.montage);
	const setMontage = useEegStore((s) => s.setMontage);
	const derivations = useEegStore((s) => s.derivations);
	const start = useEegStore((s) => s.viewStart);
	const duration = useEegStore((s) => s.viewDuration);
	const setViewDuration = useEegStore((s) => s.setViewDuration);
	const seekEeg = useEegStore((s) => s.seekEeg);
	const followPlayhead = useEegStore((s) => s.followPlayhead);
	const setFollow = useEegStore((s) => s.setFollow);
	const filters = useEegStore((s) => s.filters);
	const setFilters = useEegStore((s) => s.setFilters);
	const sonify = useEegStore((s) => s.sonify);
	const setSonify = useEegStore((s) => s.setSonify);
	const negativeUp = useEegStore((s) => s.negativeUp);
	const setNegativeUp = useEegStore((s) => s.setNegativeUp);
	const sensitivityUv = useEegStore((s) => s.sensitivityUv);
	const setSensitivity = useEegStore((s) => s.setSensitivity);
	const customA = useEegStore((s) => s.customA);
	const customB = useEegStore((s) => s.customB);
	const customPairs = useEegStore((s) => s.customPairs);
	const setCustomAB = useEegStore((s) => s.setCustomAB);
	const addCustomPair = useEegStore((s) => s.addCustomPair);
	const removeCustomPair = useEegStore((s) => s.removeCustomPair);
	const state = useEegStore();
	const onFiles = (files) => {
		const f = files?.[0];
		if (f) loadFile(f, f.name);
	};
	const rates = recording ? sampleRateSummary(recording.header) : null;
	const available = derivations.filter((d) => d.available);
	const missing = derivations.filter((d) => !d.available);
	const repro = currentRepro(state);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "flex h-full min-h-0 w-full flex-col overflow-y-auto bg-surface",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.6875rem] font-medium uppercase tracking-wider text-subtle",
						children: "File"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 font-display text-lg tracking-tight text-fg",
						children: "Recording"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: inputRef,
						type: "file",
						accept: ".edf,.EDF",
						className: "sr-only",
						onChange: (e) => onFiles(e.target.files)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						onDragOver: (e) => e.preventDefault(),
						onDrop: (e) => {
							e.preventDefault();
							onFiles(e.dataTransfer.files);
						},
						className: "rounded-lg bg-bg p-3 shadow-border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-pretty text-muted",
							children: "Drop a deidentified EDF/EDF+ file. Nothing is uploaded."
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								onClick: () => inputRef.current?.click(),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {}), " Open EDF"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "secondary",
								onClick: async () => {
									const res = await fetch("/sample.edf");
									if (!res.ok) return;
									const buf = await res.arrayBuffer();
									await loadFile(buf, "demo-deidentified.edf");
								},
								children: "Load demo"
							})]
						})]
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}),
					recording && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-subtle",
								children: "Duration"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
								className: "tabular-nums text-fg",
								children: [recording.header.duration.toFixed(1), " s"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-subtle",
								children: "Rate"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
								className: "tabular-nums text-fg",
								children: [
									rates?.primary ?? "—",
									" Hz",
									rates?.mixed ? " mixed" : ""
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-subtle",
								children: "Signals"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "tabular-nums text-fg",
								children: recording.header.signals.length
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-subtle",
								children: "Format"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "text-fg",
								children: recording.header.isEdfPlus ? "EDF+" : "EDF"
							})
						]
					}),
					recording?.header.identifierWarning && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-pretty text-warn",
						children: "Header text may still contain identifiers. Patient fields are hidden here — confirm deidentification before sharing."
					}),
					recording && recording.annotations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [recording.annotations.length, " annotations in file (not interpreted)."]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.6875rem] font-medium uppercase tracking-wider text-subtle",
						children: "Montage"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-2 gap-1.5",
						children: [
							["original", "Referential"],
							["double-banana", "Double banana"],
							["transverse", "Transverse"],
							["custom", "Custom"]
						].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setMontage(id),
							className: `h-8 rounded-sm px-2 text-left text-xs ${montage === id ? "bg-accent text-accent-fg" : "bg-bg text-fg/80 shadow-border hover:text-fg"}`,
							children: label
						}, id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							available.length,
							" derivations ready",
							missing.length > 0 ? ` · ${missing.length} skipped (missing electrodes)` : ""
						]
					}),
					missing.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[0.6875rem] text-pretty text-subtle",
						children: ["Cannot form: ", missing.map((m) => m.label).join(", ")]
					}),
					montage === "custom" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									className: field,
									value: customA,
									onChange: (e) => setCustomAB(e.target.value, customB),
									children: STANDARD_ELECTRODES.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: e }, e))
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									className: field,
									value: customB,
									onChange: (e) => setCustomAB(customA, e.target.value),
									children: STANDARD_ELECTRODES.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: e }, e))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "secondary",
								onClick: addCustomPair,
								children: "Add pair"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "space-y-1",
								children: customPairs.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex items-center justify-between text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono",
										children: [
											p[0],
											"–",
											p[1]
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "text-subtle hover:text-danger",
										onClick: () => removeCustomPair(i),
										children: "Remove"
									})]
								}, `${p[0]}-${p[1]}-${i}`))
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.6875rem] font-medium uppercase tracking-wider text-subtle",
						children: "Mixer"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-pretty text-xs text-muted",
						children: "S = solo (several at once). M = mute. Double-click S for exclusive solo. Lids and EKG sit under the EEG chains."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MixerStrip, {})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[0.6875rem] font-medium uppercase tracking-wider text-subtle",
					children: "Events"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventList, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.6875rem] font-medium uppercase tracking-wider text-subtle",
						children: "View"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-pretty text-xs text-muted",
						children: "The overview is the whole recording. This window is what the editor shows — zoom and follow like a DAW."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center justify-between gap-2 text-sm text-fg",
						children: ["Follow playhead", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: followPlayhead,
							onChange: (e) => setFollow(e.target.checked),
							className: "size-4 accent-accent"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "jump",
						children: "Jump to (s)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "jump",
						type: "number",
						min: 0,
						step: 1,
						defaultValue: 0,
						className: field,
						onBlur: (e) => seekEeg(Number(e.target.value) || 0),
						onKeyDown: (e) => {
							if (e.key === "Enter") seekEeg(Number(e.target.value) || 0);
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Window" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-1",
						children: [VIEW_PRESETS.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setViewDuration(d),
							className: `h-7 rounded-full px-2.5 text-xs tabular-nums ${Math.abs(duration - d) < .05 ? "bg-accent text-accent-fg" : "bg-bg text-muted shadow-border"}`,
							children: [d, "s"]
						}, d)), recording && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setViewDuration(recording.header.duration),
							className: `h-7 rounded-full px-2.5 text-xs ${duration >= recording.header.duration - .05 ? "bg-accent text-accent-fg" : "bg-bg text-muted shadow-border"}`,
							children: "All"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-[0.6875rem] tabular-nums text-subtle",
						children: [
							start.toFixed(1),
							"–",
							(start + duration).toFixed(1),
							" s"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Sensitivity" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-xs tabular-nums text-muted",
							children: [sensitivityUv, " µV/lane"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1",
						children: SENSITIVITY_PRESETS.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSensitivity(d),
							className: `h-7 rounded-full px-2 text-xs tabular-nums ${sensitivityUv === d ? "bg-accent text-accent-fg" : "bg-bg text-muted shadow-border"}`,
							children: d
						}, d))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center justify-between gap-2 text-sm text-fg",
						children: ["Negative up", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: negativeUp,
							onChange: (e) => setNegativeUp(e.target.checked),
							className: "size-4 accent-accent"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.6875rem] font-medium uppercase tracking-wider text-subtle",
						children: "Listen"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-pretty text-xs text-muted",
						children: "Contour: up on the graph raises pitch. Pen: analog paper scratch — fast deflections hiss, still baseline is quiet. Pulse: count the rhythm. Choir: just-intonation 1/f chord (delta–beta). Piano (experimental): a real scale while the field looks ordinary — spikes clang off-key. Direct is the raw wave."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center justify-between gap-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, { children: [
							"Volume ",
							Math.round((sonify.volume ?? 1.45) * 100),
							"%"
						] })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: .4,
						max: 2.2,
						step: .05,
						value: sonify.volume ?? 1.45,
						onChange: (e) => setSonify({ volume: Number(e.target.value) }),
						className: "w-full accent-accent"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Scale" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-2 gap-1.5",
						children: Object.keys(SCALE_LABELS).map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSonify({ scale: id }),
							className: `h-8 rounded-sm px-2 text-left text-xs ${sonify.scale === id ? "bg-accent text-accent-fg" : "bg-bg text-muted shadow-border"}`,
							children: SCALE_LABELS[id]
						}, id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Root" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1",
						children: ROOT_NOTES.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSonify({ rootMidi: n.midi }),
							className: `h-7 rounded-full px-2.5 text-xs ${sonify.rootMidi === n.midi ? "bg-accent text-accent-fg" : "bg-bg text-muted shadow-border"}`,
							children: n.label
						}, n.midi))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center justify-between text-sm",
						children: ["Snap to scale", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: sonify.quantize,
							onChange: (e) => setSonify({ quantize: e.target.checked }),
							className: "size-4 accent-accent"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, { children: [
						"Pitch range ±",
						sonify.rangeSemitones,
						" st"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: 4,
						max: 12,
						step: 1,
						value: sonify.rangeSemitones,
						onChange: (e) => setSonify({ rangeSemitones: Number(e.target.value) }),
						className: "w-full accent-accent"
					}),
					sonify.mode === "direct" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Time compression" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: COMPRESSION_PRESETS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSonify({ compression: c }),
								className: `h-7 rounded-full px-2.5 text-xs tabular-nums ${sonify.compression === c ? "bg-accent text-accent-fg" : "bg-bg text-muted shadow-border"}`,
								children: [c, "×"]
							}, c))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[0.6875rem] text-pretty text-subtle",
							children: describeMapping(sonify.compression)
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, { children: [
							"Time ",
							sonify.timeScale,
							"×"
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: TIME_SCALE_PRESETS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSonify({ timeScale: c }),
								className: `h-7 rounded-full px-2.5 text-xs tabular-nums ${sonify.timeScale === c ? "bg-accent text-accent-fg" : "bg-bg text-muted shadow-border"}`,
								children: [c, "×"]
							}, c))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[0.6875rem] text-pretty text-subtle",
							children: "1× is clinical time. Solo one chain to hear a single contour clearly."
						})
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.6875rem] font-medium uppercase tracking-wider text-subtle",
						children: "Filters"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-pretty text-muted",
						children: "LFF / HFF / Notch live on the review bar (Natus-style). DC is removed by default."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center justify-between text-sm",
						children: ["Remove DC", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: filters.removeDc,
							onChange: (e) => setFilters({ removeDc: e.target.checked }),
							className: "size-4 accent-accent"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-2 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.6875rem] font-medium uppercase tracking-wider text-subtle",
						children: "Reproducibility"
					}),
					repro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "overflow-x-auto whitespace-pre-wrap rounded-md bg-bg p-3 font-mono text-[0.6875rem] leading-relaxed text-muted",
						children: formatRepro(repro)
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-subtle",
						children: "Load a recording to capture settings."
					}),
					status === "ready" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: "accent",
						children: "Local only"
					})
				]
			})
		]
	});
}
function formatRepro(r) {
	return [
		`file: ${r.file}`,
		`montage: ${r.montage}`,
		`interval: ${r.interval}`,
		`channels: ${r.channels.join(", ")}`,
		`audible: ${r.audible.join(", ") || "(none)"}`,
		`filters: ${r.filters.join("; ")}`,
		`normalization: ${r.normalization}`,
		`method: ${r.method}`,
		`time map: ${r.compression}`,
		`carrier: ${r.carrier}`,
		`output: ${r.outputRate}`,
		`stereo: ${r.stereo}`
	].join("\n");
}
var BAND_KEYS = [
	"delta",
	"theta",
	"alpha",
	"beta",
	"gamma"
];
function Transport() {
	const playing = useEegStore((s) => s.playing);
	const loop = useEegStore((s) => s.loop);
	const follow = useEegStore((s) => s.followPlayhead);
	const mix = useEegStore((s) => s.mix);
	const segment = useEegStore((s) => s.segment);
	const togglePlay = useEegStore((s) => s.togglePlay);
	const stop = useEegStore((s) => s.stop);
	const setLoop = useEegStore((s) => s.setLoop);
	const download = useEegStore((s) => s.download);
	const zoomAt = useEegStore((s) => s.zoomAt);
	const setViewDuration = useEegStore((s) => s.setViewDuration);
	const setFollow = useEegStore((s) => s.setFollow);
	const setKeysOpen = useEegStore((s) => s.setKeysOpen);
	const viewDuration = useEegStore((s) => s.viewDuration);
	const sonify = useEegStore((s) => s.sonify);
	const eegRef = (0, import_react.useRef)(null);
	const audioRef = (0, import_react.useRef)(null);
	const hzRef = (0, import_react.useRef)(null);
	const uvRef = (0, import_react.useRef)(null);
	const bandRef = (0, import_react.useRef)(null);
	const barsRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const update = () => {
			const s = useEegStore.getState();
			const t = eegNow(s);
			if (eegRef.current) eegRef.current.textContent = formatTime(t, true);
			if (audioRef.current) audioRef.current.textContent = `${playback.currentTime().toFixed(2)}s`;
			if (!s.segment) return;
			const r = readoutAt(s.segment.tracks, t, s.dsa);
			if (hzRef.current) hzRef.current.textContent = r.hz > .2 ? r.hz.toFixed(1) : "—";
			if (uvRef.current) uvRef.current.textContent = r.uv.toFixed(0);
			if (bandRef.current) {
				bandRef.current.textContent = r.hz > .2 ? r.band : "—";
				bandRef.current.style.color = `var(--color-band-${r.band})`;
			}
			if (barsRef.current && r.l) barsRef.current.querySelectorAll("[data-band]").forEach((el) => {
				const id = el.getAttribute("data-band");
				if (!id) return;
				const v = ((r.l?.[id] ?? 0) + (r.r?.[id] ?? 0)) / 2;
				el.style.height = `${Math.round(Math.min(1, v * 2.2) * 100)}%`;
			});
		};
		update();
		if (!playing) return;
		let raf = 0;
		const loopFn = () => {
			update();
			raf = requestAnimationFrame(loopFn);
		};
		raf = requestAnimationFrame(loopFn);
		return () => cancelAnimationFrame(raf);
	}, [playing, segment]);
	const factor = timeScaleFor(sonify);
	const total = segment?.duration ?? 0;
	const showingAll = total > 0 && viewDuration >= total - 1e-6;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center gap-2 border-t border-border bg-surface px-3 py-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "secondary",
						"aria-label": playing ? "Pause" : "Play",
						onClick: () => void togglePlay(),
						disabled: !mix || mix.duration <= 0,
						children: playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "ml-px" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						"aria-label": "Stop",
						onClick: stop,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: loop ? "default" : "ghost",
						"aria-label": "Loop",
						onClick: () => setLoop(!loop),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: follow ? "default" : "ghost",
						"aria-label": "Follow playhead",
						title: "Follow playhead (F)",
						onClick: () => setFollow(!follow),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scan, {})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						"aria-label": "Zoom out",
						onClick: () => zoomAt(1.25),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoomOut, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						"aria-label": "Zoom in",
						onClick: () => zoomAt(1 / 1.25),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoomIn, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden items-center gap-1 md:flex",
						children: [VIEW_PRESETS.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setViewDuration(d),
							className: cn("h-7 rounded-full px-2 text-[0.6875rem] tabular-nums", Math.abs(viewDuration - d) < .05 ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface-2 hover:text-fg"),
							children: [d, "s"]
						}, d)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => total && setViewDuration(total),
							className: cn("h-7 rounded-full px-2 text-[0.6875rem]", showingAll ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface-2 hover:text-fg"),
							children: "All"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: barsRef,
				className: "hidden h-7 items-end gap-0.5 sm:flex",
				title: "Live band power at the playhead",
				children: BAND_KEYS.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					"data-band": id,
					className: "w-1.5 rounded-sm",
					style: {
						height: "20%",
						background: `var(--color-band-${id})`
					}
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hidden items-baseline gap-2 font-mono text-[0.6875rem] tabular-nums text-muted lg:flex",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						ref: hzRef,
						className: "text-fg",
						children: "—"
					}), " Hz"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						ref: bandRef,
						className: "uppercase",
						children: "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						ref: uvRef,
						className: "text-fg",
						children: "—"
					}), " µV"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden xl:inline text-subtle",
						children: BAND_LABELS.map((b) => b.glyph).join(" ")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "min-w-0 flex-1" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline gap-3 font-mono text-xs tabular-nums text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["EEG ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						ref: eegRef,
						className: "text-fg",
						children: formatTime(0, true)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "hidden sm:inline",
						children: ["window ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-fg",
							children: [viewDuration.toFixed(viewDuration < 10 ? 1 : 0), "s"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "hidden sm:inline",
						children: ["audio ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							ref: audioRef,
							className: "text-fg",
							children: [(mix?.duration ?? 0).toFixed(2), "s"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [factor, "×"] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "icon",
				variant: "ghost",
				"aria-label": "Keyboard shortcuts",
				onClick: () => setKeysOpen(true),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Keyboard, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				variant: "secondary",
				disabled: !segment,
				onClick: download,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), " WAV"]
			})
		]
	});
}
var LAT_COLOR = {
	left: "#6ec8d9",
	right: "#c4a574",
	midline: "#c8ccd4",
	unknown: "#8b919c"
};
var KIND_COLOR = {
	ekg: "#e07a7a",
	eog: "#d4b06a",
	emg: "#b8a3d4",
	extra: "#7a828c"
};
var GUTTER = 132;
var RULER = 18;
var OVERVIEW_H = 72;
var DSA_H = 72;
var EVENT_LANE = 18;
var BAND_ORDER = [
	"delta",
	"theta",
	"alpha",
	"beta",
	"gamma"
];
function sizeCanvas(canvas, cssW, cssH, dpr) {
	const w = Math.max(1, Math.floor(cssW * dpr));
	const h = Math.max(1, Math.floor(cssH * dpr));
	if (canvas.width !== w || canvas.height !== h) {
		canvas.width = w;
		canvas.height = h;
		canvas.style.width = `${cssW}px`;
		canvas.style.height = `${cssH}px`;
	}
}
function drawLane(ctx, min, max, x0, mid, scale, sign, color, alpha) {
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.1;
	ctx.lineJoin = "round";
	ctx.beginPath();
	for (let p = 0; p < min.length; p++) {
		const x = x0 + p + .5;
		const y = mid + sign * ((min[p] + max[p]) / 2) * scale;
		if (p === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();
	ctx.globalAlpha = alpha * .22;
	ctx.fillStyle = color;
	ctx.beginPath();
	for (let p = 0; p < min.length; p++) {
		const x = x0 + p + .5;
		const yHi = mid + sign * max[p] * scale;
		if (p === 0) ctx.moveTo(x, yHi);
		else ctx.lineTo(x, yHi);
	}
	for (let p = min.length - 1; p >= 0; p--) {
		const x = x0 + p + .5;
		ctx.lineTo(x, mid + sign * min[p] * scale);
	}
	ctx.closePath();
	ctx.fill();
	ctx.globalAlpha = 1;
}
function drawLaneBanded(ctx, min, max, hz, x0, mid, scale, sign, alpha) {
	ctx.lineJoin = "round";
	ctx.lineWidth = 1.15;
	for (const band of BAND_ORDER) {
		ctx.strokeStyle = BAND_COLORS[band];
		ctx.globalAlpha = alpha;
		ctx.beginPath();
		let drawing = false;
		for (let p = 0; p < min.length; p++) {
			if (bandFromHz(hz[p] ?? 0) !== band) {
				drawing = false;
				continue;
			}
			const x = x0 + p + .5;
			const y = mid + sign * ((min[p] + max[p]) / 2) * scale;
			if (!drawing) {
				ctx.moveTo(x, y);
				drawing = true;
			} else ctx.lineTo(x, y);
		}
		ctx.stroke();
	}
	ctx.globalAlpha = alpha * .16;
	ctx.beginPath();
	for (let p = 0; p < min.length; p++) {
		const x = x0 + p + .5;
		const yHi = mid + sign * max[p] * scale;
		if (p === 0) ctx.moveTo(x, yHi);
		else ctx.lineTo(x, yHi);
	}
	for (let p = min.length - 1; p >= 0; p--) ctx.lineTo(x0 + p + .5, mid + sign * min[p] * scale);
	ctx.closePath();
	ctx.fillStyle = "#c8ccd4";
	ctx.fill();
	ctx.globalAlpha = 1;
}
function formatTick(t, span) {
	if (span < 4) {
		const m = Math.floor(t / 60);
		return `${m}:${(t - m * 60).toFixed(1).padStart(4, "0")}`;
	}
	const m = Math.floor(t / 60);
	const s = Math.floor(t % 60);
	return `${m}:${String(s).padStart(2, "0")}`;
}
function niceStep(span) {
	if (span <= 2) return .2;
	if (span <= 5) return .5;
	if (span <= 12) return 1;
	if (span <= 30) return 2;
	if (span <= 90) return 5;
	if (span <= 180) return 10;
	if (span <= 600) return 30;
	return 60;
}
function WaveformView() {
	const overviewRef = (0, import_react.useRef)(null);
	const overviewOverlayRef = (0, import_react.useRef)(null);
	const editorRef = (0, import_react.useRef)(null);
	const overlayRef = (0, import_react.useRef)(null);
	const dsaRef = (0, import_react.useRef)(null);
	const dsaOverlayRef = (0, import_react.useRef)(null);
	const wrapRef = (0, import_react.useRef)(null);
	const overviewWrapRef = (0, import_react.useRef)(null);
	const dsaWrapRef = (0, import_react.useRef)(null);
	const dragRef = (0, import_react.useRef)(null);
	const caliperRef = (0, import_react.useRef)(null);
	const paintRef = (0, import_react.useRef)(() => {});
	const segment = useEegStore((s) => s.segment);
	const status = useEegStore((s) => s.status);
	const busy = useEegStore((s) => s.busy);
	const seekEeg = useEegStore((s) => s.seekEeg);
	const setView = useEegStore((s) => s.setView);
	const panView = useEegStore((s) => s.panView);
	const zoomAt = useEegStore((s) => s.zoomAt);
	const showDsa = useEegStore((s) => s.showDsa);
	(0, import_react.useEffect)(() => {
		const editor = editorRef.current;
		const overlay = overlayRef.current;
		const overview = overviewRef.current;
		const ovOverlay = overviewOverlayRef.current;
		const dsa = dsaRef.current;
		const dsaOv = dsaOverlayRef.current;
		const wrap = wrapRef.current;
		const ovWrap = overviewWrapRef.current;
		const dsaWrap = dsaWrapRef.current;
		if (!editor || !overlay || !overview || !ovOverlay || !wrap || !ovWrap || !dsa || !dsaOv || !dsaWrap) return;
		let raf = 0;
		let looping = false;
		let waveSig = "";
		let ovSig = "";
		let dsaSig = "";
		const paint = () => {
			const s = useEegStore.getState();
			const list = (s.segment?.tracks ?? []).filter((t) => t.kind !== "extra");
			const total = s.segment?.duration ?? 0;
			const t = eegNow(s);
			const follow = s.followPlayhead && playback.playing;
			const viewDur = s.viewDuration;
			const viewStart = follow && total > 0 ? followViewStart(t, viewDur, total) : s.viewStart;
			const viewEnd = viewStart + viewDur;
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			const cssW = wrap.clientWidth;
			const cssH = wrap.clientHeight;
			const ovW = ovWrap.clientWidth;
			const ovH = ovWrap.clientHeight;
			const dsaW = dsaWrap.clientWidth;
			const dsaH = dsaWrap.clientHeight;
			if (cssW >= 8 && cssH >= 8) {
				sizeCanvas(editor, cssW, cssH, dpr);
				sizeCanvas(overlay, cssW, cssH, dpr);
				const ectx = editor.getContext("2d");
				const octx = overlay.getContext("2d");
				if (ectx && octx) {
					const sig = [
						list.length,
						total,
						viewStart.toFixed(3),
						viewDur.toFixed(3),
						s.sensitivityUv,
						s.negativeUp ? 1 : 0,
						s.colorBy,
						cssW,
						cssH,
						Object.values(s.tracks).map((tr) => `${tr.id}:${tr.mute ? 1 : 0}${tr.solo ? 1 : 0}`).join(",")
					].join("|");
					if (sig !== waveSig) {
						waveSig = sig;
						drawEditor(ectx, cssW, cssH, list, s, viewStart, viewEnd);
					}
					drawEditorOverlay(octx, cssW, cssH, t, viewStart, viewDur, total, s.annotations, s.showAuto, s.selectedAnnotation, caliperRef.current, s.showAnnotations);
				}
			}
			if (ovW >= 8 && ovH >= 8) {
				sizeCanvas(overview, ovW, ovH, dpr);
				sizeCanvas(ovOverlay, ovW, ovH, dpr);
				const ctx = overview.getContext("2d");
				const octx = ovOverlay.getContext("2d");
				if (ctx && octx) {
					const osig = [
						list.length,
						total,
						ovW,
						ovH,
						s.negativeUp ? 1 : 0,
						s.sensitivityUv
					].join("|");
					if (osig !== ovSig) {
						ovSig = osig;
						drawOverviewWaves(ctx, ovW, ovH, list, s, total);
					}
					drawOverviewOverlay(octx, ovW, ovH, t, viewStart, viewDur, total, s.annotations, s.showAuto, s.showAnnotations);
				}
			}
			if (s.showDsa && dsaW >= 8 && dsaH >= 8) {
				sizeCanvas(dsa, dsaW, dsaH, dpr);
				sizeCanvas(dsaOv, dsaW, dsaH, dpr);
				const ctx = dsa.getContext("2d");
				const octx = dsaOv.getContext("2d");
				if (ctx && octx) {
					const sig = `${s.dsa?.nTime ?? 0}|${s.dsa?.logMax ?? 0}|${dsaW}|${dsaH}`;
					if (sig !== dsaSig) {
						dsaSig = sig;
						drawDsa(ctx, dsa, dsaW, dsaH, s.dsa);
					}
					drawDsaOverlay(octx, dsaW, dsaH, t, viewStart, viewDur, total);
				}
			}
		};
		const loop = () => {
			paint();
			if (playback.playing) raf = requestAnimationFrame(loop);
			else {
				looping = false;
				raf = 0;
			}
		};
		const ensureLoop = () => {
			if (looping || !playback.playing) return;
			looping = true;
			raf = requestAnimationFrame(loop);
		};
		paint();
		paintRef.current = paint;
		const unsub = useEegStore.subscribe((s) => {
			if (s.playing) ensureLoop();
			else paint();
		});
		const ro = new ResizeObserver(() => {
			waveSig = "";
			ovSig = "";
			dsaSig = "";
			paint();
		});
		ro.observe(wrap);
		ro.observe(ovWrap);
		ro.observe(dsaWrap);
		return () => {
			looping = false;
			cancelAnimationFrame(raf);
			unsub();
			ro.disconnect();
		};
	}, []);
	const onEditorPointer = (e) => {
		if (!segment || !wrapRef.current) return;
		const rect = wrapRef.current.getBoundingClientRect();
		const plotW = rect.width - GUTTER;
		const x = e.clientX - rect.left - GUTTER;
		if (x < 0) return;
		e.target.setPointerCapture?.(e.pointerId);
		const s = useEegStore.getState();
		const vs = s.followPlayhead && playback.playing ? followViewStart(eegNow(s), s.viewDuration, segment.duration) : s.viewStart;
		const t = timeAtFraction(clamp(x / Math.max(1, plotW), 0, 1), vs, s.viewDuration);
		if (s.tool === "annotate") {
			s.addAnnotation({
				start: t,
				end: t,
				trackId: null,
				type: s.pendingType,
				text: "",
				source: "user",
				confidence: 1
			});
			return;
		}
		if (s.tool === "caliper") {
			dragRef.current = {
				kind: "caliper",
				x0: e.clientX,
				start0: t,
				dur0: 0
			};
			caliperRef.current = {
				a: t,
				b: t
			};
			paintRef.current();
			return;
		}
		seekEeg(t);
		dragRef.current = {
			kind: "scrub",
			x0: e.clientX,
			start0: vs,
			dur0: s.viewDuration
		};
	};
	const onOverviewPointer = (e) => {
		if (!segment || !overviewWrapRef.current) return;
		const rect = overviewWrapRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const w = rect.width;
		const tClick = clamp(x / Math.max(1, w), 0, 1) * segment.duration;
		const s = useEegStore.getState();
		const vs = s.followPlayhead && playback.playing ? followViewStart(eegNow(s), s.viewDuration, segment.duration) : s.viewStart;
		const vd = s.viewDuration;
		const x0 = vs / segment.duration * w;
		const x1 = (vs + vd) / segment.duration * w;
		const edge = 6;
		let kind = "seek";
		if (Math.abs(x - x0) <= edge) kind = "resize-l";
		else if (Math.abs(x - x1) <= edge) kind = "resize-r";
		else if (x >= x0 && x <= x1) kind = "pan";
		e.currentTarget.setPointerCapture?.(e.pointerId);
		dragRef.current = {
			kind,
			x0: e.clientX,
			start0: vs,
			dur0: vd
		};
		if (kind === "seek") seekEeg(tClick);
	};
	const onDsaPointer = (e) => {
		if (!segment || !dsaWrapRef.current) return;
		const rect = dsaWrapRef.current.getBoundingClientRect();
		const frac = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
		e.currentTarget.setPointerCapture?.(e.pointerId);
		dragRef.current = {
			kind: "dsa",
			x0: e.clientX,
			start0: 0,
			dur0: 0
		};
		seekEeg(frac * segment.duration);
	};
	const onPointerMove = (e) => {
		const drag = dragRef.current;
		if (!drag || !segment) return;
		const s = useEegStore.getState();
		if (drag.kind === "caliper" && wrapRef.current) {
			const rect = wrapRef.current.getBoundingClientRect();
			const plotW = Math.max(1, rect.width - GUTTER);
			const frac = clamp((e.clientX - rect.left - GUTTER) / plotW, 0, 1);
			const vs = s.followPlayhead && playback.playing ? followViewStart(eegNow(s), s.viewDuration, segment.duration) : s.viewStart;
			caliperRef.current = {
				a: drag.start0,
				b: timeAtFraction(frac, vs, s.viewDuration)
			};
			paintRef.current();
			return;
		}
		if (drag.kind === "scrub" && wrapRef.current) {
			const rect = wrapRef.current.getBoundingClientRect();
			const plotW = Math.max(1, rect.width - GUTTER);
			const frac = clamp((e.clientX - rect.left - GUTTER) / plotW, 0, 1);
			const vs = s.followPlayhead && playback.playing ? followViewStart(eegNow(s), s.viewDuration, segment.duration) : s.viewStart;
			seekEeg(timeAtFraction(frac, vs, s.viewDuration));
			return;
		}
		if (drag.kind === "dsa" && dsaWrapRef.current) {
			const rect = dsaWrapRef.current.getBoundingClientRect();
			const frac = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
			seekEeg(frac * segment.duration);
			return;
		}
		if (!overviewWrapRef.current) return;
		const w = overviewWrapRef.current.getBoundingClientRect().width;
		const dt = (e.clientX - drag.x0) / Math.max(1, w) * segment.duration;
		if (drag.kind === "pan") setView(drag.start0 + dt, drag.dur0);
		else if (drag.kind === "resize-l") {
			const end = drag.start0 + drag.dur0;
			const start = drag.start0 + dt;
			setView(start, end - start);
		} else if (drag.kind === "resize-r") setView(drag.start0, drag.dur0 + dt);
		else if (drag.kind === "seek") {
			const rect = overviewWrapRef.current.getBoundingClientRect();
			const frac = clamp((e.clientX - rect.left) / Math.max(1, w), 0, 1);
			seekEeg(frac * segment.duration);
		}
	};
	const onPointerUp = () => {
		dragRef.current = null;
	};
	(0, import_react.useEffect)(() => {
		const wrap = wrapRef.current;
		if (!wrap) return;
		const onWheel = (e) => {
			if (!useEegStore.getState().segment) return;
			e.preventDefault();
			if (e.shiftKey) {
				const span = useEegStore.getState().viewDuration;
				panView((e.deltaY + e.deltaX) * .0015 * span);
				return;
			}
			const rect = wrap.getBoundingClientRect();
			const x = e.clientX - rect.left - GUTTER;
			const s = useEegStore.getState();
			const vs = s.followPlayhead && playback.playing ? followViewStart(eegNow(s), s.viewDuration, s.segment.duration) : s.viewStart;
			const frac = clamp(x / Math.max(1, rect.width - GUTTER), 0, 1);
			const anchor = s.followPlayhead ? eegNow(s) : timeAtFraction(frac, vs, s.viewDuration);
			const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
			zoomAt(factor, anchor);
		};
		wrap.addEventListener("wheel", onWheel, { passive: false });
		return () => wrap.removeEventListener("wheel", onWheel);
	}, [panView, zoomAt]);
	const list = (segment?.tracks ?? []).filter((t) => t.kind !== "extra");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 min-w-0 flex-1 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: overviewWrapRef,
				className: "relative shrink-0 cursor-ew-resize border-b border-border bg-surface select-none",
				style: { height: OVERVIEW_H },
				onPointerDown: onOverviewPointer,
				onPointerMove,
				onPointerUp,
				onPointerCancel: onPointerUp,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						ref: overviewRef,
						className: "absolute inset-0 size-full"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						ref: overviewOverlayRef,
						className: "pointer-events-none absolute inset-0 size-full"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-none absolute left-2 top-1.5 text-[0.625rem] font-medium uppercase tracking-wider text-subtle",
						children: "Recording"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: dsaWrapRef,
				className: cn("relative shrink-0 cursor-crosshair border-b border-border bg-bg select-none", !showDsa && "hidden"),
				style: { height: showDsa ? DSA_H : 0 },
				onPointerDown: onDsaPointer,
				onPointerMove,
				onPointerUp,
				onPointerCancel: onPointerUp,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						ref: dsaRef,
						className: "absolute inset-0 size-full"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						ref: dsaOverlayRef,
						className: "pointer-events-none absolute inset-0 size-full"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-none absolute left-2 top-1 text-[0.625rem] font-medium uppercase tracking-wider text-subtle",
						children: "DSA L / R"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-none absolute right-2 top-1 font-mono text-[0.5625rem] text-subtle",
						children: "30 Hz"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-none absolute right-2 bottom-1 font-mono text-[0.5625rem] text-subtle",
						children: "30 Hz"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: wrapRef,
				className: "relative min-h-0 flex-1 overflow-hidden bg-bg select-none",
				onPointerDown: onEditorPointer,
				onPointerMove,
				onPointerUp,
				onPointerCancel: onPointerUp,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						ref: editorRef,
						className: "absolute inset-0 size-full"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						ref: overlayRef,
						className: "pointer-events-none absolute inset-0 size-full"
					}),
					list.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-none absolute bottom-0 left-0 z-10 w-[132px]",
						style: { top: RULER },
						children: list.map((tr) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrackGutter, {
							track: tr,
							count: list.length,
							compact: list.length > 12
						}, tr.id))
					}),
					(status === "loading" || busy) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute inset-0 z-20 flex items-center justify-center bg-bg/70 text-sm text-muted",
						children: status === "loading" ? "Reading recording…" : "Preparing sound…"
					}),
					status !== "ready" && status !== "loading" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-6 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xl tracking-tight text-fg",
							children: "Auris"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "max-w-sm text-pretty text-sm text-muted",
							children: "Open a deidentified EDF/EDF+ file, or load the demo tracing. All processing stays in this browser."
						})]
					})
				]
			})
		]
	});
}
function drawEditor(ctx, cssW, cssH, list, s, viewStart, viewEnd) {
	ctx.setTransform(Math.min(2, window.devicePixelRatio || 1), 0, 0, Math.min(2, window.devicePixelRatio || 1), 0, 0);
	ctx.clearRect(0, 0, cssW, cssH);
	ctx.fillStyle = "#07080a";
	ctx.fillRect(0, 0, cssW, cssH);
	const plotX = GUTTER;
	const plotW = Math.max(10, cssW - GUTTER);
	const plotTop = RULER;
	const laneH = Math.max(10, cssH - RULER) / Math.max(1, list.length);
	const sign = s.negativeUp ? -1 : 1;
	const span = Math.max(1e-6, viewEnd - viewStart);
	ctx.fillStyle = "#101216";
	ctx.fillRect(0, 0, cssW, RULER);
	ctx.strokeStyle = "rgba(232,234,237,0.08)";
	ctx.beginPath();
	ctx.moveTo(0, 17.5);
	ctx.lineTo(cssW, 17.5);
	ctx.stroke();
	const step = niceStep(span);
	const t0 = Math.ceil(viewStart / step) * step;
	ctx.font = "500 10px 'IBM Plex Mono', ui-monospace, monospace";
	ctx.fillStyle = "#8b919c";
	ctx.textBaseline = "middle";
	for (let t = t0; t <= viewEnd + 1e-6; t += step) {
		const x = plotX + (t - viewStart) / span * plotW;
		ctx.strokeStyle = "rgba(232,234,237,0.06)";
		ctx.beginPath();
		ctx.moveTo(x, RULER);
		ctx.lineTo(x, cssH);
		ctx.stroke();
		ctx.strokeStyle = "rgba(232,234,237,0.22)";
		ctx.beginPath();
		ctx.moveTo(x, 13);
		ctx.lineTo(x, RULER);
		ctx.stroke();
		ctx.fillText(formatTick(t, span), x + 4, RULER / 2);
	}
	const audible = audibleIds(Object.values(s.tracks));
	const anySolo = Object.values(s.tracks).some((tr) => tr.solo);
	const nPix = Math.max(1, Math.floor(plotW));
	const colorByHz = s.colorBy === "band";
	list.forEach((tr, i) => {
		const y0 = plotTop + i * laneH;
		const mid = y0 + laneH / 2;
		ctx.strokeStyle = "rgba(232,234,237,0.05)";
		ctx.beginPath();
		ctx.moveTo(plotX, mid);
		ctx.lineTo(plotX + plotW, mid);
		ctx.stroke();
		ctx.strokeStyle = "rgba(232,234,237,0.06)";
		ctx.beginPath();
		ctx.moveTo(0, y0 + laneH);
		ctx.lineTo(cssW, y0 + laneH);
		ctx.stroke();
		const st = s.tracks[tr.id];
		const live = audible.has(tr.id);
		const lat = st?.lateralityOverride ?? tr.laterality;
		const color = KIND_COLOR[tr.kind] ?? LAT_COLOR[lat];
		const alpha = live ? 1 : anySolo || st?.mute ? .2 : .5;
		const { min, max } = envelopeWindow(tr.samples, tr.sampleRate, viewStart, viewEnd, nPix);
		const scale = laneH * .42 / Math.max(1, s.sensitivityUv);
		if (colorByHz && tr.kind === "eeg") drawLaneBanded(ctx, min, max, freqWindow(tr.samples, tr.sampleRate, viewStart, viewEnd, nPix), plotX, mid, scale, sign, alpha);
		else drawLane(ctx, min, max, plotX, mid, scale, sign, color, alpha);
	});
}
function drawEditorOverlay(ctx, cssW, cssH, t, viewStart, viewDur, _total, annotations = [], showAuto = true, selected = null, caliper = null, showAnnotations = true) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, cssW, cssH);
	const plotX = GUTTER;
	const plotW = Math.max(10, cssW - GUTTER);
	const viewEnd = viewStart + viewDur;
	if (showAnnotations) for (const a of annotations) {
		if (!showAuto && a.source === "auto") continue;
		if (a.end < viewStart || a.start > viewEnd) continue;
		const x0 = plotX + clamp((a.start - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
		const x1 = plotX + clamp((Math.max(a.end, a.start + .02) - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
		ctx.fillStyle = MORPH_COLOR[a.type] ?? "#c8ccd4";
		ctx.globalAlpha = a.id === selected ? .55 : .28;
		ctx.fillRect(x0, 0, Math.max(2, x1 - x0), EVENT_LANE);
		ctx.globalAlpha = 1;
		ctx.fillRect(x0, EVENT_LANE, 2, cssH - EVENT_LANE);
	}
	if (caliper) {
		const xa = plotX + clamp((caliper.a - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
		const xb = plotX + clamp((caliper.b - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
		ctx.fillStyle = "rgba(126,184,201,0.12)";
		ctx.fillRect(Math.min(xa, xb), 0, Math.abs(xb - xa), cssH);
		ctx.strokeStyle = "rgba(126,184,201,0.95)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(xa, 0);
		ctx.lineTo(xa, cssH);
		ctx.moveTo(xb, 0);
		ctx.lineTo(xb, cssH);
		ctx.stroke();
		ctx.fillStyle = "#d7dde6";
		ctx.font = "500 11px 'IBM Plex Mono', ui-monospace, monospace";
		const dt = Math.abs(caliper.b - caliper.a);
		const hz = dt > 1e-4 ? 1 / dt : 0;
		const label = hz > .2 && hz < 80 ? `${dt.toFixed(3)} s  ${hz.toFixed(1)} Hz` : `${dt.toFixed(3)} s`;
		ctx.fillText(label, Math.min(xa, xb) + 6, 14);
	}
	if (t < viewStart || t > viewStart + viewDur) return;
	const x = plotX + clamp((t - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
	ctx.strokeStyle = "rgba(232,234,237,0.9)";
	ctx.lineWidth = 1.25;
	ctx.beginPath();
	ctx.moveTo(x, 0);
	ctx.lineTo(x, cssH);
	ctx.stroke();
	ctx.fillStyle = "rgba(232,234,237,0.9)";
	ctx.beginPath();
	ctx.moveTo(x - 5, 0);
	ctx.lineTo(x + 5, 0);
	ctx.lineTo(x, 7);
	ctx.closePath();
	ctx.fill();
}
function drawOverviewWaves(ctx, cssW, cssH, list, s, total) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.fillStyle = "#101216";
	ctx.fillRect(0, 0, cssW, cssH);
	if (list.length === 0 || total <= 0) return;
	const nPix = Math.max(1, Math.floor(cssW));
	const n = Math.max(1, list.length);
	const laneH = (cssH - 14) / n;
	const sign = s.negativeUp ? -1 : 1;
	list.forEach((tr, i) => {
		const mid = 4 + i * laneH + laneH / 2;
		const lat = s.tracks[tr.id]?.lateralityOverride ?? tr.laterality;
		const { min, max } = envelopeWindow(tr.samples, tr.sampleRate, 0, total, nPix);
		const scale = laneH * .46 / Math.max(1, s.sensitivityUv);
		ctx.globalAlpha = .85;
		ctx.strokeStyle = KIND_COLOR[tr.kind] ?? LAT_COLOR[lat];
		ctx.lineWidth = .8;
		ctx.beginPath();
		for (let p = 0; p < min.length; p++) {
			const y = mid + sign * ((min[p] + max[p]) / 2) * scale;
			if (p === 0) ctx.moveTo(p + .5, y);
			else ctx.lineTo(p + .5, y);
		}
		ctx.stroke();
		ctx.globalAlpha = 1;
	});
	ctx.fillStyle = "#5c6370";
	ctx.font = "500 9px 'IBM Plex Mono', ui-monospace, monospace";
	ctx.textBaseline = "bottom";
	const step = niceStep(total);
	for (let tt = 0; tt <= total + 1e-6; tt += step) {
		const x = tt / total * cssW;
		ctx.fillText(formatTick(tt, total), x + 3, cssH - 2);
	}
}
function drawOverviewOverlay(ctx, cssW, cssH, t, viewStart, viewDur, total, annotations = [], showAuto = true, showAnnotations = true) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, cssW, cssH);
	if (total <= 0) return;
	if (showAnnotations) for (const a of annotations) {
		if (!showAuto && a.source === "auto") continue;
		const x = a.start / total * cssW;
		ctx.fillStyle = MORPH_COLOR[a.type] ?? "#c8ccd4";
		ctx.fillRect(x, 0, 2, cssH);
	}
	const x0 = viewStart / total * cssW;
	const x1 = (viewStart + viewDur) / total * cssW;
	ctx.fillStyle = "rgba(126,184,201,0.14)";
	ctx.fillRect(x0, 0, Math.max(2, x1 - x0), cssH);
	ctx.strokeStyle = "rgba(126,184,201,0.9)";
	ctx.lineWidth = 1.25;
	ctx.strokeRect(x0 + .5, .5, Math.max(2, x1 - x0 - 1), cssH - 1);
	ctx.fillStyle = "rgba(126,184,201,0.9)";
	ctx.fillRect(x0 - 1, 0, 3, cssH);
	ctx.fillRect(x1 - 2, 0, 3, cssH);
	const px = t / total * cssW;
	ctx.strokeStyle = "rgba(232,234,237,0.95)";
	ctx.lineWidth = 1.25;
	ctx.beginPath();
	ctx.moveTo(px, 0);
	ctx.lineTo(px, cssH);
	ctx.stroke();
}
function drawDsa(ctx, canvas, cssW, cssH, frame) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = "#07080a";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	if (!frame || frame.nTime < 1 || frame.nFreq < 2) {
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		return;
	}
	const w = canvas.width;
	const h = canvas.height;
	const img = ctx.createImageData(w, h);
	const data = img.data;
	const mid = h / 2;
	const logMax = frame.logMax;
	for (let x = 0; x < w; x++) {
		const ti = Math.min(frame.nTime - 1, Math.floor(x / w * frame.nTime));
		for (let y = 0; y < h; y++) {
			let src;
			let fBin;
			if (y < mid) {
				src = frame.l;
				const u = 1 - y / Math.max(1, mid - 1);
				fBin = Math.min(frame.nFreq - 1, Math.floor(u * (frame.nFreq - 1)));
			} else {
				src = frame.r;
				const u = (y - mid) / Math.max(1, h - mid - 1);
				fBin = Math.min(frame.nFreq - 1, Math.floor(u * (frame.nFreq - 1)));
			}
			const [r, g, b] = dsaRgb(dsaUnit(src[ti * frame.nFreq + fBin] ?? 0, logMax));
			const i = (y * w + x) * 4;
			data[i] = r;
			data[i + 1] = g;
			data[i + 2] = b;
			data[i + 3] = 255;
		}
	}
	ctx.putImageData(img, 0, 0);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.strokeStyle = "rgba(232,234,237,0.18)";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, cssH / 2);
	ctx.lineTo(cssW, cssH / 2);
	ctx.stroke();
	ctx.fillStyle = "#8b919c";
	ctx.font = "500 9px 'IBM Plex Mono', ui-monospace, monospace";
	ctx.textBaseline = "middle";
	ctx.fillText("L", 6, cssH * .22);
	ctx.fillText("0", 6, cssH * .5);
	ctx.fillText("R", 6, cssH * .78);
}
function drawDsaOverlay(ctx, cssW, cssH, t, viewStart, viewDur, total) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, cssW, cssH);
	if (total <= 0) return;
	const x0 = viewStart / total * cssW;
	const x1 = (viewStart + viewDur) / total * cssW;
	ctx.fillStyle = "rgba(232,234,237,0.06)";
	ctx.fillRect(x0, 0, Math.max(2, x1 - x0), cssH);
	ctx.strokeStyle = "rgba(232,234,237,0.45)";
	ctx.lineWidth = 1;
	ctx.strokeRect(x0 + .5, .5, Math.max(2, x1 - x0 - 1), cssH - 1);
	const px = t / total * cssW;
	ctx.strokeStyle = "rgba(232,234,237,0.95)";
	ctx.lineWidth = 1.25;
	ctx.beginPath();
	ctx.moveTo(px, 0);
	ctx.lineTo(px, cssH);
	ctx.stroke();
}
function TrackGutter({ track, count, compact }) {
	const st = useEegStore((s) => s.tracks[track.id]);
	const toggleMute = useEegStore((s) => s.toggleMute);
	const toggleSolo = useEegStore((s) => s.toggleSolo);
	const soloExclusive = useEegStore((s) => s.soloExclusive);
	const setGain = useEegStore((s) => s.setGain);
	const lat = st?.lateralityOverride ?? track.laterality;
	const muted = Boolean(st?.mute);
	const solo = Boolean(st?.solo);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-auto flex items-center gap-0.5 border-b border-border/50 px-1",
		style: { height: `${100 / count}%` },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				title: "Solo — multiple tracks can be soloed. Double-click for exclusive.",
				onClick: () => toggleSolo(track.id),
				onDoubleClick: () => soloExclusive(track.id),
				className: cn("grid h-6 min-w-6 shrink-0 place-items-center rounded-sm text-[0.6875rem] font-bold", solo ? "bg-ok text-bg" : "bg-surface-2 text-subtle hover:text-fg"),
				children: "S"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				title: muted ? "Unmute" : "Mute",
				onClick: () => toggleMute(track.id),
				className: cn("grid h-6 min-w-6 shrink-0 place-items-center rounded-sm text-[0.6875rem] font-bold", muted ? "bg-danger text-bg" : "bg-surface-2 text-subtle hover:text-fg"),
				children: "M"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-baseline justify-between gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate font-mono text-[0.625rem] leading-tight text-fg",
						children: track.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("shrink-0 text-[0.625rem] uppercase", lat === "left" && "text-hemi-l", lat === "right" && "text-hemi-r", lat === "midline" && "text-hemi-c", lat === "unknown" && "text-subtle"),
						children: lat === "left" ? "L" : lat === "right" ? "R" : lat === "midline" ? "C" : "—"
					})]
				}), !compact && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "range",
					min: 0,
					max: 2,
					step: .05,
					value: typeof st?.gain === "number" ? st.gain : 1,
					onChange: (e) => setGain(track.id, Number(e.target.value)),
					className: "h-1 w-full cursor-pointer accent-accent",
					"aria-label": `${track.label} gain`
				})]
			})
		]
	});
}
var chip = "h-7 rounded-sm px-2 text-[0.6875rem] tabular-nums";
function ReviewBar() {
	const montage = useEegStore((s) => s.montage);
	const setMontage = useEegStore((s) => s.setMontage);
	const filters = useEegStore((s) => s.filters);
	const setFilters = useEegStore((s) => s.setFilters);
	const sensitivity = useEegStore((s) => s.sensitivityUv);
	const setSensitivity = useEegStore((s) => s.setSensitivity);
	const viewDuration = useEegStore((s) => s.viewDuration);
	const setViewDuration = useEegStore((s) => s.setViewDuration);
	const page = useEegStore((s) => s.page);
	const sonify = useEegStore((s) => s.sonify);
	const setSonify = useEegStore((s) => s.setSonify);
	const tool = useEegStore((s) => s.tool);
	const setTool = useEegStore((s) => s.setTool);
	const negativeUp = useEegStore((s) => s.negativeUp);
	const setNegativeUp = useEegStore((s) => s.setNegativeUp);
	const showAnnotations = useEegStore((s) => s.showAnnotations);
	const setShowAnnotations = useEegStore((s) => s.setShowAnnotations);
	const colorBy = useEegStore((s) => s.colorBy);
	const setColorBy = useEegStore((s) => s.setColorBy);
	const showDsa = useEegStore((s) => s.showDsa);
	const setShowDsa = useEegStore((s) => s.setShowDsa);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-surface px-3 py-1.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Montage",
				children: [
					["double-banana", "Banana"],
					["transverse", "Transverse"],
					["original", "Ref"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setMontage(id),
					className: cn(chip, montage === id ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
					children: label
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "LFF",
				children: LFF_PRESETS.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setFilters({
						lff: v,
						bandpass: false
					}),
					className: cn(chip, filters.lff === v ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
					children: v === 0 ? "Off" : v
				}, v))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "HFF",
				children: HFF_PRESETS.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setFilters({
						hff: v,
						bandpass: false
					}),
					className: cn(chip, filters.hff === v ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
					children: v === 0 ? "Off" : v
				}, v))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Notch",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setFilters({ notch60: !filters.notch60 }),
					className: cn(chip, filters.notch60 ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
					children: "60"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "µV",
				children: SENSITIVITY_PRESETS.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setSensitivity(v),
					className: cn(chip, sensitivity === v ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
					children: v
				}, v))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Group, {
				label: "Page",
				children: [
					PAGE_PRESETS.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setViewDuration(v),
						className: cn(chip, Math.abs(viewDuration - v) < .05 ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
						children: [v, "s"]
					}, v)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: cn(chip, "bg-bg text-muted"),
						onClick: () => page(-1),
						children: "Pg↑"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: cn(chip, "bg-bg text-muted"),
						onClick: () => page(1),
						children: "Pg↓"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Listen",
				children: [
					["contour", "Contour"],
					["pen", "Pen"],
					["piano", "Piano"],
					["pulse", "Pulse"],
					["choir", "Choir"],
					["direct", "Direct"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setSonify(id === "piano" ? {
						mode: id,
						quantize: true
					} : { mode: id }),
					className: cn(chip, sonify.mode === id ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
					children: label
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Group, {
				label: "Vol",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "range",
					min: .4,
					max: 2.2,
					step: .05,
					value: sonify.volume ?? 1.45,
					onChange: (e) => setSonify({ volume: Number(e.target.value) }),
					className: "h-7 w-24 accent-accent",
					"aria-label": "Listen volume"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "w-8 font-mono text-[0.625rem] tabular-nums text-muted",
					children: [Math.round((sonify.volume ?? 1.45) * 100), "%"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "Color",
				children: [["band", "Hz"], ["hemi", "Hemi"]].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setColorBy(id),
					className: cn(chip, colorBy === id ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
					children: label
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Group, {
				label: "DSA",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setShowDsa(!showDsa),
					className: cn(chip, showDsa ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
					children: showDsa ? "On" : "Off"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden items-center gap-1.5 lg:flex",
				title: "Trace color by instantaneous frequency",
				children: BAND_LABELS.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1 font-mono text-[0.625rem] text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-block size-1.5 rounded-full",
						style: { background: `var(--color-band-${b.id})` }
					}), b.glyph]
				}, b.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Group, {
				label: "Tool",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setTool("pointer"),
						className: cn(chip, tool === "pointer" ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
						children: "Pointer"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setTool("annotate"),
						className: cn(chip, tool === "annotate" ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
						children: "Annotate"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setTool("caliper"),
						className: cn(chip, tool === "caliper" ? "bg-accent text-accent-fg" : "bg-bg text-muted"),
						children: "Caliper"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "ml-auto flex items-center gap-1.5 text-[0.6875rem] text-muted",
				children: ["Annotations", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: showAnnotations,
					onChange: (e) => setShowAnnotations(e.target.checked),
					className: "size-3.5 accent-accent"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center gap-1.5 text-[0.6875rem] text-muted",
				children: ["Neg up", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: negativeUp,
					onChange: (e) => setNegativeUp(e.target.checked),
					className: "size-3.5 accent-accent"
				})]
			})
		]
	});
}
function Group({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-[0.625rem] font-medium uppercase tracking-wider text-subtle",
			children: label
		}), children]
	});
}
function isTypingTarget(el) {
	const tag = el?.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	return Boolean(el?.isContentEditable);
}
function useEditorKeys() {
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if (isTypingTarget(e.target)) return;
			const s = useEegStore.getState();
			if (e.code === "Space") {
				e.preventDefault();
				s.togglePlay();
				return;
			}
			if (e.key === "Escape") {
				e.preventDefault();
				if (s.keysOpen) s.setKeysOpen(false);
				else if (s.aboutOpen) s.setAboutOpen(false);
				else s.stop();
				return;
			}
			if (e.key === "?" || e.shiftKey && e.key === "/") {
				e.preventDefault();
				s.setKeysOpen(!s.keysOpen);
				return;
			}
			if (e.key === "l" || e.key === "L") {
				e.preventDefault();
				s.setLoop(!s.loop);
				return;
			}
			if (e.key === "f" || e.key === "F") {
				e.preventDefault();
				s.setFollow(!s.followPlayhead);
				return;
			}
			if (e.key === "h" || e.key === "H") {
				e.preventDefault();
				s.setShowAnnotations(!s.showAnnotations);
				return;
			}
			if (e.key === "d" || e.key === "D") {
				e.preventDefault();
				s.setShowDsa(!s.showDsa);
				return;
			}
			if (e.key === "b" || e.key === "B") {
				e.preventDefault();
				s.setColorBy(s.colorBy === "band" ? "hemi" : "band");
				return;
			}
			if (e.key === "a" || e.key === "A") {
				e.preventDefault();
				s.setTool(s.tool === "annotate" ? "pointer" : "annotate");
				return;
			}
			if (e.key === "c" || e.key === "C") {
				e.preventDefault();
				s.setTool(s.tool === "caliper" ? "pointer" : "caliper");
				return;
			}
			if (e.key === "PageDown") {
				e.preventDefault();
				s.page(1);
				return;
			}
			if (e.key === "PageUp") {
				e.preventDefault();
				s.page(-1);
				return;
			}
			if (!s.segment) return;
			if (e.key === "Home") {
				e.preventDefault();
				s.seekEeg(0);
				return;
			}
			if (e.key === "End") {
				e.preventDefault();
				s.seekEeg(s.segment.duration);
				return;
			}
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				const step = e.altKey ? .2 : e.shiftKey ? 5 : 1;
				s.nudge(-step);
				return;
			}
			if (e.key === "ArrowRight") {
				e.preventDefault();
				const step = e.altKey ? .2 : e.shiftKey ? 5 : 1;
				s.nudge(step);
				return;
			}
			if (e.key === "=" || e.key === "+" || e.key === "]") {
				e.preventDefault();
				s.zoomAt(1 / 1.25);
				return;
			}
			if (e.key === "-" || e.key === "[") {
				e.preventDefault();
				s.zoomAt(1.25);
				return;
			}
			if (e.key === "0") {
				e.preventDefault();
				s.setViewDuration(s.segment.duration);
				return;
			}
			if (e.key >= "1" && e.key <= "5") {
				const preset = VIEW_PRESETS[[
					0,
					1,
					2,
					4,
					5
				][Number(e.key) - 1]] ?? VIEW_PRESETS[2];
				e.preventDefault();
				s.setViewDuration(preset);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
}
var SHORTCUTS = [
	{
		group: "Playback",
		keys: ["Space"],
		action: "Play / pause"
	},
	{
		group: "Playback",
		keys: ["Esc"],
		action: "Stop"
	},
	{
		group: "Playback",
		keys: ["L"],
		action: "Toggle loop"
	},
	{
		group: "Playback",
		keys: ["Home"],
		action: "Go to start"
	},
	{
		group: "Playback",
		keys: ["End"],
		action: "Go to end"
	},
	{
		group: "Playback",
		keys: ["←", "→"],
		action: "Skip 1 s"
	},
	{
		group: "Playback",
		keys: ["Shift", "← / →"],
		action: "Skip 5 s"
	},
	{
		group: "Playback",
		keys: ["Alt", "← / →"],
		action: "Skip 0.2 s"
	},
	{
		group: "View",
		keys: ["F"],
		action: "Follow playhead"
	},
	{
		group: "View",
		keys: [
			"+",
			"=",
			"]"
		],
		action: "Zoom in"
	},
	{
		group: "View",
		keys: ["-", "["],
		action: "Zoom out"
	},
	{
		group: "View",
		keys: ["0"],
		action: "Show entire recording"
	},
	{
		group: "View",
		keys: ["PageDown"],
		action: "Next page"
	},
	{
		group: "View",
		keys: ["PageUp"],
		action: "Previous page"
	},
	{
		group: "View",
		keys: ["1–5"],
		action: "Window 2 / 5 / 10 / 30 / 60 s"
	},
	{
		group: "View",
		keys: ["Wheel"],
		action: "Zoom around cursor"
	},
	{
		group: "View",
		keys: ["Shift", "Wheel"],
		action: "Pan"
	},
	{
		group: "View",
		keys: ["Click overview"],
		action: "Seek"
	},
	{
		group: "View",
		keys: ["Drag window"],
		action: "Pan the editor"
	},
	{
		group: "Review",
		keys: ["A"],
		action: "Annotate tool"
	},
	{
		group: "Review",
		keys: ["C"],
		action: "Caliper"
	},
	{
		group: "Review",
		keys: ["H"],
		action: "Hide / show annotations"
	},
	{
		group: "Review",
		keys: ["D"],
		action: "Show / hide DSA spectrogram"
	},
	{
		group: "Review",
		keys: ["B"],
		action: "Color traces by hemisphere or Hz"
	},
	{
		group: "Review",
		keys: ["Click (annotate)"],
		action: "Drop a marker"
	},
	{
		group: "Tracks",
		keys: ["S"],
		action: "Solo this track (multi-solo)"
	},
	{
		group: "Tracks",
		keys: ["M"],
		action: "Mute this track"
	},
	{
		group: "Tracks",
		keys: ["Double-click S"],
		action: "Exclusive solo"
	},
	{
		group: "Help",
		keys: ["?"],
		action: "Keyboard shortcuts"
	}
];
function Workstation() {
	const [panel, setPanel] = (0, import_react.useState)(null);
	const aboutOpen = useEegStore((s) => s.aboutOpen);
	const setAboutOpen = useEegStore((s) => s.setAboutOpen);
	const keysOpen = useEegStore((s) => s.keysOpen);
	const setKeysOpen = useEegStore((s) => s.setKeysOpen);
	const loadFile = useEegStore((s) => s.loadFile);
	const status = useEegStore((s) => s.status);
	useEditorKeys();
	(0, import_react.useEffect)(() => {
		if (status !== "idle") return;
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch("/sample.edf");
				if (!res.ok || cancelled) return;
				const buf = await res.arrayBuffer();
				if (cancelled) return;
				await loadFile(buf, "demo-deidentified.edf");
			} catch {}
		})();
		return () => {
			cancelled = true;
		};
	}, [loadFile, status]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh min-h-0 flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						"aria-label": "Toggle controls",
						onClick: () => {
							const desktop = window.matchMedia("(min-width: 768px)").matches;
							setPanel((v) => {
								return !(v == null ? desktop : v);
							});
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelLeft, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-w-0 flex-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display text-base tracking-tight",
								children: "Auris"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden text-xs text-muted sm:inline",
								children: "EEG sonification"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hidden max-w-xl truncate text-xs text-subtle md:block",
						children: "Educational aid — not a medical device. No seizure detection. Processing is local."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						"aria-label": "Keyboard shortcuts",
						onClick: () => setKeysOpen(true),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Keyboard, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						"aria-label": "About",
						onClick: () => setAboutOpen(true),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, {})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex min-h-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: panel === true ? "absolute inset-0 z-40 flex min-h-0 w-full flex-col border-r border-border bg-surface md:static md:z-0 md:w-80 md:shrink-0" : panel === false ? "hidden" : "hidden min-h-0 w-80 shrink-0 flex-col border-r border-border bg-surface md:flex",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ControlPanel, {})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-h-0 min-w-0 flex-1 flex-col",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReviewBar, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaveformView, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Transport, {})
					]
				})]
			}),
			aboutOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: "About Auris",
				onClose: () => setAboutOpen(false),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 text-pretty text-sm leading-relaxed text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Auris is a local EEG review + listening station. Contour maps the tracing itself: a deflection up on the graph raises pitch. Pen mode (Norata 2023) is the analog paper scratch — pen speed is |dV/dt|, so spikes hiss and isoelectric baseline is almost silent. Choir uses just-intonation partials with 1/f loudness (Wu 2009 scale-free brain-wave music). Piano keeps a scale while the field looks ordinary and leaves it when it does not — educational, not a diagnosis. Traces color by instantaneous frequency (Δ θ α β γ). The DSA strip is a left/right compressed spectral array. Suggested markers are educational — not a diagnosis. Mute and solo are live. Nothing leaves this browser." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The strip at the top is the entire recording. The highlighted window is what the editor shows. Playback is continuous across the file; the playhead can follow while you zoom. Mute (M) and solo (S) work like a mixer — any number of tracks can be soloed; muted tracks are silent without stopping the clock." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "This is a research and teaching aid, not a diagnostic instrument. It does not detect seizures, mark spikes, or interpret studies. Do not load identifiable recordings. Files never leave this device." })
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 flex justify-end",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => setAboutOpen(false),
						children: "Close"
					})
				})]
			}),
			keysOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: "Keyboard shortcuts",
				onClose: () => setKeysOpen(false),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-4 sm:grid-cols-2",
					children: [
						"Playback",
						"View",
						"Review",
						"Tracks",
						"Help"
					].map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-[0.6875rem] font-medium uppercase tracking-wider text-subtle",
						children: group
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-1.5",
						children: SHORTCUTS.filter((k) => k.group === group).map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-baseline justify-between gap-3 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted",
								children: k.action
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex shrink-0 gap-1",
								children: k.keys.map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
									className: "rounded-sm bg-bg px-1.5 py-0.5 font-mono text-[0.6875rem] text-fg shadow-border",
									children: key
								}, key))
							})]
						}, `${group}-${k.action}`))
					})] }, group))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 flex justify-end",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => setKeysOpen(false),
						children: "Close"
					})
				})]
			})
		]
	});
}
function Modal({ title, onClose, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-h-[min(32rem,90dvh)] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-6 shadow-border",
			onClick: (e) => e.stopPropagation(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl tracking-tight",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3",
				children
			})]
		})
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Workstation, {});
}
//#endregion
export { Home as component };
