import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as Expand, S as EyeOff, T as ChevronDown, _ as Lightbulb, b as Headphones, c as SlidersHorizontal, d as Repeat, f as Redo2, g as MousePointer2, h as PanelLeft, i as Undo2, l as Scan, m as Pause, n as ZoomOut, o as Trash2, p as Play, r as Upload, s as Square, t as ZoomIn, u as Ruler, v as Keyboard, w as Download, x as Eye, y as Info } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Ds5V9n9e.js
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
	volume: .88
};
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
	15,
	20,
	30,
	50,
	70,
	100,
	150,
	200,
	300,
	500,
	1e3,
	2e3
];
var MAX_SENSITIVITY_UV = 2e3;
function clampSensitivity(n) {
	if (!Number.isFinite(n)) return 70;
	return Math.min(MAX_SENSITIVITY_UV, Math.max(10, Math.round(n)));
}
/** dir −1 = more sensitive (bigger waves); +1 = less sensitive. */
function stepSensitivity(current, dir) {
	const cur = clampSensitivity(current);
	if (dir < 0) {
		for (let i = SENSITIVITY_PRESETS.length - 1; i >= 0; i--) if (SENSITIVITY_PRESETS[i] < cur) return SENSITIVITY_PRESETS[i];
		return SENSITIVITY_PRESETS[0];
	}
	for (const v of SENSITIVITY_PRESETS) if (v > cur) return v;
	return SENSITIVITY_PRESETS[SENSITIVITY_PRESETS.length - 1];
}
function snapSensitivity(n) {
	const c = clampSensitivity(n);
	let best = SENSITIVITY_PRESETS[0];
	let bestD = Math.abs(best - c);
	for (const p of SENSITIVITY_PRESETS) {
		const d = Math.abs(p - c);
		if (d < bestD) {
			best = p;
			bestD = d;
		}
	}
	return best;
}
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
	if (ekg.length >= 2) {
		const sameRate = ekg[0].sampleRate === ekg[1].sampleRate;
		out.push({
			id: "aux:ekg",
			label: "EKG",
			sources: [ekg[0].index, ekg[1].index],
			laterality: "midline",
			kind: "ekg",
			sampleRate: ekg[0].sampleRate,
			available: sameRate,
			missing: sameRate ? [] : ["matching sample rates"]
		});
	} else for (const c of ekg) out.push(referential(c, "ekg", auxDisplayLabel("ekg", c.canonical)));
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
		const sameRate = ia == null || ib == null || channels.find((c) => c.index === ia)?.sampleRate === channels.find((c) => c.index === ib)?.sampleRate;
		const available = ia != null && ib != null && sameRate;
		if (!sameRate) missing.push("matching sample rates");
		return {
			id: `${prefix}:${a}-${b}`,
			label: `${a}–${b}`,
			sources: available ? [ia, ib] : [ia ?? -1, ib ?? -1],
			laterality: pairLaterality(a, b),
			kind: "eeg",
			sampleRate: ia == null ? rate : channels.find((c) => c.index === ia)?.sampleRate ?? rate,
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
	if (a.length !== b.length) throw new Error(`Cannot derive ${der.label}: source sample counts differ.`);
	const out = new Float32Array(a.length);
	for (let i = 0; i < a.length; i++) out[i] = a[i] - b[i];
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
function requireFiniteField(value, field, signal) {
	if (!Number.isFinite(value)) {
		const suffix = signal == null ? "" : ` for signal ${signal + 1}`;
		throw new Error(`EDF ${field}${suffix} is missing or invalid.`);
	}
}
function parseEdfHeader(buffer) {
	if (buffer.byteLength < 256) throw new Error("File is too small to be an EDF/EDF+ recording.");
	const version = ascii(buffer, 0, 8);
	if (version !== "0") throw new Error("Unsupported EDF version (expected version 0).");
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
	if (!Number.isInteger(headerBytes) || headerBytes !== 256 + nsig * 256) throw new Error("EDF header size does not match the signal count.");
	if (buffer.byteLength < headerBytes) throw new Error("EDF file is truncated in the signal header.");
	if (!Number.isFinite(recordDuration) || recordDuration <= 0) throw new Error("EDF record duration is missing or invalid.");
	if (!Number.isInteger(recordCount) || recordCount < -1 || recordCount === 0) throw new Error("EDF data-record count is invalid.");
	const signals = parseSignalHeaders(buffer, nsig);
	for (const s of signals) {
		requireFiniteField(s.physicalMin, "physical minimum", s.index);
		requireFiniteField(s.physicalMax, "physical maximum", s.index);
		requireFiniteField(s.digitalMin, "digital minimum", s.index);
		requireFiniteField(s.digitalMax, "digital maximum", s.index);
		if (!Number.isInteger(s.digitalMin) || !Number.isInteger(s.digitalMax) || s.digitalMin < -32768 || s.digitalMin > 32767 || s.digitalMax < -32768 || s.digitalMax > 32767) throw new Error(`EDF digital calibration is outside the signed 16-bit range for signal ${s.index + 1}.`);
		if (s.physicalMin === s.physicalMax || s.digitalMin === s.digitalMax) throw new Error(`EDF calibration range is zero for signal ${s.index + 1}.`);
		if (!Number.isInteger(s.samplesPerRecord) || s.samplesPerRecord < 1) throw new Error(`EDF samples per record is invalid for signal ${s.index + 1}.`);
		s.sampleRate = s.samplesPerRecord / recordDuration;
	}
	const bytesPerRecord = signals.reduce((a, s) => a + s.samplesPerRecord * 2, 0);
	const payloadBytes = buffer.byteLength - headerBytes;
	if (payloadBytes < 0 || payloadBytes % bytesPerRecord !== 0) throw new Error("EDF data section contains a truncated or partial data record.");
	const completeRecords = payloadBytes / bytesPerRecord;
	const resolvedRecordCount = recordCount === -1 ? completeRecords : recordCount;
	if (resolvedRecordCount < 1) throw new Error("EDF has no complete data records.");
	if (resolvedRecordCount !== completeRecords) throw new Error("EDF data-record count does not match the file length.");
	if (/^EDF\+D(?:\s|$)/i.test(reserved)) throw new Error("Discontinuous EDF+D recordings are not supported because gaps cannot be represented safely.");
	return {
		version,
		identifierWarning: looksIdentifying(patient, recording),
		startDate,
		startTime,
		headerBytes,
		reserved,
		recordCount: resolvedRecordCount,
		recordDuration,
		duration: resolvedRecordCount * recordDuration,
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
	const calibrated = (digital - s.digitalMin) / spanD * (s.physicalMax - s.physicalMin) + s.physicalMin;
	const unit = s.unit.trim().toLowerCase().replace("μ", "µ");
	const kind = describeChannel(s.index, s.label, s.unit, s.sampleRate).kind;
	if (kind === "eeg" || kind === "eog" || kind === "emg" || kind === "ekg") {
		if (unit === "v") return calibrated * 1e6;
		if (unit === "mv") return calibrated * 1e3;
		if (unit === "uv" || unit === "µv") return calibrated;
		if (unit === "nv") return calibrated * .001;
	}
	return calibrated;
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
function parseTals(bytes) {
	const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	const out = [];
	const chunks = text.split("\0").filter(Boolean);
	for (const chunk of chunks) {
		const parts = chunk.split("");
		if (!parts[0]) continue;
		const durSplit = parts[0].split("");
		if (durSplit.length > 2 || !/^[+-](?:\d+(?:\.\d*)?|\.\d+)$/.test(durSplit[0])) throw new Error("EDF+ annotation onset is invalid.");
		const onset = Number(durSplit[0]);
		if (!Number.isFinite(onset)) throw new Error("EDF+ annotation onset is invalid.");
		if (durSplit[1] != null && durSplit[1] !== "" && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(durSplit[1])) throw new Error("EDF+ annotation duration is invalid.");
		const duration = durSplit[1] != null && durSplit[1] !== "" ? Number(durSplit[1]) : null;
		if (duration != null && (!Number.isFinite(duration) || duration < 0)) throw new Error("EDF+ annotation duration is invalid.");
		const anns = parts.slice(1).map((s) => s.replace(/\0/g, "").trim()).filter(Boolean);
		if (anns.length === 0) out.push({
			onset,
			duration,
			text: ""
		});
		else for (const a of anns) out.push({
			onset,
			duration,
			text: a
		});
	}
	return out;
}
function readAnnotations(buffer, header) {
	const annotationIndexes = header.signals.flatMap((s, index) => s.isAnnotation ? [index] : []);
	if (annotationIndexes.length === 0) return [];
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
		for (const idx of annotationIndexes) {
			const sig = header.signals[idx];
			const base = recOff + offsets[idx];
			const bytes = new Uint8Array(sig.samplesPerRecord * 2);
			for (let i = 0; i < sig.samplesPerRecord; i++) {
				const v = view.getInt16(base + i * 2, true);
				bytes[i * 2] = v & 255;
				bytes[i * 2 + 1] = v >> 8 & 255;
			}
			out.push(...parseTals(bytes));
		}
	}
	return out.filter((a) => a.text);
}
async function loadRecording(file, name) {
	const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
	const header = parseEdfHeader(buffer);
	return {
		name,
		header,
		buffer,
		annotations: readAnnotations(buffer, header)
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
/** Synthetic EEG generators used by tests and the in-app pattern lab. */
function sine(freq, fs, seconds, amp = 1, phase = 0) {
	const n = Math.round(seconds * fs);
	const y = new Float32Array(n);
	const w = 2 * Math.PI * freq / fs;
	for (let i = 0; i < n; i++) y[i] = amp * Math.sin(w * i + phase);
	return y;
}
function pad(s, n) {
	return (s + " ".repeat(n)).slice(0, n);
}
function buildSyntheticEdf(opts) {
	const recDur = opts.recordDuration ?? .1;
	const fs = 200;
	const nsp = Math.round(fs * recDur);
	const nrec = Math.round(opts.duration / recDur);
	const labels = [
		"EEG Fp1",
		"EEG Fp2",
		"EEG Fz",
		"EEG T3",
		"EEG Cz",
		"EDF Annotations"
	];
	const nsig = labels.length;
	const headerBytes = 256 + nsig * 256;
	const annotNsp = 25;
	const bytesPerRec = (nsig - 1) * nsp * 2 + 50;
	const buffer = new ArrayBuffer(headerBytes + nrec * bytesPerRec);
	const view = new DataView(buffer);
	const write = (off, s, n) => {
		const p = pad(s, n);
		for (let i = 0; i < n; i++) view.setUint8(off + i, p.charCodeAt(i));
	};
	write(0, "0", 8);
	write(8, "X X X X", 80);
	write(88, "Startdate 01-JAN-2000 X X Synthetic", 80);
	write(168, "01.01.00", 8);
	write(176, "00.00.00", 8);
	write(184, String(headerBytes), 8);
	write(192, "EDF+C", 44);
	write(236, String(nrec), 8);
	write(244, String(recDur), 8);
	write(252, String(nsig), 4);
	const field = (block, width, i, s) => {
		write(256 + block + i * width, s, width);
	};
	const ns = nsig;
	let cursor = 0;
	const place = (width, values) => {
		const off = cursor;
		values.forEach((v, i) => field(off, width, i, v));
		cursor += width * ns;
	};
	place(16, labels.map((l) => l));
	place(80, labels.map(() => ""));
	place(8, [
		"uV",
		"uV",
		"uV",
		"uV",
		"uV",
		""
	]);
	place(8, [
		"-3200",
		"-3200",
		"-3200",
		"-3200",
		"-3200",
		"-1"
	]);
	place(8, [
		"3200",
		"3200",
		"3200",
		"3200",
		"3200",
		"1"
	]);
	place(8, [
		"-32768",
		"-32768",
		"-32768",
		"-32768",
		"-32768",
		"-32768"
	]);
	place(8, [
		"32767",
		"32767",
		"32767",
		"32767",
		"32767",
		"32767"
	]);
	place(80, labels.map(() => ""));
	place(8, [
		String(nsp),
		String(nsp),
		String(nsp),
		String(nsp),
		String(nsp),
		String(annotNsp)
	]);
	place(32, labels.map(() => ""));
	const physToDig = (uV) => {
		const d = (uV - -3200) / 6400 * 65535 + -32768;
		return Math.max(-32768, Math.min(32767, Math.round(d)));
	};
	const L = opts.left ?? sine(10, fs, opts.duration, 50);
	const R = opts.right ?? sine(10, fs, opts.duration, 50);
	const M = opts.midline ?? sine(10, fs, opts.duration, 20);
	for (let r = 0; r < nrec; r++) {
		let off = headerBytes + r * bytesPerRec;
		const writeCh = (src) => {
			for (let i = 0; i < nsp; i++) {
				const idx = r * nsp + i;
				view.setInt16(off, physToDig(src[idx] ?? 0), true);
				off += 2;
			}
		};
		writeCh(L);
		writeCh(R);
		writeCh(M);
		writeCh(L);
		writeCh(R);
		for (let i = 0; i < annotNsp; i++) {
			view.setInt16(off, 0, true);
			off += 2;
		}
	}
	return buffer;
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
function clamp$1(n, lo, hi) {
	return Math.min(hi, Math.max(lo, n));
}
function clampView(start, duration, total) {
	const tot = Math.max(0, total);
	const minD = Math.min(MIN_VIEW_SEC, tot || .5);
	const dur = clamp$1(duration, minD, Math.max(tot, minD));
	return {
		start: clamp$1(start, 0, Math.max(0, tot - dur)),
		duration: dur
	};
}
/** Zoom `duration` by `factor`, keeping `anchor` (eeg seconds) fixed in the window. */
function zoomView(start, duration, total, factor, anchor) {
	const nextDur = duration * Math.max(.001, factor);
	const rel = duration > 1e-9 ? (anchor - start) / duration : FOLLOW_FRAC;
	const { duration: d } = clampView(0, nextDur, total);
	return clampView(anchor - clamp$1(rel, 0, 1) * d, d, total);
}
function followViewStart(playhead, viewDur, total, frac = FOLLOW_FRAC) {
	return clampView(playhead - viewDur * frac, viewDur, total).start;
}
function timeAtFraction(frac, start, duration) {
	return start + clamp$1(frac, 0, 1) * duration;
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
function samplesPerPixel(sampleRate, t0, t1, nPix) {
	if (nPix <= 0 || sampleRate <= 0) return 0;
	return (t1 - t0) * sampleRate / nPix;
}
/** Linear-interpolated sample at each pixel center — used when zoomed in past 1 sample/px. */
function interpWindow(samples, sampleRate, t0, t1, nPix) {
	const y = new Float32Array(Math.max(0, nPix));
	if (samples.length === 0 || nPix <= 0 || t1 <= t0 || sampleRate <= 0) return y;
	const span = t1 - t0;
	const last = samples.length - 1;
	for (let p = 0; p < nPix; p++) {
		const idx = (t0 + (p + .5) / nPix * span) * sampleRate;
		if (idx <= 0) {
			y[p] = samples[0] ?? 0;
			continue;
		}
		if (idx >= last) {
			y[p] = samples[last] ?? 0;
			continue;
		}
		const i = Math.floor(idx);
		const f = idx - i;
		y[p] = (samples[i] ?? 0) * (1 - f) + (samples[i + 1] ?? 0) * f;
	}
	return y;
}
/** Choose µV/lane so typical |voltage| in the window fills most of a channel. */
function fitSensitivityUv(tracks, t0, t1) {
	let p97 = 0;
	for (const tr of tracks) {
		if (tr.kind !== "eeg" && tr.kind !== "eog") continue;
		const i0 = Math.max(0, Math.floor(t0 * tr.sampleRate));
		const i1 = Math.min(tr.samples.length, Math.max(i0 + 1, Math.ceil(t1 * tr.sampleRate)));
		const n = i1 - i0;
		if (n <= 0) continue;
		const step = Math.max(1, Math.floor(n / 6e3));
		const vals = [];
		for (let i = i0; i < i1; i += step) vals.push(Math.abs(tr.samples[i] ?? 0));
		if (vals.length === 0) continue;
		vals.sort((a, b) => a - b);
		const v = vals[Math.min(vals.length - 1, Math.floor(vals.length * .97))] ?? 0;
		if (v > p97) p97 = v;
	}
	return snapSensitivity(clampSensitivity(Math.max(15, p97 * 2.8)));
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
/** Equal-power pan: -1 left, 0 center, +1 right. */
function equalPowerGains(pan) {
	const theta = (Math.min(1, Math.max(-1, pan)) + 1) * Math.PI / 4;
	return {
		l: Math.cos(theta),
		r: Math.sin(theta)
	};
}
function panForLaterality(lat) {
	return lateralityPan(lat);
}
function mixToStereo(tracks, length) {
	const left = new Float32Array(length);
	const right = new Float32Array(length);
	for (const t of tracks) {
		const { l, r } = equalPowerGains(t.pan);
		const gL = l * t.gain;
		const gR = r * t.gain;
		const n = Math.min(length, t.samples.length);
		for (let i = 0; i < n; i++) {
			const s = t.samples[i];
			left[i] += s * gL;
			right[i] += s * gR;
		}
	}
	return {
		left,
		right
	};
}
function averageChannels(tracks) {
	if (tracks.length === 0) return /* @__PURE__ */ new Float32Array(0);
	const n = Math.min(...tracks.map((t) => t.length));
	const out = new Float32Array(n);
	const inv = 1 / tracks.length;
	for (const t of tracks) for (let i = 0; i < n; i++) out[i] += t[i] * inv;
	return out;
}
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
/** Single-pass bandpass for sonify (phase not clinically meaningful in audio). */
function bandpassForward(x, fs, lo, hi) {
	validateFilterInputs(fs, lo, hi);
	if (x.length < 8) return new Float32Array(x);
	const nyquist = fs / 2 - 1;
	const l = Math.max(.05, Math.min(lo, nyquist * .8));
	const h = Math.max(l + .2, Math.min(hi, nyquist));
	return biquad(biquad(x, rbjHighpass(fs, l)), rbjLowpass(fs, h));
}
/** One-pole rectifier envelope. `envHz` is the follow rate (higher = faster). */
function envelopeFollow(x, fs, envHz) {
	const y = new Float32Array(x.length);
	const a = Math.exp(-2 * Math.PI * Math.max(.1, envHz) / Math.max(1, fs));
	let s = 0;
	for (let i = 0; i < x.length; i++) {
		const v = Math.abs(x[i]);
		s = a * s + (1 - a) * v;
		y[i] = s;
	}
	return y;
}
function applyFilters(x, fs, settings) {
	if (!Number.isFinite(fs) || fs <= 2) throw new Error("Sample rate must be greater than 2 Hz.");
	for (const [name, value] of [
		["LFF", settings.lff],
		["HFF", settings.hff],
		["bandpass low", settings.bandpassLow],
		["bandpass high", settings.bandpassHigh]
	]) if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a finite, non-negative frequency.`);
	if (settings.bandpass) validateFilterInputs(fs, settings.bandpassLow, settings.bandpassHigh);
	const nyquistHz = fs / 2;
	if (settings.lff > 0 && settings.lff >= nyquistHz) throw new Error("LFF must be below Nyquist.");
	if (settings.hff > 0 && settings.hff >= nyquistHz) throw new Error("HFF must be below Nyquist.");
	if (settings.lff > 0 && settings.hff > 0 && settings.hff <= settings.lff) throw new Error("HFF must be greater than LFF.");
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
function validateFilterInputs(fs, lo, hi) {
	if (!Number.isFinite(fs) || fs <= 2) throw new Error("Sample rate must be greater than 2 Hz.");
	if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0 || hi <= lo || hi >= fs / 2) throw new Error("Bandpass frequencies must satisfy 0 < low < high < Nyquist.");
}
function percentileAbs(x, p) {
	if (x.length === 0) return 1;
	const abs = new Float64Array(x.length);
	for (let i = 0; i < x.length; i++) abs[i] = Math.abs(x[i]);
	abs.sort();
	const v = abs[Math.min(abs.length - 1, Math.max(0, Math.floor(p * (abs.length - 1))))];
	return v > 1e-12 ? v : 1;
}
function robustNormalize(x, p = .995, target = .85) {
	const scale = target / percentileAbs(x, p);
	const y = new Float32Array(x.length);
	for (let i = 0; i < x.length; i++) y[i] = x[i] * scale;
	return y;
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
/** Just-intonation choir: 1, 5/4, 3/2, 2 (unison, major third, fifth, octave). */
var JUST_RATIOS = [
	1,
	5 / 4,
	3 / 2,
	2
];
function midiToHz(midi) {
	return 440 * 2 ** ((midi - 69) / 12);
}
function hzToMidi(hz) {
	return 69 + 12 * Math.log2(Math.max(1e-6, hz) / 440);
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
/** Map EEG Hz (0.5–30) onto two octaves of a scale starting an octave below root. */
function eegHzToScaleHz(eegHz, rootMidi, scale) {
	const lo = Math.log(.5);
	const hi = Math.log(30);
	const t = Math.max(0, Math.min(1, (Math.log(Math.max(.25, eegHz)) - lo) / (hi - lo)));
	return midiToHz(quantizeMidi(rootMidi - 12 + t * 24, SCALE_DEGREES[scale], rootMidi));
}
function interpolate$1(x, index) {
	if (x.length === 0) return 0;
	if (index <= 0) return x[0];
	if (index >= x.length - 1) return x[x.length - 1];
	const i = Math.floor(index);
	const f = index - i;
	return x[i] * (1 - f) + x[i + 1] * f;
}
function resample(x, eegRate, audioRate, timeScale) {
	const eegDur = x.length / Math.max(1, eegRate);
	const audioDur = Math.max(1 / audioRate, eegDur / Math.max(.1, timeScale));
	const n = Math.max(1, Math.round(audioDur * audioRate));
	const out = new Float32Array(n);
	const step = (x.length - 1) / Math.max(1, n - 1);
	for (let i = 0; i < n; i++) out[i] = interpolate$1(x, i * step);
	return out;
}
function tone(n, rate, hz, env, harmonic = .14) {
	const out = new Float32Array(n);
	const w = 2 * Math.PI * hz / rate;
	const w2 = 2 * Math.PI * hz * 2 / rate;
	for (let i = 0; i < n; i++) {
		const e = env[i] ?? 0;
		out[i] = (Math.sin(w * i) + harmonic * Math.sin(w2 * i)) * e;
	}
	return out;
}
var BANDS = [
	{
		lo: .5,
		hi: 4,
		envHz: 6
	},
	{
		lo: 4,
		hi: 8,
		envHz: 8
	},
	{
		lo: 8,
		hi: 13,
		envHz: 10
	},
	{
		lo: 13,
		hi: 30,
		envHz: 14
	}
];
/**
* Rhythm choir: each clinical band drives one just-intonation partial.
* 1/f amplitudes (Wu 2009 scale-free brain-wave music) keep the chord warm.
* 3 Hz spike-and-wave pulses the bass; 10 Hz alpha sings the fifth.
*/
function choirVoice(eeg, eegRate, settings) {
	const norm = robustNormalize(eeg, settings.percentile, .9);
	const timeScale = settings.timeScale;
	const audioRate = settings.outputRate;
	const rootHz = midiToHz(settings.rootMidi);
	let mixed = null;
	for (let b = 0; b < BANDS.length; b++) {
		const band = BANDS[b];
		const audioEnv = resample(envelopeFollow(bandpassForward(norm, eegRate, band.lo, band.hi), eegRate, band.envHz), eegRate, audioRate, timeScale);
		const hz = rootHz * JUST_RATIOS[b];
		const oneOverF = 1 / (b + 1);
		const voice = tone(audioEnv.length, audioRate, hz, audioEnv, .08);
		if (!mixed) {
			mixed = new Float32Array(voice.length);
			for (let i = 0; i < voice.length; i++) mixed[i] = voice[i] * oneOverF;
		} else {
			const n = Math.min(mixed.length, voice.length);
			for (let i = 0; i < n; i++) mixed[i] += voice[i] * oneOverF;
		}
	}
	return fadeEdges(softLimit(mixed ?? /* @__PURE__ */ new Float32Array(1), .85), audioRate, 12);
}
function dominantHz$1(x, fs, i0, i1) {
	let zc = 0;
	let prev = x[i0] ?? 0;
	for (let i = i0 + 1; i < i1; i++) {
		const v = x[i];
		if (prev <= 0 && v > 0) zc++;
		prev = v;
	}
	return zc / Math.max(1e-6, (i1 - i0) / fs);
}
function scaleVoice(eeg, eegRate, settings) {
	const norm = robustNormalize(eeg, settings.percentile, .9);
	const timeScale = settings.timeScale;
	const audioRate = settings.outputRate;
	const audio = resample(norm, eegRate, audioRate, timeScale);
	const n = audio.length;
	const out = new Float32Array(n);
	let phase = 0;
	let hz = midiToHz(settings.rootMidi);
	let env = 0;
	let heldMidi = settings.rootMidi;
	let noteCooldown = 0;
	let hammer = 0;
	let fast = 0;
	let slow = 0;
	const win = Math.max(8, Math.round(eegRate * .12 / timeScale));
	for (let i = 0; i < n; i++) {
		const eegI = i / n * (eeg.length - 1);
		const inst = dominantHz$1(eeg, eegRate, Math.max(0, Math.floor(eegI - win / 2)), Math.min(eeg.length, Math.floor(eegI + win / 2)));
		const target = settings.quantize ? eegHzToScaleHz(inst || 8, settings.rootMidi, settings.scale) : midiToHz(settings.rootMidi + Math.max(-1, Math.min(1, audio[i])) * settings.rangeSemitones);
		if (settings.mode === "piano") {
			const sample = audio[i] ?? 0;
			const fastA = 1 - Math.exp(-1 / Math.max(1, audioRate * .01));
			const slowA = 1 - Math.exp(-1 / Math.max(1, audioRate * .09));
			fast += fastA * (sample - fast);
			slow += slowA * (sample - slow);
			const abnormal = Math.abs(fast - slow) > .18 ? Math.abs(sample) > .28 ? 6 : .35 : 0;
			const requestedMidi = hzToMidi(target) + abnormal;
			noteCooldown = Math.max(0, noteCooldown - 1);
			if (noteCooldown <= 0 && Math.abs(requestedMidi - heldMidi) > .45) {
				heldMidi = requestedMidi;
				noteCooldown = Math.max(1, Math.round(audioRate * .11));
				hammer = 1;
			}
			hammer *= Math.exp(-1 / Math.max(1, audioRate * .085));
			const pianoTarget = midiToHz(heldMidi);
			hz += .07 * (pianoTarget - hz);
			const pianoShape = Math.sin(phase) + .5 * Math.sin(phase * 2) + .24 * Math.sin(phase * 3) + .11 * Math.sin(phase * 4) + hammer * .34 * Math.sin(phase * 7);
			env += .05 * (Math.min(1, Math.abs(sample) * 1.35) - env);
			phase += 2 * Math.PI * hz / audioRate;
			out[i] = pianoShape * env;
			continue;
		}
		hz += .04 * (target - hz);
		env += .05 * (Math.min(1, Math.abs(audio[i]) * 1.4) - env);
		phase += 2 * Math.PI * hz / audioRate;
		out[i] = Math.sin(phase) * env;
	}
	return fadeEdges(softLimit(out, .9), audioRate, 10);
}
function ekgVoice(eeg, eegRate, settings) {
	const env = envelopeFollow(eeg, eegRate, 18);
	const timeScale = settings.mode === "direct" ? settings.compression : settings.timeScale;
	const audioRate = settings.outputRate;
	const audioEnv = resample(env, eegRate, audioRate, timeScale);
	const n = audioEnv.length;
	const out = new Float32Array(n);
	const w = 2 * Math.PI * 56 / audioRate;
	for (let i = 0; i < n; i++) {
		const e = audioEnv[i];
		out[i] = Math.sin(w * i) * e * e;
	}
	return fadeEdges(softLimit(out, 1.05), audioRate, 8);
}
function eogVoice(eeg, eegRate, settings) {
	const env = envelopeFollow(bandpassForward(eeg, eegRate, .1, 8), eegRate, 4);
	const timeScale = settings.mode === "direct" ? settings.compression : settings.timeScale;
	const audioRate = settings.outputRate;
	const audioEnv = resample(env, eegRate, audioRate, timeScale);
	const n = audioEnv.length;
	const out = new Float32Array(n);
	const w = 2 * Math.PI * 186 / audioRate;
	let noise = 0;
	for (let i = 0; i < n; i++) {
		noise = (noise * .96 + Math.sin(i * 12.9898) * 43758.5453 % 1) % 1;
		const e = audioEnv[i];
		out[i] = (.7 * Math.sin(w * i) + .35 * (noise * 2 - 1)) * e;
	}
	return fadeEdges(softLimit(out, 1.05), audioRate, 10);
}
function timeScaleFor(settings) {
	if (settings.mode === "direct") return settings.compression;
	return settings.timeScale;
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
function interpolate(x, index) {
	if (x.length === 0) return 0;
	if (index <= 0) return x[0];
	if (index >= x.length - 1) return x[x.length - 1];
	const i = Math.floor(index);
	const f = index - i;
	return x[i] * (1 - f) + x[i + 1] * f;
}
/** Play the EEG waveform C× faster so EEG frequencies enter the audible band. */
function timeCompress(eeg, eegRate, compression, audioRate) {
	const eegDur = eeg.length / eegRate;
	const audioDur = Math.max(1 / audioRate, eegDur / Math.max(1, compression));
	const n = Math.max(1, Math.round(audioDur * audioRate));
	const out = new Float32Array(n);
	const step = (eeg.length - 1) / Math.max(1, n - 1);
	for (let i = 0; i < n; i++) out[i] = interpolate(eeg, i * step);
	return out;
}
function highShelf(x, amount) {
	if (amount <= .001) return x;
	const y = new Float32Array(x.length);
	let prev = x[0] ?? 0;
	const mix = Math.min(1, Math.max(0, amount));
	for (let i = 0; i < x.length; i++) {
		const d = x[i] - prev;
		prev = x[i];
		y[i] = x[i] * (1 - mix) + d * mix * 4;
	}
	return y;
}
function sonifyTrack(eeg, eegRate, settings, kind = "eeg") {
	if (kind === "ekg") return ekgVoice(eeg, eegRate, settings);
	if (kind === "eog" || kind === "emg") return eogVoice(eeg, eegRate, settings);
	if (settings.mode === "choir" || settings.mode === "ambient") return choirVoice(eeg, eegRate, settings);
	if (settings.mode === "contour" || settings.mode === "pulse" || settings.mode === "piano" || settings.mode === "pen") return scaleVoice(eeg, eegRate, settings);
	return fadeEdges(softLimit(timeCompress(highShelf(robustNormalize(eeg, settings.percentile, .85), settings.brightness), eegRate, settings.compression, settings.outputRate), 1.15), settings.outputRate, 8);
}
function averageGroup(tracks) {
	return averageChannels(tracks.map((t) => t.samples));
}
/** For choir/scale, mix EEG into L/R/midline buses so 18 channels don't become hiss. */
function groupForMusify(tracks) {
	const eeg = tracks.filter((t) => t.kind === "eeg" && t.audible && t.samples.length);
	const extras = tracks.filter((t) => t.kind !== "eeg" && t.audible && t.samples.length);
	const grouped = [];
	const buckets = {
		left: [],
		right: [],
		midline: []
	};
	for (const t of eeg) buckets[t.laterality === "right" ? "right" : t.laterality === "left" ? "left" : "midline"].push(t);
	[
		"left",
		"right",
		"midline"
	].forEach((side) => {
		const list = buckets[side];
		if (list.length === 0) return;
		grouped.push({
			id: `bus:${side}`,
			label: side === "left" ? "Left EEG" : side === "right" ? "Right EEG" : "Midline EEG",
			samples: list.length === 1 ? list[0].samples : averageGroup(list),
			sampleRate: list[0].sampleRate,
			laterality: side,
			kind: "eeg",
			gain: 1,
			audible: true
		});
	});
	return [...grouped, ...extras];
}
function mixSonify(tracks, settings, combine) {
	const audible = tracks.filter((t) => t.audible && t.samples.length > 0);
	const compressionUsed = timeScaleFor(settings);
	const empty = {
		left: /* @__PURE__ */ new Float32Array(0),
		right: /* @__PURE__ */ new Float32Array(0),
		sampleRate: settings.outputRate,
		duration: 0,
		eegDuration: 0,
		compressionUsed,
		peak: 0,
		clipped: false
	};
	if (audible.length === 0) return empty;
	const eegDur = audible[0].samples.length / audible[0].sampleRate;
	const musical = settings.mode === "choir" || settings.mode === "ambient" || settings.mode === "piano" || settings.mode === "pen";
	const voices = musical ? groupForMusify(audible) : audible;
	let mixed;
	if (combine === "average" && !musical) {
		const audio = sonifyTrack(averageChannels(voices.map((t) => t.samples)), voices[0].sampleRate, settings, "eeg");
		mixed = {
			left: audio,
			right: new Float32Array(audio)
		};
	} else {
		const sonified = voices.map((t) => ({
			samples: sonifyTrack(t.samples, t.sampleRate, settings, t.kind),
			pan: panForLaterality(t.laterality),
			gain: t.gain
		}));
		mixed = mixToStereo(sonified, Math.max(...sonified.map((s) => s.samples.length), 0));
	}
	const peak = Math.max(peakAbs(mixed.left), peakAbs(mixed.right), 1e-9);
	const target = .89;
	if (peak > target) {
		const g = target / peak;
		for (let i = 0; i < mixed.left.length; i++) {
			mixed.left[i] *= g;
			mixed.right[i] *= g;
		}
	}
	const finalPeak = Math.max(peakAbs(mixed.left), peakAbs(mixed.right));
	const clipped = finalPeak > .999 || hasNan(mixed.left) || hasNan(mixed.right);
	return {
		left: mixed.left,
		right: mixed.right,
		sampleRate: settings.outputRate,
		duration: mixed.left.length / settings.outputRate,
		eegDuration: eegDur,
		compressionUsed,
		peak: finalPeak,
		clipped
	};
}
var SCRUB_GRAIN_SECONDS = .11;
function scrubPreviewTime(eegTime, velocity, progress, timeScale, duration) {
	const direction = velocity < 0 ? -1 : 1;
	const span = clamp$1(Math.max(.25, timeScale) * SCRUB_GRAIN_SECONDS / 2, .08, .42);
	return clamp$1(eegTime + direction * clamp$1(progress, 0, 1) * span, 0, Math.max(0, duration));
}
function writeString(view, offset, s) {
	for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}
function interpolateControl(samples, index) {
	if (samples.length === 0) return 0;
	if (index <= 0) return samples[0];
	if (index >= samples.length - 1) return samples[samples.length - 1];
	const i = Math.floor(index);
	const f = index - i;
	return samples[i] * (1 - f) + samples[i + 1] * f;
}
function trackScale(samples) {
	return 1 / Math.max(1e-6, percentileAbs(samples, .995));
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
	soundEnabled = false;
	sessionDirty = false;
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
	scrubSource = null;
	scrubGain = null;
	scrubPending = null;
	scrubTimer = null;
	scrubActive = false;
	lastScrubMs = 0;
	async ensure() {
		if (!this.ctx) this.ctx = new AudioContext();
		if (this.ctx.state === "suspended") await this.ctx.resume();
		if (!this.ready) this.ready = this.ctx.audioWorklet.addModule(`/contour-worklet.js?v=loui-2014`).then(() => {
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
			this.ready = null;
			throw new Error("Audio could not start. Your browser must support AudioWorklet.", { cause: err });
		});
		await this.ready;
		return this.ctx;
	}
	setControlTracks(tracks, eegDuration) {
		this.controls = tracks;
		this.eegDur = eegDuration;
		this.endedFired = false;
		this.sessionDirty = true;
		if (this.node) this.pushSession();
	}
	pushSession() {
		if (!this.node || !this.sessionDirty) return;
		const tracks = this.controls.map((t) => ({
			...t,
			scale: t.id === "evidence:loui-2014-events" ? 1 / 40 : 1 / Math.max(1e-6, percentileAbs(t.voltage, .995))
		}));
		this.node.port.postMessage({
			type: "session",
			eegDuration: this.eegDur,
			tracks
		});
		this.sessionDirty = false;
		this.pushSettings();
	}
	setSoundEnabled(enabled) {
		this.pause();
		this.endScrub();
		this.soundEnabled = enabled;
		if (this.master) this.master.gain.value = enabled ? 1 : 0;
		if (!enabled && this.ctx) this.ctx.suspend();
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
		const position = this.currentTime();
		this.sonify = sonify;
		this.negativeUp = negativeUp;
		this.timeScale = sonify.mode === "direct" ? sonify.compression : sonify.timeScale;
		this.eegOffset = position;
		this.startedAt = this.clock();
		this.pushSettings();
	}
	clock() {
		return this.soundEnabled && this.ctx ? this.ctx.currentTime : performance.now() / 1e3;
	}
	pushSettings() {
		const s = this.sonify;
		if (!s || !this.node) return;
		if (this.lp) this.lp.frequency.value = s.mode === "loui" || s.mode === "loui-hybrid" ? 4200 : s.mode === "pen" ? 4200 : s.mode === "piano" ? 2800 : s.mode === "choir" || s.mode === "ambient" ? 2200 : 2400;
		this.node.port.postMessage({
			type: "settings",
			timeScale: this.timeScale,
			rootMidi: s.rootMidi,
			rangeSemitones: s.rangeSemitones,
			negativeUp: this.negativeUp,
			quantize: s.quantize,
			degrees: SCALE_DEGREES[s.scale],
			mode: s.mode,
			volume: s.volume ?? .88
		});
	}
	/** EEG seconds. */
	currentTime() {
		if (!this.playing) return Math.min(this.eegDur, Math.max(0, this.eegOffset));
		let t = this.eegOffset + (this.clock() - this.startedAt) * this.timeScale;
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
		if (this.soundEnabled) {
			await this.ensure();
			this.pushSession();
			if (!this.node) throw new Error("Audio worklet is unavailable.");
		}
		this.endedFired = false;
		if (this.eegOffset >= this.eegDur - .001) this.eegOffset = 0;
		if (this.soundEnabled) this.node?.port.postMessage({
			type: "play",
			eegTime: this.eegOffset
		});
		this.startedAt = this.clock();
		this.playing = true;
	}
	pause() {
		if (!this.playing) return;
		this.eegOffset = this.currentTime();
		this.node?.port.postMessage({ type: "pause" });
		this.playing = false;
	}
	stop() {
		this.endScrub();
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
		if (this.playing) {
			this.startedAt = this.clock();
			if (this.soundEnabled) this.node?.port.postMessage({
				type: "play",
				eegTime: this.eegOffset
			});
		}
	}
	/** Play a short, rate-limited preview grain under the pointer during a scrub. */
	scrubAt(eegTime, velocity = 0) {
		if (!this.soundEnabled) return;
		this.scrubActive = true;
		this.scrubPending = {
			eegTime: Math.max(0, Math.min(this.eegDur, eegTime)),
			velocity
		};
		const now = typeof performance === "undefined" ? 0 : performance.now();
		const wait = Math.max(0, 28 - (now - this.lastScrubMs));
		if (wait > 0) {
			if (!this.scrubTimer) this.scrubTimer = setTimeout(() => {
				this.scrubTimer = null;
				this.flushScrub();
			}, wait);
			return;
		}
		this.flushScrub();
	}
	endScrub() {
		this.scrubActive = false;
		this.scrubPending = null;
		if (this.scrubTimer) clearTimeout(this.scrubTimer);
		this.scrubTimer = null;
		const ctx = this.ctx;
		const source = this.scrubSource;
		const gain = this.scrubGain;
		this.scrubSource = null;
		this.scrubGain = null;
		if (!ctx || !source || !gain) return;
		const at = ctx.currentTime;
		gain.gain.cancelScheduledValues(at);
		gain.gain.setTargetAtTime(0, at, .006);
		try {
			source.stop(at + .035);
		} catch {}
	}
	flushScrub() {
		if (!this.scrubActive || !this.scrubPending) return;
		const request = this.scrubPending;
		this.scrubPending = null;
		this.lastScrubMs = typeof performance === "undefined" ? 0 : performance.now();
		this.ensure().then((ctx) => {
			if (!this.scrubActive || !this.master) return;
			this.renderScrub(ctx, request);
		});
	}
	renderScrub(ctx, request) {
		const active = this.controls.filter((track) => {
			if (track.mute || track.voltage.length === 0) return false;
			return !this.controls.some((other) => other.solo) || track.solo;
		});
		if (active.length === 0) return;
		const seconds = SCRUB_GRAIN_SECONDS;
		const n = Math.max(256, Math.round(ctx.sampleRate * seconds));
		const buffer = ctx.createBuffer(2, n, ctx.sampleRate);
		const left = buffer.getChannelData(0);
		const right = buffer.getChannelData(1);
		const settings = this.sonify;
		const scale = settings?.rangeSemitones ?? 8;
		const rootHz = 440 * 2 ** (((settings?.rootMidi ?? 50) - 69) / 12);
		const phases = active.slice(0, 6).map(() => 0);
		const scrubScales = active.slice(0, 6).map((track) => trackScale(track.voltage));
		for (let i = 0; i < n; i++) {
			const progress = i / Math.max(1, n - 1);
			const eegT = scrubPreviewTime(request.eegTime, request.velocity, progress, this.timeScale, this.eegDur);
			const fade = Math.sin(Math.PI * progress);
			let l = 0;
			let r = 0;
			active.slice(0, 6).forEach((track, index) => {
				const raw = interpolateControl(track.voltage, eegT * track.sampleRate);
				const vn = Math.max(-1, Math.min(1, raw * (scrubScales[index] ?? 1)));
				const hz = settings?.mode === "direct" ? 120 + Math.abs(vn) * 680 : rootHz * 2 ** (vn * scale / 12);
				phases[index] = (phases[index] + 2 * Math.PI * Math.max(55, Math.min(1800, hz)) / ctx.sampleRate) % (2 * Math.PI);
				const energy = .035 + Math.min(.16, Math.abs(vn) * .18);
				const sample = Math.sin(phases[index]) * energy * (.55 + .45 * Math.abs(vn)) * track.gain;
				const pan = Math.max(-1, Math.min(1, track.pan));
				l += sample * Math.cos((pan + 1) * Math.PI / 4);
				r += sample * Math.sin((pan + 1) * Math.PI / 4);
			});
			left[i] = l * fade;
			right[i] = r * fade;
		}
		this.endScrubSourceOnly();
		const source = ctx.createBufferSource();
		const gain = ctx.createGain();
		source.buffer = buffer;
		source.connect(gain);
		gain.connect(this.master);
		const at = ctx.currentTime + .004;
		gain.gain.setValueAtTime(0, at);
		gain.gain.linearRampToValueAtTime(.72, at + .012);
		gain.gain.setTargetAtTime(0, at + seconds * .72, .018);
		source.start(at);
		source.stop(at + seconds + .04);
		this.scrubSource = source;
		this.scrubGain = gain;
		source.onended = () => {
			if (this.scrubSource === source) {
				this.scrubSource = null;
				this.scrubGain = null;
			}
			gain.disconnect();
		};
	}
	endScrubSourceOnly() {
		const source = this.scrubSource;
		const gain = this.scrubGain;
		this.scrubSource = null;
		this.scrubGain = null;
		if (!source || !gain || !this.ctx) return;
		const at = this.ctx.currentTime;
		gain.gain.cancelScheduledValues(at);
		gain.gain.setTargetAtTime(0, at, .004);
		try {
			source.stop(at + .028);
		} catch {}
	}
	setLoop(loop) {
		this.loop = loop;
	}
	bounceWav(negativeUp) {
		if (!this.sonify || this.controls.length === 0) return null;
		if (this.sonify.mode !== "ambient" && this.sonify.mode !== "choir" && this.sonify.mode !== "piano") return renderContour(this.controls, this.eegDur, settingsToOpts(this.sonify, negativeUp));
		const anySolo = this.controls.some((track) => track.solo);
		return mixSonify(this.controls.map((track) => ({
			id: track.id,
			label: track.label,
			samples: track.voltage,
			sampleRate: track.sampleRate,
			laterality: track.laterality,
			kind: track.kind,
			gain: track.gain,
			audible: !track.mute && (!anySolo || track.solo)
		})), this.sonify, "per-track");
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
		if (d.sources.map((index) => recording.header.signals[index]?.sampleRate).some((rate) => rate == null || rate !== d.sampleRate)) throw new Error(`Cannot process ${d.label}: derivation source rates do not match.`);
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
var MORPHOLOGY_TYPES = [
	"spike",
	"sharp",
	"slow",
	"spike-wave",
	"polyspike",
	"periodic",
	"burst-suppression",
	"spindle",
	"alpha",
	"triphasic",
	"blink",
	"qrs",
	"muscle",
	"comment"
];
var ANNOTATION_SOURCES = [
	"user",
	"auto",
	"file"
];
var MAX_TEXT_LENGTH = 2e3;
var AnnotationImportError = class extends Error {
	index;
	constructor(message, index) {
		super(index === void 0 ? message : `Annotation ${index + 1}: ${message}`);
		this.name = "AnnotationImportError";
		this.index = index;
	}
};
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isMorphologyType(value) {
	return typeof value === "string" && MORPHOLOGY_TYPES.includes(value);
}
function isSource(value) {
	return typeof value === "string" && ANNOTATION_SOURCES.includes(value);
}
function stableImportId(index, start, end, text) {
	let hash = 2166136261;
	for (const char of `${index}|${start}|${end}|${text}`) {
		hash ^= char.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return `file-${index + 1}-${(hash >>> 0).toString(36)}`;
}
/**
* Converts external annotation data to the app's stable shape. Invalid entries
* fail the entire import so a partially imported clinical note cannot be missed.
*/
function validateAnnotations(value, options) {
	if (!Number.isFinite(options.duration) || options.duration < 0) throw new AnnotationImportError("recording duration is invalid");
	if (!Array.isArray(value)) throw new AnnotationImportError("JSON must contain an array of annotations");
	const knownTracks = options.trackIds ? new Set(options.trackIds) : null;
	const usedIds = /* @__PURE__ */ new Set();
	return value.map((raw, index) => {
		if (!isRecord(raw)) throw new AnnotationImportError("must be an object", index);
		const start = raw.start;
		const end = raw.end;
		const text = raw.text;
		const type = raw.type;
		const trackId = raw.trackId ?? raw.track ?? null;
		const confidence = raw.confidence ?? 1;
		const id = raw.id;
		if (typeof start !== "number" || !Number.isFinite(start) || start < 0) throw new AnnotationImportError("start must be a non-negative number", index);
		if (typeof end !== "number" || !Number.isFinite(end) || end < start || end > options.duration) throw new AnnotationImportError("end must be at or after start and within the recording", index);
		if (!isMorphologyType(type)) throw new AnnotationImportError("has an unknown annotation type", index);
		if (typeof text !== "string" || text.length > MAX_TEXT_LENGTH) throw new AnnotationImportError(`text must be a string up to ${MAX_TEXT_LENGTH} characters`, index);
		if (trackId !== null && (typeof trackId !== "string" || !trackId.trim())) throw new AnnotationImportError("channel must be null or a non-empty string", index);
		if (knownTracks && trackId !== null && !knownTracks.has(trackId)) throw new AnnotationImportError(`channel '${trackId}' is not available in this recording`, index);
		if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new AnnotationImportError("confidence must be between 0 and 1", index);
		if (id !== void 0 && (typeof id !== "string" || !id.trim())) throw new AnnotationImportError("id must be a non-empty string", index);
		const stableId = typeof id === "string" ? id : stableImportId(index, start, end, text);
		if (usedIds.has(stableId)) throw new AnnotationImportError("id must be unique", index);
		usedIds.add(stableId);
		return {
			id: stableId,
			start,
			end,
			trackId,
			type,
			text,
			source: options.source ?? (isSource(raw.source) ? raw.source : "file"),
			confidence
		};
	});
}
function parseAnnotationsJson(json, options) {
	try {
		return validateAnnotations(JSON.parse(json), options);
	} catch (error) {
		if (error instanceof AnnotationImportError) throw error;
		throw new AnnotationImportError("file is not valid JSON");
	}
}
function annotationHistoryUndo(past, current, future) {
	const previous = past.at(-1);
	if (!previous) return {
		past,
		current,
		future
	};
	return {
		past: past.slice(0, -1),
		current: previous,
		future: [current, ...future]
	};
}
function annotationHistoryRedo(past, current, future) {
	const next = future[0];
	if (!next) return {
		past,
		current,
		future
	};
	return {
		past: [...past, current],
		current: next,
		future: future.slice(1)
	};
}
/**
* A small, intentionally bounded event-sonification pipeline.  It is an
* experimental listening aid: it does not classify EEG or make diagnoses.
*/
var SESSION_VERSION = "auris-event-session-v1";
var freeze = (value) => Object.freeze(value);
var clamp = (value, low, high) => Math.min(high, Math.max(low, value));
function finite(value, label) {
	if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
	return value;
}
function filterCopy(filters) {
	return freeze({
		bandpass: Boolean(filters.bandpass),
		bandpassLow: finite(filters.bandpassLow, "bandpassLow"),
		bandpassHigh: finite(filters.bandpassHigh, "bandpassHigh"),
		lff: finite(filters.lff, "lff"),
		hff: finite(filters.hff, "hff"),
		notch60: Boolean(filters.notch60),
		removeDc: Boolean(filters.removeDc)
	});
}
function maxAbs(samples, from, to) {
	let out = 0;
	for (let i = from; i < to; i++) {
		const value = samples[i] ?? 0;
		if (!Number.isFinite(value)) throw new Error("Track contains a non-finite sample.");
		out = Math.max(out, Math.abs(value));
	}
	return Math.max(out, 1e-12);
}
function controlFor(id, controls) {
	const found = controls.find((control) => control.id === id);
	if (found?.gain !== void 0) finite(found.gain, `gain for ${id}`);
	if (found?.pan !== void 0) finite(found.pan, `pan for ${id}`);
	return {
		id,
		gain: clamp(found?.gain ?? 1, 0, 4),
		mute: Boolean(found?.mute),
		pan: clamp(found?.pan ?? 0, -1, 1)
	};
}
function mappingId(value) {
	if (value === "contour-v1" || value === "rms-pulse-v1") return value;
	if (value === "loui-2014-fz-cz-v1") throw new Error("Use the dedicated Loui 2014 study-reproduction generator.");
	throw new Error("Unknown mapping id.");
}
function styleId(value) {
	if (value === "plain-v1" || value === "soft-v1" || value === "pentatonic-v1" || value === "loui-neutral-v1" || value === "loui-soft-v1") return value;
	throw new Error("Unknown style id.");
}
function mapFeature(feature, mapping, scale, control) {
	const magnitude = clamp(feature.features.rms / scale, 0, 1);
	const signed = clamp(feature.features.mean / scale, -1, 1);
	const contour = mapping === "contour-v1";
	const frequencyHz = contour ? 420 * Math.pow(2, signed) : 130 + 520 * magnitude;
	const amplitude = (contour ? .07 + magnitude * .23 : .05 + magnitude * .28) * control.gain * (control.mute ? 0 : 1);
	return freeze({
		id: `map:${feature.id}`,
		type: "tone-event-v1",
		derivesFrom: freeze([feature.id]),
		time: feature.time,
		frequencyHz,
		amplitude,
		pan: control.pan,
		waveform: contour ? "sine" : "pulse",
		mapping: freeze({
			id: mapping,
			version: "1.0.0",
			classification: "X",
			statement: "Experimental mapping for listening and teaching; it does not detect seizures or other conditions."
		}),
		source: feature.source
	});
}
var PENTATONIC = [
	0,
	2,
	4,
	7,
	9
];
function pentatonicFrequency(frequencyHz) {
	const midi = 69 + 12 * Math.log2(Math.max(frequencyHz, 1) / 440);
	let best = midi;
	let error = Number.POSITIVE_INFINITY;
	for (let octave = -2; octave <= 12; octave++) for (const degree of PENTATONIC) {
		const candidate = 12 * octave + degree;
		const candidateError = Math.abs(candidate - midi);
		if (candidateError < error || candidateError === error && candidate < best) {
			best = candidate;
			error = candidateError;
		}
	}
	return 440 * Math.pow(2, (best - 69) / 12);
}
/** Returns a new event and records every audible parameter changed by style. */
function applyStyle(event, style) {
	style = styleId(style);
	let frequencyHz = event.frequencyHz;
	let amplitude = event.amplitude;
	let waveform = event.waveform;
	const changes = [];
	if (style === "soft-v1") {
		amplitude *= .72;
		waveform = "sine";
		changes.push("amplitude × 0.72", "waveform → sine");
	}
	if (style === "pentatonic-v1") {
		frequencyHz = pentatonicFrequency(frequencyHz);
		changes.push("frequency quantized to C-major pentatonic");
	}
	if (style === "loui-neutral-v1") changes.push("no downstream style applied");
	if (style === "loui-soft-v1") {
		amplitude *= .72;
		waveform = "soft-sine";
		changes.push("amplitude × 0.72", "soft second harmonic added; mapped pitch unchanged");
	}
	if (style === "plain-v1") changes.push("no acoustic parameters changed");
	return freeze({
		...event,
		frequencyHz,
		amplitude,
		waveform,
		style: freeze({
			id: style,
			version: "1.0.0",
			changes: freeze(changes)
		})
	});
}
function generateSession(tracks, options) {
	const requestedStart = finite(options.start, "start");
	const requestedEnd = finite(options.end, "end");
	if (requestedStart < 0 || requestedEnd <= requestedStart) throw new Error("Region must have finite bounds with 0 ≤ start < end.");
	const start = requestedStart;
	const end = Math.min(requestedEnd, start + 30);
	const windowSeconds = options.windowSeconds ?? .25;
	if (!Number.isFinite(windowSeconds) || windowSeconds <= 0 || windowSeconds > 2) throw new Error("windowSeconds must be in (0, 2].");
	const mapping = mappingId(options.mapping ?? "contour-v1");
	const style = styleId(options.style ?? "plain-v1");
	const filters = filterCopy(options.filters);
	const features = [];
	const mapped = [];
	const controls = options.trackControls ?? [];
	for (const track of tracks) {
		if (!Number.isFinite(track.sampleRate) || track.sampleRate <= 0) throw new Error(`Track ${track.id} has an invalid sample rate.`);
		const first = Math.max(0, Math.ceil(start * track.sampleRate));
		const last = Math.min(track.samples.length, Math.ceil(end * track.sampleRate));
		const control = controlFor(track.id, controls);
		const scale = maxAbs(track.samples, first, last);
		const width = Math.max(1, Math.round(windowSeconds * track.sampleRate));
		for (let sampleStart = first, ordinal = 0; sampleStart < last; sampleStart += width, ordinal++) {
			const sampleEnd = Math.min(last, sampleStart + width);
			let sum = 0, squares = 0, line = 0;
			for (let i = sampleStart; i < sampleEnd; i++) {
				const value = track.samples[i] ?? 0;
				if (!Number.isFinite(value)) throw new Error(`Track ${track.id} contains a non-finite sample.`);
				sum += value;
				squares += value * value;
				if (i > sampleStart) line += Math.abs(value - (track.samples[i - 1] ?? 0));
			}
			const count = sampleEnd - sampleStart;
			const feature = freeze({
				id: `feature:${track.id}:${sampleStart}:${ordinal}`,
				type: "feature-window-v1",
				time: freeze({
					start: sampleStart / track.sampleRate,
					end: sampleEnd / track.sampleRate
				}),
				source: freeze({
					trackId: track.id,
					channel: track.label,
					laterality: track.laterality,
					kind: track.kind,
					sampleRate: track.sampleRate,
					inputSampleStart: sampleStart,
					inputSampleEndExclusive: sampleEnd,
					sourceTimeStart: sampleStart / track.sampleRate,
					sourceTimeEnd: sampleEnd / track.sampleRate,
					derivationSources: freeze([...options.sourceDerivations?.[track.id] ?? []]),
					normalizationScale: scale,
					windowSeconds,
					filters
				}),
				features: freeze({
					mean: sum / count,
					rms: Math.sqrt(squares / count),
					lineLength: line
				})
			});
			features.push(feature);
			mapped.push(mapFeature(feature, mapping, scale, control));
		}
	}
	const events = mapped.map((event) => applyStyle(event, style));
	const mappingInfo = mapped[0]?.mapping ?? freeze({
		id: mapping,
		version: "1.0.0",
		classification: "X",
		statement: "Experimental mapping for listening and teaching; it does not detect seizures or other conditions."
	});
	return freeze({
		version: SESSION_VERSION,
		region: freeze({
			requestedStart,
			requestedEnd,
			start,
			end,
			truncatedToMaxSeconds: requestedEnd > end
		}),
		mapping: mappingInfo,
		style,
		featureEvents: freeze(features),
		mappedEvents: freeze(mapped),
		events: freeze(events),
		audit: freeze({
			eventCount: events.length,
			audibleTrackIds: freeze(tracks.filter((track) => !controlFor(track.id, controls).mute).map((track) => track.id)),
			filters,
			note: "Experimental event sonification. No diagnostic classification or alert is produced."
		})
	});
}
/** Deterministic, browser-independent PCM renderer.  No realtime audio graph is involved. */
function renderSession(session, outputRate = 44100) {
	if (!Number.isInteger(outputRate) || outputRate < 8e3 || outputRate > 192e3) throw new Error("outputRate must be an integer between 8000 and 192000.");
	const length = Math.max(0, Math.ceil((session.region.end - session.region.start) * outputRate));
	const left = new Float32Array(length);
	const right = new Float32Array(length);
	for (const event of session.events) {
		const from = clamp(Math.floor((event.time.start - session.region.start) * outputRate), 0, length);
		const to = clamp(Math.ceil((event.time.end - session.region.start) * outputRate), from, length);
		const panAngle = (event.pan + 1) * Math.PI / 4;
		const lg = Math.cos(panAngle), rg = Math.sin(panAngle);
		for (let i = from; i < to; i++) {
			const phase = 2 * Math.PI * event.frequencyHz * ((i - from) / outputRate);
			const position = (i - from) / Math.max(1, to - from - 1);
			const envelope = Math.sin(Math.PI * position);
			const sample = (event.waveform === "pulse" ? Math.sin(phase) >= 0 ? 1 : -1 : event.waveform === "soft-sine" ? Math.sin(phase) + .18 * Math.sin(phase * 2) : Math.sin(phase)) * envelope * event.amplitude;
			left[i] += sample * lg;
			right[i] += sample * rg;
		}
	}
	let rawPeak = 0;
	for (let i = 0; i < length; i++) rawPeak = Math.max(rawPeak, Math.abs(left[i] ?? 0), Math.abs(right[i] ?? 0));
	const gain = rawPeak > .89 ? .89 / rawPeak : 1;
	let peak = 0;
	for (let i = 0; i < length; i++) {
		left[i] *= gain;
		right[i] *= gain;
		peak = Math.max(peak, Math.abs(left[i] ?? 0), Math.abs(right[i] ?? 0));
	}
	return freeze({
		left,
		right,
		sampleRate: outputRate,
		duration: length / outputRate,
		peak,
		clipped: false
	});
}
var LOUI_2014_MAPPING = Object.freeze({
	id: "loui-2014-fz-cz-v1",
	version: "1.0.0",
	classification: "B",
	title: "Loui et al. 2014 Fz–Cz study reproduction",
	doi: "10.3389/fnhum.2014.00820",
	pmid: "25352802",
	epochSeconds: 10,
	targetSampleRate: 256,
	sampleStride: 20,
	eventRate: 12.8
});
var SCALE_OFFSETS = Object.freeze(Array.from({ length: 41 }, (_, offset) => offset).filter((offset) => [
	0,
	2,
	4,
	7,
	9
].includes(offset % 12)));
function finiteSamples(samples) {
	for (const value of samples) if (!Number.isFinite(value)) throw new Error("Fz–Cz contains a non-finite sample.");
}
function resampleLinear(samples, fromRate, toRate) {
	if (fromRate === toRate) return new Float32Array(samples);
	const length = Math.max(1, Math.round(samples.length / fromRate * toRate));
	const output = new Float32Array(length);
	for (let index = 0; index < length; index++) {
		const sourceIndex = index * fromRate / toRate;
		const left = Math.min(samples.length - 1, Math.floor(sourceIndex));
		const right = Math.min(samples.length - 1, left + 1);
		const fraction = sourceIndex - left;
		output[index] = (samples[left] ?? 0) * (1 - fraction) + (samples[right] ?? 0) * fraction;
	}
	return output;
}
function nearestScaleOffset(value) {
	let best = SCALE_OFFSETS[0] ?? 0;
	let distance = Number.POSITIVE_INFINITY;
	for (const offset of SCALE_OFFSETS) {
		const candidate = Math.abs(offset - value);
		if (candidate < distance || candidate === distance && offset < best) {
			best = offset;
			distance = candidate;
		}
	}
	return best;
}
function epochValues(samples, start, end) {
	let minimum = Number.POSITIVE_INFINITY;
	let maximum = Number.NEGATIVE_INFINITY;
	for (let index = start; index < end; index++) {
		const value = samples[index] ?? 0;
		minimum = Math.min(minimum, value);
		maximum = Math.max(maximum, value);
	}
	const span = maximum - minimum;
	const output = [];
	for (let index = start; index < end; index += LOUI_2014_MAPPING.sampleStride) {
		const scaled = span > 1e-12 ? 1 + 39 * ((samples[index] ?? 0) - minimum) / span : 20.5;
		output.push(nearestScaleOffset(scaled));
	}
	return output;
}
function prepareLoui2014(source) {
	if (source.kind !== "eeg") throw new Error("The Loui mapping requires an EEG derivation.");
	if (!(source.sampleRate > 0)) throw new Error("The Fz–Cz sample rate is invalid.");
	finiteSamples(source.samples);
	const resampled = resampleLinear(source.samples, source.sampleRate, LOUI_2014_MAPPING.targetSampleRate);
	const blockSize = LOUI_2014_MAPPING.epochSeconds * LOUI_2014_MAPPING.targetSampleRate;
	const values = [];
	for (let start = 0; start < resampled.length; start += blockSize) values.push(...epochValues(resampled, start, Math.min(resampled.length, start + blockSize)));
	return Object.freeze({
		source: Object.freeze({
			...source,
			id: "evidence:loui-2014-source",
			label: "Fz–Cz",
			laterality: "midline",
			samples: resampled,
			sampleRate: LOUI_2014_MAPPING.targetSampleRate
		}),
		playback: Object.freeze({
			id: "evidence:loui-2014-events",
			label: "Loui 2014 Fz–Cz",
			laterality: "midline",
			kind: "eeg",
			samples: Float32Array.from(values),
			sampleRate: LOUI_2014_MAPPING.eventRate
		}),
		sourceSampleRate: source.sampleRate,
		resampled: source.sampleRate !== LOUI_2014_MAPPING.targetSampleRate
	});
}
function velocityFor(sampleIndex) {
	return 85 + (Math.imul(sampleIndex + 1, 2654435761) >>> 0) % 43;
}
function generateLoui2014Session(preparation, options) {
	const source = preparation.source;
	const requestedStart = Math.max(0, options.start);
	const duration = source.samples.length / source.sampleRate;
	const start = Math.min(requestedStart, Math.max(0, duration - .01));
	const end = Math.min(duration, start + LOUI_2014_MAPPING.epochSeconds);
	if (end <= start) throw new Error("The selected recording has no Fz–Cz epoch to sonify.");
	const first = Math.ceil(start * source.sampleRate);
	const last = Math.min(source.samples.length, Math.ceil(end * source.sampleRate));
	let minimum = Number.POSITIVE_INFINITY;
	let maximum = Number.NEGATIVE_INFINITY;
	for (let index = first; index < last; index++) {
		minimum = Math.min(minimum, source.samples[index] ?? 0);
		maximum = Math.max(maximum, source.samples[index] ?? 0);
	}
	const span = maximum - minimum;
	const features = [];
	const mapped = [];
	const events = [];
	for (let sampleIndex = first, ordinal = 0; sampleIndex < last; sampleIndex += 20, ordinal++) {
		const raw = source.samples[sampleIndex] ?? 0;
		const scaledValue = span > 1e-12 ? 1 + 39 * (raw - minimum) / span : 20.5;
		const midiOffset = nearestScaleOffset(scaledValue);
		const velocity = velocityFor(sampleIndex);
		const eventStart = sampleIndex / source.sampleRate;
		const eventEnd = Math.min(end, eventStart + 20 / source.sampleRate);
		const feature = Object.freeze({
			id: `feature:loui-2014:${sampleIndex}:${ordinal}`,
			type: "feature-window-v1",
			time: Object.freeze({
				start: eventStart,
				end: eventEnd
			}),
			source: Object.freeze({
				trackId: source.id,
				channel: "Fz–Cz",
				laterality: "midline",
				kind: "eeg",
				sampleRate: source.sampleRate,
				originalSampleRate: preparation.sourceSampleRate,
				originalSamplePosition: sampleIndex * preparation.sourceSampleRate / LOUI_2014_MAPPING.targetSampleRate,
				resampled: preparation.resampled,
				inputSampleStart: sampleIndex,
				inputSampleEndExclusive: sampleIndex + 1,
				sourceTimeStart: eventStart,
				sourceTimeEnd: eventEnd,
				derivationSources: Object.freeze([...options.derivationSources ?? ["Fz", "Cz"]]),
				normalizationScale: span,
				windowSeconds: 20 / source.sampleRate,
				filters: Object.freeze({ ...options.filters })
			}),
			features: Object.freeze({
				mean: raw,
				rms: Math.abs(raw),
				lineLength: 0,
				scaledValue,
				midiOffset,
				velocity
			})
		});
		const mapping = Object.freeze({
			id: LOUI_2014_MAPPING.id,
			version: LOUI_2014_MAPPING.version,
			classification: LOUI_2014_MAPPING.classification,
			statement: "Level B study reproduction; it reproduces the disclosed symbolic mapping and is not a validated clinical detector.",
			publication: Object.freeze({
				title: LOUI_2014_MAPPING.title,
				doi: LOUI_2014_MAPPING.doi,
				pmid: LOUI_2014_MAPPING.pmid
			})
		});
		const mappedEvent = Object.freeze({
			id: `map:${feature.id}`,
			type: "tone-event-v1",
			derivesFrom: Object.freeze([feature.id]),
			time: feature.time,
			frequencyHz: 440 * 2 ** ((48 + midiOffset - 69) / 12),
			amplitude: velocity / 127 * .24,
			pan: 0,
			waveform: "sine",
			mapping,
			source: feature.source
		});
		const changes = options.hybrid ? ["amplitude × 0.72", "soft second harmonic added; mapped pitch unchanged"] : ["neutral sine substitutes for the unavailable proprietary study patch"];
		const styledEvent = Object.freeze({
			...mappedEvent,
			amplitude: options.hybrid ? mappedEvent.amplitude * .72 : mappedEvent.amplitude,
			waveform: options.hybrid ? "soft-sine" : mappedEvent.waveform,
			style: Object.freeze({
				id: options.hybrid ? "loui-soft-v1" : "loui-neutral-v1",
				version: "1.0.0",
				changes: Object.freeze(changes)
			})
		});
		features.push(feature);
		mapped.push(mappedEvent);
		events.push(styledEvent);
	}
	const mapping = mapped[0]?.mapping ?? {
		id: LOUI_2014_MAPPING.id,
		version: LOUI_2014_MAPPING.version,
		classification: LOUI_2014_MAPPING.classification,
		statement: "Level B study reproduction; it reproduces the disclosed symbolic mapping and is not a validated clinical detector.",
		publication: Object.freeze({
			title: LOUI_2014_MAPPING.title,
			doi: LOUI_2014_MAPPING.doi,
			pmid: LOUI_2014_MAPPING.pmid
		})
	};
	return Object.freeze({
		version: "auris-event-session-v1",
		region: Object.freeze({
			requestedStart,
			requestedEnd: requestedStart + LOUI_2014_MAPPING.epochSeconds,
			start,
			end,
			truncatedToMaxSeconds: false
		}),
		mapping,
		style: options.hybrid ? "loui-soft-v1" : "loui-neutral-v1",
		featureEvents: Object.freeze(features),
		mappedEvents: Object.freeze(mapped),
		events: Object.freeze(events),
		audit: Object.freeze({
			eventCount: events.length,
			audibleTrackIds: Object.freeze([source.id]),
			filters: Object.freeze({ ...options.filters }),
			note: `Level B Loui 2014 symbolic study reproduction; ${preparation.resampled ? `linearly resampled from ${preparation.sourceSampleRate} Hz to 256 Hz; ` : ""}deterministic velocities replace the publication's unseeded random velocities, and the proprietary Massive patch is not reproduced. No diagnostic classification or alert is produced.`
		})
	});
}
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
function nextPowerOfTwo(n) {
	let size = 1;
	while (size < Math.max(2, n)) size <<= 1;
	return size;
}
function hann(n, i) {
	return .5 - .5 * Math.cos(2 * Math.PI * i / Math.max(1, n - 1));
}
function fftPower(frame) {
	const n = nextPowerOfTwo(frame.length);
	const re = new Float32Array(n);
	const im = new Float32Array(n);
	for (let i = 0; i < frame.length; i++) re[i] = frame[i];
	bitReverseFft(re, im);
	const half = n >> 1;
	const mag = new Float32Array(half);
	for (let k = 0; k < half; k++) mag[k] = re[k] * re[k] + im[k] * im[k];
	return mag;
}
function spectrogram(x, fs, win = 256, hop = 64, fMax = 30) {
	const fftN = nextPowerOfTwo(win);
	const nFreq = Math.max(2, Math.floor(fMax * fftN / fs) + 1);
	const nTime = Math.max(1, Math.floor(Math.max(0, x.length - win) / Math.max(1, hop)) + 1);
	const out = new Float32Array(nTime * nFreq);
	const frame = new Float32Array(win);
	let windowEnergy = 0;
	for (let i = 0; i < win; i++) windowEnergy += hann(win, i) ** 2;
	const normalization = Math.max(1e-12, fs * windowEnergy);
	for (let t = 0; t < nTime; t++) {
		const i0 = t * hop;
		for (let i = 0; i < win; i++) frame[i] = (x[i0 + i] ?? 0) * hann(win, i);
		const mag = fftPower(frame);
		for (let f = 0; f < nFreq; f++) {
			const oneSided = f > 0 && f < mag.length - 1 ? 2 : 1;
			out[t * nFreq + f] = (mag[f] ?? 0) * oneSided / normalization;
		}
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
	const nFreq = Math.max(2, Math.floor(fMax * nextPowerOfTwo(win) / fs) + 1);
	let acc = null;
	let nTime = Number.POSITIVE_INFINITY;
	for (const t of list) {
		const spec = spectrogram(t.samples, t.sampleRate, win, hop, fMax);
		const sourceNFreq = Math.max(2, Math.floor(fMax * nextPowerOfTwo(win) / t.sampleRate) + 1);
		nTime = Math.min(nTime, Math.max(1, Math.floor(Math.max(0, t.samples.length - win) / hop) + 1));
		if (!acc) {
			acc = new Float32Array(Math.max(1, nTime) * nFreq);
			for (let ti = 0; ti < Math.max(1, nTime); ti++) for (let fi = 0; fi < nFreq; fi++) {
				const hz = fi * fs / nextPowerOfTwo(win);
				const sourceFi = Math.min(sourceNFreq - 1, Math.round(hz * nextPowerOfTwo(win) / t.sampleRate));
				acc[ti * nFreq + fi] = spec[ti * sourceNFreq + sourceFi] ?? 0;
			}
		} else {
			const timeCount = Math.min(Math.max(1, nTime), Math.floor(spec.length / sourceNFreq));
			for (let ti = 0; ti < timeCount; ti++) for (let fi = 0; fi < nFreq; fi++) {
				const hz = fi * fs / nextPowerOfTwo(win);
				const sourceFi = Math.min(sourceNFreq - 1, Math.round(hz * nextPowerOfTwo(win) / t.sampleRate));
				acc[ti * nFreq + fi] = (acc[ti * nFreq + fi] ?? 0) + (spec[ti * sourceNFreq + sourceFi] ?? 0);
			}
		}
	}
	const n = list.length;
	const timeCount = Number.isFinite(nTime) ? Math.max(1, nTime) : 1;
	if (acc && n > 1) for (let i = 0; i < acc.length; i++) acc[i] /= n;
	return acc ? {
		spec: acc,
		nTime: timeCount,
		nFreq,
		fs
	} : null;
}
function dbOfPower(power) {
	return 10 * Math.log10(Math.max(1e-20, power));
}
function dbRangeOf(a, b) {
	const step = Math.max(1, Math.floor((a.length + b.length) / 4e3));
	const samples = [];
	for (let i = 0; i < a.length; i += step) samples.push(dbOfPower(a[i]));
	for (let i = 0; i < b.length; i += step) samples.push(dbOfPower(b[i]));
	if (samples.length === 0) return {
		min: -80,
		max: -20
	};
	samples.sort((x, y) => x - y);
	const max = samples[Math.floor(samples.length * .98)] ?? -20;
	const low = samples[Math.floor(samples.length * .05)] ?? max - 48;
	return {
		min: Math.min(max - 12, Math.max(max - 54, low)),
		max
	};
}
function remapSpec(source, sourceTime, sourceFreq, targetTime, targetFreq) {
	if (sourceTime === targetTime && sourceFreq === targetFreq) return source;
	const out = new Float32Array(targetTime * targetFreq);
	for (let ti = 0; ti < targetTime; ti++) {
		const sourceTi = Math.min(sourceTime - 1, ti);
		for (let fi = 0; fi < targetFreq; fi++) {
			const sourceFi = Math.min(sourceFreq - 1, Math.round(fi / Math.max(1, targetFreq - 1) * (sourceFreq - 1)));
			out[ti * targetFreq + fi] = source[sourceTi * sourceFreq + sourceFi] ?? 0;
		}
	}
	return out;
}
function buildDsa(tracks, duration) {
	const eeg = tracks.filter((t) => t.kind === "eeg" && t.samples.length);
	if (eeg.length === 0) return null;
	const selectForDsa = (items, limit = 8) => {
		if (items.length <= limit) return items;
		return Array.from({ length: limit }, (_, i) => items[Math.floor(i * (items.length - 1) / (limit - 1))]);
	};
	const dsaEeg = [...selectForDsa(eeg.filter((t) => t.laterality === "left")), ...selectForDsa(eeg.filter((t) => t.laterality === "right"))];
	const sourceTracks = dsaEeg.length > 0 ? dsaEeg : selectForDsa(eeg, 12);
	const fs = eeg[0].sampleRate;
	const win = Math.min(1024, Math.max(256, nextPowerOfTwo(Math.round(fs * 2))));
	let hop = 64;
	const fMax = 45;
	hop = Math.max(1, Math.floor(win / 4));
	if (Math.max(1, Math.floor(Math.max(0, eeg[0].samples.length - win) / hop) + 1) > 1400) hop = Math.max(hop, Math.ceil((eeg[0].samples.length - win) / 1399));
	let left = meanPowerSpec(sourceTracks, "left", win, hop, fMax);
	let right = meanPowerSpec(sourceTracks, "right", win, hop, fMax);
	if (!left && !right) {
		const all = meanPowerSpec(sourceTracks, "all", win, hop, fMax);
		if (!all) return null;
		left = all;
		right = all;
	}
	if (!left) left = right;
	if (!right) right = left;
	const nTime = Math.min(left.nTime, right.nTime);
	const nFreq = left.nFreq;
	const leftSpec = remapSpec(left.spec, left.nTime, left.nFreq, nTime, nFreq);
	const rightSpec = remapSpec(right.spec, right.nTime, right.nFreq, nTime, nFreq);
	const db = dbRangeOf(leftSpec, rightSpec);
	return {
		l: leftSpec,
		r: rightSpec,
		nTime,
		nFreq,
		fMin: 0,
		fMax,
		binHz: fMax / Math.max(1, left.nFreq - 1),
		windowSamples: win,
		hopSamples: hop,
		windowSec: win / fs,
		hopSec: hop / fs,
		duration,
		sampleRate: fs,
		dbMin: db.min,
		dbMax: db.max
	};
}
function dsaColumn(frame, t, side) {
	const col = new Float32Array(frame.nFreq);
	if (frame.duration <= 0 || frame.nTime <= 0) return col;
	const i = Math.max(0, Math.min(frame.nTime - 1, Math.floor((Math.max(0, t) - frame.windowSec / 2) / Math.max(1e-6, frame.hopSec))));
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
/** Perceptually uniform, color-vision-friendly viridis-style DSA ramp. */
function dsaRgb(u) {
	const x = Math.max(0, Math.min(1, u));
	const stops = [
		[
			0,
			68,
			1,
			84
		],
		[
			.25,
			59,
			82,
			139
		],
		[
			.5,
			33,
			145,
			140
		],
		[
			.75,
			94,
			201,
			98
		],
		[
			1,
			253,
			231,
			37
		]
	];
	for (let i = 1; i < stops.length; i++) {
		const a = stops[i - 1];
		const b = stops[i];
		if (x <= b[0]) {
			const t = (x - a[0]) / Math.max(1e-6, b[0] - a[0]);
			return [
				a[1] + (b[1] - a[1]) * t,
				a[2] + (b[2] - a[2]) * t,
				a[3] + (b[3] - a[3]) * t
			];
		}
	}
	return [
		253,
		231,
		37
	];
}
function dsaDb(power) {
	return dbOfPower(power);
}
function dsaUnit(power, dbMin, dbMax) {
	const u = (dsaDb(power) - dbMin) / Math.max(1, dbMax - dbMin);
	return Math.max(0, Math.min(1, u));
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
		const { analysisSegment: segment, evidencePreparation, tracks, combine, sonify, soundMode } = get();
		if (!segment) {
			playback.setControlTracks([], 0);
			set({
				mix: null,
				busy: false
			});
			return;
		}
		const evidenceMode = soundMode === "evidence" || soundMode === "hybrid";
		playback.setSoundEnabled(soundMode === "experimental" || soundMode === "musical" || evidenceMode && Boolean(evidencePreparation));
		if (evidenceMode && evidencePreparation) {
			const evidenceTrack = evidencePreparation.playback;
			const controls = controlTracksFrom([evidenceTrack], {}, "stereo", { [evidenceTrack.id]: /* @__PURE__ */ new Float32Array(0) });
			playback.setControlTracks(controls, segment.duration);
			playback.setSettings({
				...sonify,
				mode: soundMode === "hybrid" ? "loui-hybrid" : "loui",
				timeScale: 1
			}, true);
			set({
				mix: stubMix(segment.duration, 1),
				busy: false
			});
			return;
		}
		const spikes = {};
		for (const tr of segment.tracks) spikes[tr.id] = /* @__PURE__ */ new Float32Array(0);
		const controls = controlTracksFrom(segment.tracks, tracks, combine, spikes);
		playback.setControlTracks(controls, segment.duration);
		const enabled = soundMode === "experimental" || soundMode === "musical";
		playback.setSettings(enabled ? sonify : {
			...sonify,
			mode: "contour",
			timeScale: 1
		}, true);
		const ts = enabled ? sonify.mode === "direct" ? sonify.compression : sonify.timeScale : 1;
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
		const position = eegNow(get());
		playback.pause();
		const analysis = processSegment(recording, 0, total, derivations, DEFAULT_FILTERS);
		const seg = processSegment(recording, 0, total, derivations, filters);
		const evidence = evidenceForRecording(recording);
		const view = clampView(viewStart, viewDuration || Math.min(10, total), seg.duration);
		const auto = get().showAuto ? detectMorphologies(analysis.tracks).filter((a) => a.type !== "qrs") : [];
		const fromFile = recording.annotations.map((a, i) => ({
			id: `edf-${i}`,
			start: a.onset,
			end: a.onset + (a.duration ?? 0),
			trackId: null,
			type: "comment",
			text: a.text,
			source: "file",
			confidence: 1
		}));
		const keepUser = get().annotations.filter((x) => x.source !== "auto" && !x.id.startsWith("edf-"));
		set({
			segment: seg,
			analysisSegment: analysis,
			evidencePreparation: evidence.preparation,
			evidenceReason: evidence.reason,
			playing: false,
			playheadEeg: Math.min(get().playheadEeg, seg.duration),
			viewStart: view.start,
			viewDuration: view.duration,
			annotations: [
				...keepUser,
				...fromFile,
				...auto
			],
			dsa: buildDsa(analysis.tracks, analysis.duration)
		});
		pushEngine();
		playback.seek(position);
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
		analysisSegment: null,
		evidencePreparation: null,
		evidenceReason: null,
		soundMode: "off",
		annotationPast: [],
		annotationFuture: [],
		sonify: { ...DEFAULT_SONIFY },
		combine: "stereo",
		negativeUp: true,
		sensitivityUv: 70,
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
		showAuto: false,
		showAnnotations: true,
		tool: "pointer",
		pendingType: "comment",
		showDsa: true,
		dsa: null,
		audibleScrub: false,
		loadFile: async (file, name) => {
			set({
				status: "loading",
				error: null,
				playing: false,
				busy: true,
				annotations: [],
				annotationPast: [],
				annotationFuture: [],
				selectedAnnotation: null,
				recording: null,
				segment: null,
				analysisSegment: null,
				evidencePreparation: null,
				evidenceReason: null,
				mix: null,
				derivations: [],
				tracks: {},
				dsa: null
			});
			playback.stop();
			playback.setControlTracks([], 0);
			revoke();
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
			const next = {
				...get().filters,
				...p
			};
			const { recording, derivations } = get();
			try {
				set({
					filters: next,
					segment: recording ? processSegment(recording, 0, recording.header.duration, derivations, next) : null,
					error: null
				});
			} catch (err) {
				set({ error: err instanceof Error ? err.message : "Display filter could not be applied." });
			}
		},
		setSoundMode: (mode) => {
			const t = eegNow(get());
			const evidenceReady = Boolean(get().evidencePreparation);
			const soundEnabled = mode === "experimental" || mode === "musical" || (mode === "evidence" || mode === "hybrid") && evidenceReady;
			playback.setSoundEnabled(soundEnabled);
			set({
				soundMode: mode,
				sonify: mode === "musical" ? {
					...get().sonify,
					mode: "contour",
					quantize: true
				} : mode === "experimental" ? {
					...get().sonify,
					mode: "contour",
					quantize: false
				} : mode === "hybrid" ? {
					...get().sonify,
					mode: "loui-hybrid",
					timeScale: 1
				} : mode === "evidence" ? {
					...get().sonify,
					mode: "loui",
					timeScale: 1
				} : get().sonify,
				playing: false,
				playheadEeg: t,
				audibleScrub: false
			});
			pushEngine();
			playback.seek(t);
		},
		setSonify: (p) => {
			const next = {
				...get().sonify,
				...p
			};
			set({ sonify: next });
			if (get().soundMode === "experimental" || get().soundMode === "musical") playback.setSettings(next, true);
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
		setSensitivity: (n) => set({ sensitivityUv: clampSensitivity(n) }),
		nudgeSensitivity: (dir) => set({ sensitivityUv: stepSensitivity(get().sensitivityUv, dir) }),
		fitSensitivity: () => {
			const { segment, viewStart, viewDuration } = get();
			if (!segment) return;
			set({ sensitivityUv: fitSensitivityUv(segment.tracks, viewStart, viewStart + viewDuration) });
		},
		setNegativeUp: (v) => {
			set({ negativeUp: v });
		},
		setAboutOpen: (v) => set({ aboutOpen: v }),
		setKeysOpen: (v) => set({ keysOpen: v }),
		setShowDsa: (v) => set({ showDsa: v }),
		setAudibleScrub: (v) => set({ audibleScrub: v && ["experimental", "musical"].includes(get().soundMode) }),
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
			if ((get().soundMode === "evidence" || get().soundMode === "hybrid") && !get().evidencePreparation) {
				set({ error: get().evidenceReason ?? "The Loui 2014 mapping requires Fz and Cz." });
				return;
			}
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
					playheadEeg: get().segment?.duration ?? 0
				});
			};
			try {
				await playback.play();
				set({
					playing: playback.playing,
					error: null
				});
			} catch (err) {
				set({
					playing: false,
					error: err instanceof Error ? err.message : "Audio could not start."
				});
			}
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
			if (get().soundMode === "off") return;
			const state = get();
			if (!state.analysisSegment || !state.recording) return;
			if ((state.soundMode === "evidence" || state.soundMode === "hybrid") && !state.evidencePreparation) return;
			const session = mappingSession(state);
			const rendered = renderSession(session, state.sonify.outputRate);
			if (rendered.left.length === 0) return;
			const mix = {
				...rendered,
				eegDuration: session.region.end - session.region.start,
				compressionUsed: 1
			};
			revoke();
			const blob = encodeWav(mix, 16);
			const url = URL.createObjectURL(blob);
			wavUrlLocal = url;
			set({ wavUrl: url });
			const a = document.createElement("a");
			a.href = url;
			a.download = "auris-mapped-region.wav";
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
			const item = validateAnnotations([{
				...a,
				id: nid(),
				source: "user"
			}], { duration: get().segment?.duration ?? 0 })[0];
			set({
				annotationPast: [...get().annotationPast.slice(-49), get().annotations],
				annotationFuture: [],
				annotations: [...get().annotations, item],
				selectedAnnotation: item.id,
				tool: "pointer"
			});
		},
		updateAnnotation: (id, patch) => {
			const old = get().annotations.find((a) => a.id === id);
			if (!old || old.source !== "user") return;
			const item = validateAnnotations([{
				...old,
				...patch,
				id,
				source: "user"
			}], { duration: get().segment?.duration ?? 0 })[0];
			set({
				annotationPast: [...get().annotationPast.slice(-49), get().annotations],
				annotationFuture: [],
				annotations: get().annotations.map((a) => a.id === id ? item : a)
			});
		},
		removeAnnotation: (id) => {
			if (!get().annotations.some((a) => a.id === id && a.source === "user")) return;
			set({
				annotationPast: [...get().annotationPast.slice(-49), get().annotations],
				annotationFuture: [],
				annotations: get().annotations.filter((a) => a.id !== id),
				selectedAnnotation: null
			});
		},
		undoAnnotations: () => {
			const h = annotationHistoryUndo(get().annotationPast, get().annotations, get().annotationFuture);
			set({
				annotations: h.current,
				annotationPast: h.past,
				annotationFuture: h.future,
				selectedAnnotation: null
			});
		},
		redoAnnotations: () => {
			const h = annotationHistoryRedo(get().annotationPast, get().annotations, get().annotationFuture);
			set({
				annotations: h.current,
				annotationPast: h.past,
				annotationFuture: h.future,
				selectedAnnotation: null
			});
		},
		importAnnotations: (items) => {
			const imported = validateAnnotations(items, { duration: get().segment?.duration ?? 0 }).map((a) => ({
				...a,
				id: nid(),
				source: "file"
			}));
			set({
				annotationPast: [...get().annotationPast.slice(-49), get().annotations],
				annotationFuture: [],
				annotations: [...get().annotations, ...imported]
			});
		},
		selectAnnotation: (id) => {
			set({ selectedAnnotation: id });
			const a = get().annotations.find((x) => x.id === id);
			if (a) get().seekEeg(a.start);
		},
		setShowAuto: (v) => {
			const existing = get().annotations.filter((a) => a.source !== "auto");
			const auto = v && get().analysisSegment ? detectMorphologies(get().analysisSegment.tracks).filter((a) => a.type !== "qrs") : [];
			set({
				showAuto: v,
				annotations: [...existing, ...auto]
			});
		},
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
		},
		exportMappingAudit: () => {
			const state = get();
			if (!state.analysisSegment || !state.recording) return;
			if ((state.soundMode === "evidence" || state.soundMode === "hybrid") && !state.evidencePreparation) return;
			const session = mappingSession(state);
			downloadJson("auris-mapping-audit.json", {
				recording: state.recording.name,
				montage: state.montage,
				application: "Auris EEG",
				session
			});
		}
	};
});
function mappingSession(state) {
	if ((state.soundMode === "evidence" || state.soundMode === "hybrid") && state.evidencePreparation) return generateLoui2014Session(state.evidencePreparation, {
		start: state.viewStart,
		hybrid: state.soundMode === "hybrid",
		filters: EVIDENCE_FILTERS,
		derivationSources: ["Fz", "Cz"]
	});
	const sourceDerivations = Object.fromEntries(state.derivations.map((derivation) => [derivation.id, derivation.sources.map((index) => state.recording?.header.signals[index]?.label ?? `signal-${index}`)]));
	const trackControls = state.analysisSegment.tracks.map((track) => {
		const control = state.tracks[track.id];
		return {
			id: track.id,
			gain: control?.gain ?? 1,
			mute: control?.mute ?? false,
			pan: panForLaterality(control?.lateralityOverride ?? track.laterality)
		};
	});
	return generateSession(state.analysisSegment.tracks, {
		start: state.viewStart,
		end: Math.min(state.analysisSegment.duration, state.viewStart + state.viewDuration),
		filters: DEFAULT_FILTERS,
		mapping: state.sonify.mode === "pulse" ? "rms-pulse-v1" : "contour-v1",
		style: state.soundMode === "musical" ? "pentatonic-v1" : "plain-v1",
		trackControls,
		sourceDerivations
	});
}
function downloadJson(filename, value) {
	const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}
function currentRepro(state) {
	if (!state.recording || !state.analysisSegment || state.soundMode === "off" || (state.soundMode === "evidence" || state.soundMode === "hybrid") && !state.evidencePreparation) return null;
	if ((state.soundMode === "evidence" || state.soundMode === "hybrid") && state.evidencePreparation) {
		const preparation = state.evidencePreparation;
		const start = state.viewStart;
		const duration = Math.min(10, Math.max(0, preparation.source.samples.length / 256 - start));
		return {
			file: state.recording.name,
			montage: "locked Fz–Cz study-reproduction source",
			channels: ["Fz–Cz"],
			interval: `${start.toFixed(2)}–${(start + duration).toFixed(2)} s`,
			filters: [preparation.resampled ? `linear resampling ${preparation.sourceSampleRate}→256 Hz; no display filters` : "native 256 Hz; no display filters"],
			audible: ["Fz–Cz"],
			normalization: "10 s epoch min/max linearly scaled to 1–40; every 20th 256 Hz sample",
			method: state.soundMode === "hybrid" ? "loui-2014-fz-cz-v1@1.0.0 (Level B) + loui-soft-v1@1.0.0 downstream style" : "loui-2014-fz-cz-v1@1.0.0 (Level B study reproduction)",
			compression: "1× source timeline; 12.8 mapped events/s",
			carrier: state.soundMode === "hybrid" ? "C-major-pentatonic pitch; disclosed soft second harmonic, pitch unchanged" : "C-major-pentatonic pitch; neutral sine substitutes for unavailable study patch",
			outputRate: `${state.sonify.outputRate} Hz`,
			stereo: "locked center"
		};
	}
	const processed = state.analysisSegment.tracks;
	const audible = [...audibleIds(Object.values(state.tracks))];
	const start = state.viewStart;
	const duration = Math.min(30, state.viewDuration, Math.max(0, state.analysisSegment.duration - start));
	return {
		file: state.recording.name,
		montage: `${state.montage} · source derivations recorded in mapping audit`,
		channels: processed.map((t) => t.label),
		interval: `${start.toFixed(2)}–${(start + duration).toFixed(2)} s`,
		filters: ["DC offset removed (analysis branch)"],
		audible: processed.filter((t) => audible.includes(t.id)).map((t) => t.label),
		normalization: "per-track region max absolute amplitude; 0.25 s feature windows",
		method: state.soundMode === "musical" ? "auris:contour-v1@1.0.0 (Level X) + pentatonic-v1@1.0.0 style" : state.sonify.mode === "pulse" ? "auris:rms-pulse-v1@1.0.0 (Level X) + plain-v1@1.0.0 style" : "auris:contour-v1@1.0.0 (Level X) + plain-v1@1.0.0 style",
		compression: "1× event timeline; exported region capped at 30 seconds",
		carrier: state.sonify.mode === "pulse" && state.soundMode === "experimental" ? "feature RMS maps deterministically to pulse velocity" : "feature mean maps deterministically to 210–840 Hz",
		outputRate: `${state.sonify.outputRate} Hz`,
		stereo: state.combine
	};
}
var EVIDENCE_FILTERS = {
	bandpass: false,
	bandpassLow: 0,
	bandpassHigh: 0,
	lff: 0,
	hff: 0,
	notch60: false,
	removeDc: false
};
function evidenceForRecording(recording) {
	const derivation = derivationsFor(recording, "custom", [["Fz", "Cz"]]).find((candidate) => candidate.id === "custom:Fz-Cz");
	if (!derivation?.available) return {
		preparation: null,
		reason: "Loui 2014 study reproduction requires compatible Fz and Cz channels."
	};
	try {
		const source = processSegment(recording, 0, recording.header.duration, [derivation], EVIDENCE_FILTERS).tracks[0];
		if (!source) throw new Error("Fz–Cz could not be derived.");
		return {
			preparation: prepareLoui2014(source),
			reason: null
		};
	} catch (error) {
		return {
			preparation: null,
			reason: error instanceof Error ? error.message : "Fz–Cz could not be prepared."
		};
	}
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
var DEFAULT_DURATION = 1;
function draftFor(annotation) {
	return {
		start: annotation.start,
		end: annotation.end,
		trackId: annotation.trackId,
		type: annotation.type,
		text: annotation.text
	};
}
function NumberField({ id, label, value, max, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "grid min-w-0 gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle",
		htmlFor: id,
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			id,
			type: "number",
			min: "0",
			max,
			step: "0.01",
			value: Number.isFinite(value) ? value : 0,
			onChange: (event) => onChange(event.currentTarget.valueAsNumber),
			className: "h-8 min-w-0 rounded-sm border border-border bg-bg px-2 font-mono text-xs tabular-nums text-fg outline-none transition-colors focus:border-accent"
		})]
	});
}
function EventList() {
	const annotations = useEegStore((s) => s.annotations);
	const selectedId = useEegStore((s) => s.selectedAnnotation);
	const showAuto = useEegStore((s) => s.showAuto);
	const selectAnnotation = useEegStore((s) => s.selectAnnotation);
	const addAnnotation = useEegStore((s) => s.addAnnotation);
	const updateAnnotation = useEegStore((s) => s.updateAnnotation);
	const removeAnnotation = useEegStore((s) => s.removeAnnotation);
	const undoAnnotations = useEegStore((s) => s.undoAnnotations);
	const redoAnnotations = useEegStore((s) => s.redoAnnotations);
	const importAnnotations = useEegStore((s) => s.importAnnotations);
	const annotationPast = useEegStore((s) => s.annotationPast);
	const annotationFuture = useEegStore((s) => s.annotationFuture);
	const pendingType = useEegStore((s) => s.pendingType);
	const setPendingType = useEegStore((s) => s.setPendingType);
	const setTool = useEegStore((s) => s.setTool);
	const exportAnnotations = useEegStore((s) => s.exportAnnotations);
	const segment = useEegStore((s) => s.segment);
	const playheadEeg = useEegStore((s) => s.playheadEeg);
	const [query, setQuery] = (0, import_react.useState)("");
	const [sourceFilter, setSourceFilter] = (0, import_react.useState)("all");
	const [newType, setNewType] = (0, import_react.useState)(pendingType);
	const [newText, setNewText] = (0, import_react.useState)("");
	const [newStart, setNewStart] = (0, import_react.useState)(playheadEeg);
	const [newDuration, setNewDuration] = (0, import_react.useState)(DEFAULT_DURATION);
	const [newTrackId, setNewTrackId] = (0, import_react.useState)("");
	const [draft, setDraft] = (0, import_react.useState)(null);
	const [message, setMessage] = (0, import_react.useState)(null);
	const inputRef = (0, import_react.useRef)(null);
	const selected = annotations.find((annotation) => annotation.id === selectedId) ?? null;
	const tracks = segment?.tracks ?? [];
	const duration = segment?.duration ?? 0;
	const isEditable = selected?.source === "user";
	(0, import_react.useEffect)(() => setNewType(pendingType), [pendingType]);
	(0, import_react.useEffect)(() => setDraft(selected ? draftFor(selected) : null), [selected]);
	const visible = annotations.filter((annotation) => annotation.source !== "auto" || showAuto && annotation.type !== "qrs").filter((annotation) => sourceFilter === "all" || annotation.source === sourceFilter).filter((annotation) => `${annotation.type} ${annotation.text} ${annotation.trackId ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
	function submitNew(event) {
		event.preventDefault();
		if (!segment) return;
		const start = Number.isFinite(newStart) ? Math.max(0, Math.min(newStart, duration)) : playheadEeg;
		const end = Math.min(duration, start + Math.max(0, Number.isFinite(newDuration) ? newDuration : 0));
		addAnnotation({
			start,
			end,
			trackId: newTrackId || null,
			type: newType,
			text: newText.trim(),
			source: "user",
			confidence: 1
		});
		setNewText("");
		setMessage("Marker added.");
	}
	function saveDraft(event) {
		event.preventDefault();
		if (!selected || !draft || !isEditable || !segment) return;
		if (!Number.isFinite(draft.start) || !Number.isFinite(draft.end) || draft.start < 0 || draft.end < draft.start || draft.end > duration) {
			setMessage("Use times within this recording, with end at or after start.");
			return;
		}
		updateAnnotation(selected.id, {
			...draft,
			text: draft.text.trim()
		});
		setMessage("Marker updated.");
	}
	async function importFile(event) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = "";
		if (!file || !segment) return;
		try {
			const imported = parseAnnotationsJson(await file.text(), {
				duration,
				trackIds: tracks.map((track) => track.id),
				source: "file"
			});
			importAnnotations(imported);
			setMessage(`${imported.length} file suggestion${imported.length === 1 ? "" : "s"} imported.`);
		} catch (error) {
			setMessage(error instanceof AnnotationImportError ? error.message : "Could not read that annotation file.");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-3",
		"aria-label": "Annotations",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-pretty text-xs leading-5 text-muted",
				children: "Suggested waveforms are educational markers, not a diagnosis. Add a marker at the cursor or press A and click the tracing."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-1",
				"aria-label": "Annotation tool",
				children: ANNOTATION_TYPES.map((type) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						setPendingType(type.id);
						setNewType(type.id);
						setTool("annotate");
					},
					className: `h-8 rounded-sm px-2 text-[0.625rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${pendingType === type.id ? "text-bg" : "text-muted hover:bg-surface-2 hover:text-fg"}`,
					style: { background: pendingType === type.id ? MORPH_COLOR[type.id] : void 0 },
					children: type.label
				}, type.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid grid-cols-2 gap-2 rounded-md border border-border bg-surface p-2",
				onSubmit: submitNew,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "col-span-2 text-xs font-medium text-fg",
						children: "Add marker"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberField, {
							id: "annotation-start",
							label: "Time",
							value: newStart,
							max: duration,
							onChange: setNewStart
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setNewStart(Number(playheadEeg.toFixed(2))),
							className: "text-left text-[0.625rem] text-muted underline decoration-border underline-offset-2 hover:text-fg",
							children: [
								"Use cursor (",
								formatTime(playheadEeg),
								")"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberField, {
						id: "annotation-duration",
						label: "Duration",
						value: newDuration,
						max: duration,
						onChange: setNewDuration
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle",
						htmlFor: "annotation-type",
						children: ["Type", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							id: "annotation-type",
							value: newType,
							onChange: (event) => setNewType(event.currentTarget.value),
							className: "h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent",
							children: ANNOTATION_TYPES.map((type) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: type.id,
								children: type.label
							}, type.id))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle",
						htmlFor: "annotation-channel",
						children: ["Channel", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "annotation-channel",
							value: newTrackId,
							onChange: (event) => setNewTrackId(event.currentTarget.value),
							className: "h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "All channels"
							}), tracks.map((track) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: track.id,
								children: track.label
							}, track.id))]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "col-span-2 grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle",
						htmlFor: "annotation-note",
						children: ["Note", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "annotation-note",
							maxLength: 2e3,
							value: newText,
							onChange: (event) => setNewText(event.currentTarget.value),
							placeholder: "Optional observation",
							className: "h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none placeholder:text-subtle focus:border-accent"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "col-span-2",
						size: "sm",
						type: "submit",
						disabled: !segment,
						children: ["Add at ", formatTime(Math.max(0, newStart || 0))]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-[1fr_auto] gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "sr-only",
						htmlFor: "annotation-search",
						children: "Search markers"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "annotation-search",
						value: query,
						onChange: (event) => setQuery(event.currentTarget.value),
						placeholder: "Search marker notes",
						className: "h-8 min-w-0 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none placeholder:text-subtle focus:border-accent"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "sr-only",
						htmlFor: "annotation-source",
						children: "Filter marker source"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						id: "annotation-source",
						value: sourceFilter,
						onChange: (event) => setSourceFilter(event.currentTarget.value),
						className: "h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "all",
								children: "All sources"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "user",
								children: "Mine"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "file",
								children: "File"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "auto",
								children: "Suggested"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "max-h-48 space-y-1 overflow-auto",
				"aria-label": "Review markers",
				children: [visible.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "rounded-sm border border-dashed border-border p-2 text-xs text-subtle",
					children: "No matching markers."
				}), visible.map((annotation) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => selectAnnotation(annotation.id),
					className: `flex min-h-9 w-full items-center gap-2 rounded-sm border-l-2 px-2 py-1 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${selectedId === annotation.id ? "border-accent bg-surface-2" : annotation.source === "auto" ? "border-warn/70 border-dashed hover:bg-bg" : "border-transparent hover:bg-bg"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "size-2 shrink-0 rounded-full",
							style: { background: MORPH_COLOR[annotation.type] }
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-12 shrink-0 font-mono tabular-nums text-muted",
							children: formatTime(annotation.start)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1 truncate text-fg",
							children: [ANNOTATION_TYPES.find((type) => type.id === annotation.type)?.label ?? annotation.type, annotation.text ? ` · ${annotation.text}` : ""]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[0.625rem] uppercase text-subtle",
							children: annotation.source === "auto" ? "sug" : annotation.source
						})
					]
				}) }, annotation.id))]
			}),
			selected && draft && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "space-y-2 rounded-md border border-border bg-surface p-2",
				onSubmit: saveDraft,
				"aria-label": "Selected marker",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs font-medium text-fg",
						children: ["Selected · ", selected.source === "user" ? "editable" : "read-only suggestion"]
					}), selected.source === "file" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "secondary",
						type: "button",
						onClick: () => addAnnotation({
							...draft,
							source: "user",
							confidence: 1
						}),
						children: "Copy as mine"
					})]
				}), isEditable ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberField, {
							id: "selected-start",
							label: "Start",
							value: draft.start,
							max: duration,
							onChange: (start) => setDraft({
								...draft,
								start
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberField, {
							id: "selected-end",
							label: "End",
							value: draft.end,
							max: duration,
							onChange: (end) => setDraft({
								...draft,
								end
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle",
						htmlFor: "selected-channel",
						children: ["Channel", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: "selected-channel",
							value: draft.trackId ?? "",
							onChange: (event) => setDraft({
								...draft,
								trackId: event.currentTarget.value || null
							}),
							className: "h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "All channels"
							}), tracks.map((track) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: track.id,
								children: track.label
							}, track.id))]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle",
						htmlFor: "selected-type",
						children: ["Type", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							id: "selected-type",
							value: draft.type,
							onChange: (event) => setDraft({
								...draft,
								type: event.currentTarget.value
							}),
							className: "h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent",
							children: ANNOTATION_TYPES.map((type) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: type.id,
								children: type.label
							}, type.id))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle",
						htmlFor: "selected-note",
						children: ["Note", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "selected-note",
							maxLength: 2e3,
							value: draft.text,
							onChange: (event) => setDraft({
								...draft,
								text: event.currentTarget.value
							}),
							className: "h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							type: "submit",
							children: "Save changes"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							variant: "danger",
							type: "button",
							onClick: () => removeAnnotation(selected.id),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { "aria-hidden": "true" }), "Delete"]
						})]
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs leading-5 text-muted",
					children: "Suggestions from EEG analysis and imported files are preserved. Copy a file suggestion to make an editable personal marker."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "secondary",
						type: "button",
						onClick: () => inputRef.current?.click(),
						disabled: !segment,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { "aria-hidden": "true" }), "Import JSON"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: inputRef,
						type: "file",
						accept: "application/json,.json",
						onChange: importFile,
						className: "sr-only"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "secondary",
						type: "button",
						onClick: exportAnnotations,
						disabled: !annotations.length,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { "aria-hidden": "true" }), "Export JSON"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "iconSm",
						variant: "ghost",
						type: "button",
						onClick: undoAnnotations,
						disabled: !annotationPast.length,
						"aria-label": "Undo annotation change",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { "aria-hidden": "true" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "iconSm",
						variant: "ghost",
						type: "button",
						onClick: redoAnnotations,
						disabled: !annotationFuture.length,
						"aria-label": "Redo annotation change",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Redo2, { "aria-hidden": "true" })
					})
				]
			}),
			message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				role: "status",
				children: message
			}),
			segment && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-[0.625rem] text-subtle",
				children: [
					visible.length,
					" visible marker",
					visible.length === 1 ? "" : "s",
					" in this recording."
				]
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
	const filters = useEegStore((s) => s.filters);
	const setFilters = useEegStore((s) => s.setFilters);
	const sonify = useEegStore((s) => s.sonify);
	const setSonify = useEegStore((s) => s.setSonify);
	const soundMode = useEegStore((s) => s.soundMode);
	const evidencePreparation = useEegStore((s) => s.evidencePreparation);
	const evidenceReason = useEegStore((s) => s.evidenceReason);
	const exportMappingAudit = useEegStore((s) => s.exportMappingAudit);
	const negativeUp = useEegStore((s) => s.negativeUp);
	const setNegativeUp = useEegStore((s) => s.setNegativeUp);
	const sensitivityUv = useEegStore((s) => s.sensitivityUv);
	const setSensitivity = useEegStore((s) => s.setSensitivity);
	const nudgeSensitivity = useEegStore((s) => s.nudgeSensitivity);
	const fitSensitivity = useEegStore((s) => s.fitSensitivity);
	const customA = useEegStore((s) => s.customA);
	const customB = useEegStore((s) => s.customB);
	const customPairs = useEegStore((s) => s.customPairs);
	const setCustomAB = useEegStore((s) => s.setCustomAB);
	const addCustomPair = useEegStore((s) => s.addCustomPair);
	const removeCustomPair = useEegStore((s) => s.removeCustomPair);
	const audibleScrub = useEegStore((s) => s.audibleScrub);
	const setAudibleScrub = useEegStore((s) => s.setAudibleScrub);
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
									await loadFile(buildSyntheticEdf({ duration: 60 }), "synthetic-training.edf");
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
							children: [sensitivityUv, " µV p–p"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.6875rem] text-subtle",
						children: "Lower µV = bigger waves. Fit sizes the page to the tracing."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "grid h-7 w-7 place-items-center rounded-sm bg-bg text-sm text-muted shadow-border",
								onClick: () => nudgeSensitivity(-1),
								"aria-label": "Increase gain",
								children: "−"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: Math.log10(10),
								max: Math.log10(MAX_SENSITIVITY_UV),
								step: .01,
								value: Math.log10(sensitivityUv),
								onChange: (e) => setSensitivity(10 ** Number(e.target.value)),
								className: "h-7 flex-1 accent-accent",
								"aria-label": "Display sensitivity"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "grid h-7 w-7 place-items-center rounded-sm bg-bg text-sm text-muted shadow-border",
								onClick: () => nudgeSensitivity(1),
								"aria-label": "Decrease gain",
								children: "+"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								size: "sm",
								variant: "secondary",
								onClick: () => fitSensitivity(),
								children: "Fit"
							})
						]
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
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.6875rem] font-medium uppercase tracking-wider text-subtle",
						children: "Sonification"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: soundMode === "evidence" ? "accent" : soundMode === "hybrid" || soundMode === "experimental" || soundMode === "musical" ? "warn" : "muted",
						children: soundMode === "evidence" ? "Study reproduction · B" : soundMode === "hybrid" ? "Hybrid · B + style" : soundMode === "experimental" || soundMode === "musical" ? "Experimental · X" : "Sound off"
					})]
				}), soundMode === "off" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-pretty text-xs leading-5 text-muted",
					children: "Visual review is independent of audio. Select a sound mode in the header when you want an auditory representation."
				}) : soundMode === "evidence" || soundMode === "hybrid" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border border-border bg-bg p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-medium text-fg",
								children: "Loui 2014 · Fz–Cz study reproduction"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-pretty text-xs leading-5 text-muted",
								children: "Level B. A 10-second Fz–Cz epoch is sampled every 20 points at 256 Hz, linearly scaled to 1–40, and mapped to C-major-pentatonic pitch at 12.8 events/s. Realtime pages are anchored in successive 10-second epochs; the export uses the selected 10-second epoch. This reproduces the disclosed symbolic mapping, not clinical validity."
							}),
							soundMode === "hybrid" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-pretty text-xs leading-5 text-warn",
								children: "Hybrid adds a softer second-harmonic style after mapping. Pitch and event timing remain unchanged."
							})
						]
					}),
					evidencePreparation ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: ["Ready · Fz–Cz", evidencePreparation.resampled ? ` · linearly resampled ${evidencePreparation.sourceSampleRate}→256 Hz` : " · native 256 Hz"]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-md border border-warn/40 bg-warn/10 p-2 text-xs text-warn",
						children: evidenceReason ?? "Compatible Fz and Cz channels are required."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "secondary",
						onClick: exportMappingAudit,
						disabled: !recording || !evidencePreparation,
						children: "Export mapping audit"
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-pretty text-xs leading-5 text-muted",
						children: "These mappings support listening and exploration. They have not been validated for diagnosis or clinical benefit. Display filters and polarity do not alter their input."
					}),
					soundMode === "experimental" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Mapping" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: field,
						value: sonify.mode,
						onChange: (event) => setSonify({ mode: event.target.value }),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "contour",
							children: "Contour events · auris:contour-v1"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "pulse",
							children: "RMS pulse events · auris:rms-pulse-v1"
						})]
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md bg-bg p-3 shadow-border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium text-fg",
							children: "Contour events + pentatonic style"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-pretty text-[0.6875rem] leading-5 text-subtle",
							children: "auris:contour-v1@1.0.0 with the fixed C-major pentatonic-v1@1.0.0 style."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Realtime preview speed" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: field,
						value: sonify.timeScale,
						onChange: (event) => setSonify({ timeScale: Number(event.target.value) }),
						children: TIME_SCALE_PRESETS.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value,
							children: [value, "×"]
						}, value))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-pretty text-[0.6875rem] leading-5 text-subtle",
						children: "The mapped WAV and audit preserve the source timeline at 1×."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "secondary",
						onClick: exportMappingAudit,
						disabled: !recording,
						children: "Export mapping audit"
					})
				] })]
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
						children: "These settings affect the visual trace only. Analysis and sonification use separately documented preprocessing."
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
					className: "group overflow-hidden rounded-md bg-bg shadow-border",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
						className: "flex min-h-11 list-none items-center gap-2 px-3 py-2 text-left [&::-webkit-details-marker]:hidden",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, {
								className: "size-4 text-accent",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-sm font-medium text-fg",
									children: "Extra tools"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-[0.6875rem] text-subtle",
									children: "Mixer, channel gain, and scrub audio"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
								className: "size-4 text-subtle transition-transform duration-150 group-open:rotate-180",
								"aria-hidden": "true"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-4 border-t border-border px-3 py-3",
						children: soundMode === "evidence" || soundMode === "hybrid" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-md border border-border bg-surface p-3 text-xs leading-5 text-muted",
							children: "Evidence source is locked to raw Fz–Cz. Mixer gain, mute, solo, pan, and audible scrubbing are disabled so they cannot silently alter the study mapping."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[0.6875rem] font-medium uppercase tracking-wider text-subtle",
								children: "Mixer"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-pretty text-xs text-muted",
								children: "S = solo, M = mute. Double-click S for an exclusive solo. Track gains stay live during playback."
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MixerStrip, {})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "border-t border-border pt-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex min-h-11 items-center gap-3 text-sm text-fg",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "grid size-8 shrink-0 place-items-center rounded-sm bg-surface-2 text-accent",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Headphones, {
											className: "size-4",
											"aria-hidden": "true"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block font-medium",
											children: "Audible scrubbing"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block text-[0.6875rem] text-subtle",
											children: "Hear a short preview while dragging the tracing"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: audibleScrub,
										onChange: (e) => setAudibleScrub(e.target.checked),
										className: "size-4 accent-accent",
										"aria-label": "Enable audible scrubbing"
									})
								]
							})
						})] })
					})]
				})
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
						children: recording ? "Choose a sound mode to generate a versioned mapping record." : "Load a recording to capture settings."
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
	const recording = useEegStore((s) => s.recording);
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
	const soundMode = useEegStore((s) => s.soundMode);
	const evidencePreparation = useEegStore((s) => s.evidencePreparation);
	const evidenceReason = useEegStore((s) => s.evidenceReason);
	const playheadEeg = useEegStore((s) => s.playheadEeg);
	const eegRef = (0, import_react.useRef)(null);
	const audioRef = (0, import_react.useRef)(null);
	const hzRef = (0, import_react.useRef)(null);
	const uvRef = (0, import_react.useRef)(null);
	const bandRef = (0, import_react.useRef)(null);
	const barsRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const update = () => {
			const s = useEegStore.getState();
			const t = s.playing ? eegNow(s) : s.playheadEeg;
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
	}, [
		playing,
		playheadEeg,
		segment
	]);
	const soundActive = soundMode === "experimental" || soundMode === "musical" || (soundMode === "evidence" || soundMode === "hybrid") && Boolean(evidencePreparation);
	const factor = soundMode === "experimental" || soundMode === "musical" ? timeScaleFor(sonify) : 1;
	const total = segment?.duration ?? 0;
	const showingAll = total > 0 && viewDuration >= total - 1e-6;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "secondary",
						"aria-label": playing ? "Pause" : "Play",
						onClick: () => void togglePlay(),
						disabled: !segment,
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
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: follow ? "default" : "ghost",
						"aria-label": follow ? "Disable follow playhead" : "Enable follow playhead",
						"aria-pressed": follow,
						title: "Follow playhead (F)",
						onClick: () => setFollow(!follow),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scan, {}),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden sm:inline",
								children: "Follow"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hidden min-w-0 max-w-52 items-baseline gap-2 truncate border-l border-border pl-2 font-mono text-[0.6875rem] text-muted lg:flex",
				title: recording?.name ?? "No recording loaded",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate text-fg",
					children: recording?.name ?? "No recording"
				}), segment && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "shrink-0 text-subtle",
					children: [segment.tracks[0]?.sampleRate ?? 0, " Hz"]
				})]
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
				className: "hidden items-baseline gap-2 rounded-sm bg-bg px-2 py-1 font-mono text-[0.6875rem] tabular-nums text-muted sm:flex",
				title: "Cursor readout at the EEG playhead",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							ref: hzRef,
							className: "text-fg",
							children: "—"
						}),
						" ",
						"Hz"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						ref: bandRef,
						className: "uppercase",
						children: "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							ref: uvRef,
							className: "text-fg",
							children: "—"
						}),
						" ",
						"µV"
					] }),
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
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						"EEG",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							ref: eegRef,
							className: "text-fg",
							children: formatTime(0, true)
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "hidden sm:inline",
						children: ["window ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-fg",
							children: [viewDuration.toFixed(viewDuration < 10 ? 1 : 0), "s"]
						})]
					}),
					soundActive ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "hidden sm:inline",
						children: [
							"audio",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								ref: audioRef,
								className: "text-fg",
								children: [(mix?.duration ?? 0).toFixed(2), "s"]
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden sm:inline text-subtle",
						children: "visual"
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
				disabled: !segment || !soundActive,
				title: soundActive ? "Download mapped WAV" : soundMode === "off" ? "Choose a sound mode to enable mapped WAV export" : evidenceReason ?? "This recording is not compatible with the selected sound mode",
				onClick: download,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), " WAV"]
			})
		]
	});
}
function finiteValues(samples) {
	const values = [];
	const step = Math.max(1, Math.floor(samples.length / 12e3));
	for (let i = 0; i < samples.length; i += step) {
		const value = samples[i];
		if (Number.isFinite(value)) values.push(value);
	}
	return values;
}
function median(values) {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length * .5)] ?? 0;
}
function percentile(values, p) {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))] ?? 0;
}
function ekgDisplayProfile(samples) {
	const values = finiteValues(samples);
	if (values.length === 0) return {
		baselineUv: 0,
		robustPeakUv: 1,
		clipUv: 1.8
	};
	const baselineUv = median(values);
	const centered = values.map((value) => Math.abs(value - baselineUv));
	const p90 = percentile(centered, .9);
	const p995 = percentile(centered, .995);
	const robustPeakUv = Math.max(1e-6, p995 * 1.12, p90 * 1.65, percentileAbs(Float32Array.from(centered), .75) * 4);
	return {
		baselineUv,
		robustPeakUv,
		clipUv: robustPeakUv * 1.45
	};
}
function displayScaleForChannel(laneHeight, sensitivityUv, kind, ekg = null) {
	if (kind === "ekg" && ekg) return Math.max(1, laneHeight) * .36 / Math.max(1e-6, ekg.robustPeakUv);
	return Math.max(1, laneHeight) * .92 / Math.max(10, sensitivityUv);
}
function normalizeEkgValue(value, profile) {
	const centered = Number.isFinite(value) ? value - profile.baselineUv : 0;
	return Math.max(-profile.clipUv, Math.min(profile.clipUv, centered));
}
function normalizeEkgWindow(min, max, mid, profile) {
	const nextMin = new Float32Array(min.length);
	const nextMax = new Float32Array(max.length);
	for (let i = 0; i < min.length; i++) {
		nextMin[i] = normalizeEkgValue(min[i], profile);
		nextMax[i] = normalizeEkgValue(max[i], profile);
	}
	return {
		min: nextMin,
		max: nextMax,
		mid: mid ? Float32Array.from(mid, (value) => normalizeEkgValue(value, profile)) : null
	};
}
/** Stable, color-vision-friendly trace colors. Assignment is based on id, never render order. */
var TRACE_PALETTE = [
	"#5cc8d5",
	"#6e9be6",
	"#9a8bd8",
	"#69b889",
	"#d3a35c",
	"#d67878"
];
var AUX_TRACE_COLORS = {
	ekg: "#dc7777",
	eog: "#c59bda",
	emg: "#d3a35c",
	extra: "#8f98a5",
	dc: "#8f98a5",
	other: "#8f98a5"
};
var LATERALITY_COLORS = {
	left: "#5cc8d5",
	right: "#d3a35c",
	midline: "#c5cbd4",
	unknown: "#8f98a5"
};
function stableHash(value) {
	let hash = 2166136261;
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}
function stableTraceColor(id, kind, laterality) {
	if (kind !== "eeg") return AUX_TRACE_COLORS[kind] ?? LATERALITY_COLORS[laterality];
	return TRACE_PALETTE[stableHash(id) % TRACE_PALETTE.length];
}
var GUTTER = 132;
var RULER = 18;
var OVERVIEW_H = 72;
var DSA_H = 112;
var DSA_LEFT = 34;
var DSA_RIGHT = 82;
var DSA_TOP = 14;
var DSA_BOTTOM = 17;
var EVENT_LANE = 18;
/** Below this samples/pixel, min–max bars collapse — draw an interpolated polyline instead. */
var MINMAX_SPP = 1.8;
function traceWeight(samplesPerPixelValue, hovered) {
	return (samplesPerPixelValue <= MINMAX_SPP ? 1 : Math.max(.42, Math.sqrt(1.15 / samplesPerPixelValue))) * (hovered ? 1.08 : 1);
}
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
function drawPolyline(ctx, y, x0, mid, scale, sign, offset = 0) {
	ctx.beginPath();
	for (let p = 0; p < y.length; p++) {
		const x = x0 + p + .5;
		const yy = mid + sign * (y[p] - offset) * scale;
		if (p === 0) ctx.moveTo(x, yy);
		else ctx.lineTo(x, yy);
	}
	ctx.stroke();
}
function drawLane(ctx, min, max, x0, mid, scale, sign, color, alpha, midV, offset = 0, weight = 1) {
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = color;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	if (midV) {
		ctx.lineWidth = 1.35 * weight;
		drawPolyline(ctx, midV, x0, mid, scale, sign, offset);
		ctx.globalAlpha = 1;
		return;
	}
	ctx.globalAlpha = alpha * .38;
	ctx.fillStyle = color;
	ctx.beginPath();
	for (let p = 0; p < min.length; p++) {
		const x = x0 + p + .5;
		const yHi = mid + sign * (max[p] - offset) * scale;
		if (p === 0) ctx.moveTo(x, yHi);
		else ctx.lineTo(x, yHi);
	}
	for (let p = min.length - 1; p >= 0; p--) ctx.lineTo(x0 + p + .5, mid + sign * (min[p] - offset) * scale);
	ctx.closePath();
	ctx.fill();
	ctx.globalAlpha = alpha;
	ctx.lineWidth = 1.15 * weight;
	ctx.beginPath();
	for (let p = 0; p < min.length; p++) {
		const x = x0 + p + .5;
		ctx.moveTo(x, mid + sign * (min[p] - offset) * scale);
		ctx.lineTo(x, mid + sign * (max[p] - offset) * scale);
	}
	ctx.stroke();
	ctx.beginPath();
	for (let p = 0; p < min.length; p++) {
		const x = x0 + p + .5;
		const y = mid + sign * (max[p] - offset) * scale;
		if (p === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();
	ctx.beginPath();
	for (let p = 0; p < min.length; p++) {
		const x = x0 + p + .5;
		const y = mid + sign * (min[p] - offset) * scale;
		if (p === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();
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
	const hoveredTrackRef = (0, import_react.useRef)(null);
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
						hoveredTrackRef.current,
						cssW,
						cssH,
						Object.values(s.tracks).map((tr) => `${tr.id}:${tr.mute ? 1 : 0}${tr.solo ? 1 : 0}`).join(",")
					].join("|");
					if (sig !== waveSig) {
						waveSig = sig;
						drawEditor(ectx, cssW, cssH, list, s, viewStart, viewEnd, hoveredTrackRef.current);
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
					const sig = `${s.dsa?.nTime ?? 0}|${s.dsa?.dbMin ?? 0}|${s.dsa?.dbMax ?? 0}|${dsaW}|${dsaH}`;
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
		if (s.followPlayhead) s.setFollow(false);
		const vs = s.followPlayhead && playback.playing ? followViewStart(eegNow(s), s.viewDuration, segment.duration) : s.viewStart;
		const t = timeAtFraction(clamp$1(x / Math.max(1, plotW), 0, 1), vs, s.viewDuration);
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
		if (s.audibleScrub) playback.scrubAt(t, 0);
	};
	const onOverviewPointer = (e) => {
		if (!segment || !overviewWrapRef.current) return;
		const rect = overviewWrapRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const w = rect.width;
		const tClick = clamp$1(x / Math.max(1, w), 0, 1) * segment.duration;
		const s = useEegStore.getState();
		if (s.followPlayhead) s.setFollow(false);
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
		const plotW = Math.max(1, rect.width - DSA_LEFT - DSA_RIGHT);
		const x = e.clientX - rect.left - DSA_LEFT;
		const frac = clamp$1(x / plotW, 0, 1);
		const s = useEegStore.getState();
		const vs = s.followPlayhead && playback.playing ? followViewStart(eegNow(s), s.viewDuration, segment.duration) : s.viewStart;
		const vd = s.viewDuration;
		const x0 = vs / segment.duration * plotW;
		const x1 = (vs + vd) / segment.duration * plotW;
		const edge = 8;
		let kind = "dsa-seek";
		if (Math.abs(x - x0) <= edge) kind = "dsa-resize-l";
		else if (Math.abs(x - x1) <= edge) kind = "dsa-resize-r";
		else if (x >= x0 && x <= x1) kind = "dsa-pan";
		e.currentTarget.setPointerCapture?.(e.pointerId);
		dragRef.current = {
			kind,
			x0: e.clientX,
			start0: vs,
			dur0: vd
		};
		if (s.followPlayhead) s.setFollow(false);
		if (kind === "dsa-seek") {
			seekEeg(frac * segment.duration);
			if (s.audibleScrub) playback.scrubAt(frac * segment.duration, 0);
		}
	};
	const onPointerMove = (e) => {
		const drag = dragRef.current;
		if (!segment) return;
		if (!drag) {
			const rect = wrapRef.current?.getBoundingClientRect();
			const list = (segment.tracks ?? []).filter((t) => t.kind !== "extra");
			if (rect && e.clientX - rect.left >= GUTTER && list.length > 0) {
				const laneH = Math.max(1, (rect.height - RULER) / list.length);
				const next = list[Math.floor((e.clientY - rect.top - RULER) / laneH)]?.id ?? null;
				if (next !== hoveredTrackRef.current) {
					hoveredTrackRef.current = next;
					paintRef.current();
				}
			}
			return;
		}
		const s = useEegStore.getState();
		if (drag.kind === "caliper" && wrapRef.current) {
			const rect = wrapRef.current.getBoundingClientRect();
			const plotW = Math.max(1, rect.width - GUTTER);
			const frac = clamp$1((e.clientX - rect.left - GUTTER) / plotW, 0, 1);
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
			const next = timeAtFraction(clamp$1((e.clientX - rect.left - GUTTER) / plotW, 0, 1), s.followPlayhead && playback.playing ? followViewStart(eegNow(s), s.viewDuration, segment.duration) : s.viewStart, s.viewDuration);
			seekEeg(next);
			if (s.audibleScrub) playback.scrubAt(next, e.clientX - drag.x0);
			return;
		}
		if ((drag.kind === "dsa-pan" || drag.kind === "dsa-resize-l" || drag.kind === "dsa-resize-r" || drag.kind === "dsa-seek") && dsaWrapRef.current) {
			const rect = dsaWrapRef.current.getBoundingClientRect();
			const plotW = Math.max(1, rect.width - DSA_LEFT - DSA_RIGHT);
			const dt = (e.clientX - drag.x0) / plotW * segment.duration;
			if (drag.kind === "dsa-pan") setView(drag.start0 + dt, drag.dur0);
			else if (drag.kind === "dsa-resize-l") {
				const end = drag.start0 + drag.dur0;
				setView(drag.start0 + dt, end - (drag.start0 + dt));
			} else if (drag.kind === "dsa-resize-r") setView(drag.start0, drag.dur0 + dt);
			else {
				const next = clamp$1((e.clientX - rect.left - DSA_LEFT) / plotW, 0, 1) * segment.duration;
				seekEeg(next);
				if (s.audibleScrub) playback.scrubAt(next, e.clientX - drag.x0);
			}
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
			const frac = clamp$1((e.clientX - rect.left) / Math.max(1, w), 0, 1);
			seekEeg(frac * segment.duration);
		}
	};
	const onPointerUp = () => {
		dragRef.current = null;
		playback.endScrub();
	};
	const onPointerLeave = () => {
		if (hoveredTrackRef.current !== null) {
			hoveredTrackRef.current = null;
			paintRef.current();
		}
	};
	(0, import_react.useEffect)(() => {
		const wrap = wrapRef.current;
		if (!wrap) return;
		const onWheel = (e) => {
			if (!useEegStore.getState().segment) return;
			e.preventDefault();
			if (e.shiftKey) {
				const s = useEegStore.getState();
				if (s.followPlayhead) s.setFollow(false);
				const span = s.viewDuration;
				panView((e.deltaY + e.deltaX) * .0015 * span);
				return;
			}
			const rect = wrap.getBoundingClientRect();
			const x = e.clientX - rect.left - GUTTER;
			const s = useEegStore.getState();
			const vs = s.followPlayhead && playback.playing ? followViewStart(eegNow(s), s.viewDuration, s.segment.duration) : s.viewStart;
			const frac = clamp$1(x / Math.max(1, rect.width - GUTTER), 0, 1);
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
				onPointerLeave,
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
				className: cn("relative shrink-0 cursor-ew-resize border-b border-border bg-bg select-none", !showDsa && "hidden"),
				style: { height: showDsa ? DSA_H : 0 },
				onPointerDown: onDsaPointer,
				onPointerMove,
				onPointerUp,
				onPointerCancel: onPointerUp,
				onPointerLeave,
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
						children: "DSA · PSD (dB)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-none absolute right-2 top-1 font-mono text-[0.5625rem] text-subtle",
						children: "stable scale · drag window"
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
				onPointerLeave,
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
function drawEditor(ctx, cssW, cssH, list, s, viewStart, viewEnd, hoveredTrackId) {
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
	ctx.font = "500 10px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
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
		const color = stableTraceColor(tr.id, tr.kind, lat);
		const hovered = hoveredTrackId === tr.id;
		const alpha = hovered ? 1 : live ? 1 : anySolo || st?.mute ? .2 : .56;
		const raw = envelopeWindow(tr.samples, tr.sampleRate, viewStart, viewEnd, nPix);
		const spp = samplesPerPixel(tr.sampleRate, viewStart, viewEnd, nPix);
		const rawMid = spp < MINMAX_SPP ? interpWindow(tr.samples, tr.sampleRate, viewStart, viewEnd, nPix) : null;
		const profile = tr.kind === "ekg" ? ekgDisplayProfile(tr.samples) : null;
		const display = profile ? normalizeEkgWindow(raw.min, raw.max, rawMid, profile) : {
			min: raw.min,
			max: raw.max,
			mid: rawMid
		};
		const scale = displayScaleForChannel(laneH, s.sensitivityUv, tr.kind, profile);
		const weight = traceWeight(spp, hovered);
		drawLane(ctx, display.min, display.max, plotX, mid, scale, sign, color, alpha, display.mid, 0, weight);
	});
	if (list.length > 0 && laneH > 18) {
		const mid = plotTop + laneH / 2;
		const half = laneH * .92 / 2;
		const x = cssW - 5;
		ctx.strokeStyle = "rgba(232,234,237,0.55)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x - 6, mid - half);
		ctx.lineTo(x, mid - half);
		ctx.lineTo(x, mid + half);
		ctx.lineTo(x - 6, mid + half);
		ctx.stroke();
		ctx.fillStyle = "#8b919c";
		ctx.font = "500 9px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		ctx.fillText(`${s.sensitivityUv} µV`, x - 8, mid);
		ctx.textAlign = "left";
	}
}
function drawEditorOverlay(ctx, cssW, cssH, t, viewStart, viewDur, _total, annotations = [], showAuto = true, selected = null, caliper = null, showAnnotations = true) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, cssW, cssH);
	const plotX = GUTTER;
	const plotW = Math.max(10, cssW - GUTTER);
	const viewEnd = viewStart + viewDur;
	if (showAnnotations) for (const a of annotations) {
		if (a.source === "auto" && (a.type === "qrs" || !showAuto)) continue;
		if (a.end < viewStart || a.start > viewEnd) continue;
		const x0 = plotX + clamp$1((a.start - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
		const x1 = plotX + clamp$1((Math.max(a.end, a.start + .02) - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
		ctx.fillStyle = MORPH_COLOR[a.type] ?? "#c8ccd4";
		ctx.globalAlpha = a.id === selected ? .55 : .28;
		ctx.fillRect(x0, 0, Math.max(2, x1 - x0), EVENT_LANE);
		ctx.globalAlpha = 1;
		ctx.fillRect(x0, EVENT_LANE, 2, cssH - EVENT_LANE);
	}
	if (caliper) {
		const xa = plotX + clamp$1((caliper.a - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
		const xb = plotX + clamp$1((caliper.b - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
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
		ctx.font = "500 11px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
		const dt = Math.abs(caliper.b - caliper.a);
		const hz = dt > 1e-4 ? 1 / dt : 0;
		const label = hz > .2 && hz < 80 ? `${dt.toFixed(3)} s  ${hz.toFixed(1)} Hz` : `${dt.toFixed(3)} s`;
		ctx.fillText(label, Math.min(xa, xb) + 6, 14);
	}
	if (t < viewStart || t > viewStart + viewDur) return;
	const x = plotX + clamp$1((t - viewStart) / Math.max(1e-6, viewDur), 0, 1) * plotW;
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
		const raw = envelopeWindow(tr.samples, tr.sampleRate, 0, total, nPix);
		const profile = tr.kind === "ekg" ? ekgDisplayProfile(tr.samples) : null;
		const display = profile ? normalizeEkgWindow(raw.min, raw.max, null, profile) : raw;
		const scale = displayScaleForChannel(laneH, s.sensitivityUv, tr.kind, profile);
		ctx.globalAlpha = .9;
		ctx.strokeStyle = stableTraceColor(tr.id, tr.kind, lat);
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let p = 0; p < display.min.length; p++) {
			ctx.moveTo(p + .5, mid + sign * display.min[p] * scale);
			ctx.lineTo(p + .5, mid + sign * display.max[p] * scale);
		}
		ctx.stroke();
		ctx.globalAlpha = 1;
	});
	ctx.fillStyle = "#5c6370";
	ctx.font = "500 9px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
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
		if (a.source === "auto" && (a.type === "qrs" || !showAuto)) continue;
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
	ctx.strokeStyle = "rgba(232,234,237,0.95)";
	ctx.lineWidth = 1.25;
	ctx.beginPath();
	const px = t / total * cssW;
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
	const plotCssW = Math.max(1, cssW - DSA_LEFT - DSA_RIGHT);
	const plotW = Math.max(1, Math.floor(plotCssW * dpr));
	const plotH = Math.max(1, Math.floor((cssH - DSA_TOP - DSA_BOTTOM) * dpr));
	const img = ctx.createImageData(plotW, plotH);
	const data = img.data;
	const mid = plotH / 2;
	for (let x = 0; x < plotW; x++) {
		const ti = Math.min(frame.nTime - 1, Math.floor(x / plotW * frame.nTime));
		for (let y = 0; y < plotH; y++) {
			let src;
			let fBin;
			if (y < mid) {
				src = frame.l;
				const u = 1 - y / Math.max(1, mid - 1);
				fBin = Math.min(frame.nFreq - 1, Math.floor(u * (frame.nFreq - 1)));
			} else {
				src = frame.r;
				const u = (y - mid) / Math.max(1, plotH - mid - 1);
				fBin = Math.min(frame.nFreq - 1, Math.floor(u * (frame.nFreq - 1)));
			}
			const [r, g, b] = dsaRgb(dsaUnit(src[ti * frame.nFreq + fBin] ?? 0, frame.dbMin, frame.dbMax));
			const i = (y * plotW + x) * 4;
			data[i] = r;
			data[i + 1] = g;
			data[i + 2] = b;
			data[i + 3] = 255;
		}
	}
	ctx.putImageData(img, Math.round(DSA_LEFT * dpr), Math.round(DSA_TOP * dpr));
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.strokeStyle = "rgba(232,234,237,0.18)";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(DSA_LEFT, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) / 2);
	ctx.lineTo(cssW - DSA_RIGHT, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) / 2);
	ctx.stroke();
	ctx.fillStyle = "#8b919c";
	ctx.font = "500 9px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
	ctx.textBaseline = "middle";
	ctx.fillText("L", 7, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) * .25);
	ctx.fillText("0", 7, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) * .5);
	ctx.fillText("R", 7, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) * .75);
	ctx.textAlign = "right";
	ctx.fillText(`${frame.fMax.toFixed(0)} Hz`, 29, 18);
	ctx.fillText(`${(frame.fMax / 2).toFixed(0)} Hz`, 29, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) * .25);
	ctx.fillText("0 Hz", 29, DSA_TOP + (cssH - DSA_TOP - DSA_BOTTOM) * .5);
	ctx.textAlign = "left";
	const legendX = cssW - DSA_RIGHT + 10;
	const legendY = 18;
	const legendW = Math.max(16, 62);
	const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendW, 0);
	for (let i = 0; i <= 10; i++) {
		const [r, g, b] = dsaRgb(i / 10);
		gradient.addColorStop(i / 10, `rgb(${r} ${g} ${b})`);
	}
	ctx.fillStyle = gradient;
	ctx.fillRect(legendX, legendY, legendW, 5);
	ctx.fillStyle = "#8b919c";
	ctx.textBaseline = "top";
	ctx.fillText(`${Math.round(frame.dbMax)} dB`, legendX, 26);
	ctx.textAlign = "right";
	ctx.fillText(`${Math.round(frame.dbMin)} dB`, legendX + legendW, 26);
	ctx.textAlign = "left";
	ctx.fillText("PSD", legendX, cssH - 10);
	ctx.textBaseline = "bottom";
	const timeStep = niceStep(frame.duration);
	for (let time = 0; time <= frame.duration + 1e-6; time += timeStep) {
		const x = DSA_LEFT + time / Math.max(1e-6, frame.duration) * plotCssW;
		ctx.fillText(formatTick(time, frame.duration), x + 2, cssH - 2);
	}
}
function drawDsaOverlay(ctx, cssW, cssH, t, viewStart, viewDur, total) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, cssW, cssH);
	if (total <= 0) return;
	const plotW = Math.max(1, cssW - DSA_LEFT - DSA_RIGHT);
	const plotX = (time) => DSA_LEFT + time / total * plotW;
	const x0 = plotX(viewStart);
	const x1 = plotX(viewStart + viewDur);
	const plotTop = DSA_TOP;
	const plotH = Math.max(1, cssH - DSA_TOP - DSA_BOTTOM);
	ctx.fillStyle = "rgba(232,234,237,0.06)";
	ctx.fillRect(x0, plotTop, Math.max(2, x1 - x0), plotH);
	ctx.strokeStyle = "rgba(232,234,237,0.45)";
	ctx.lineWidth = 1;
	ctx.strokeRect(x0 + .5, 14.5, Math.max(2, x1 - x0 - 1), plotH - 1);
	ctx.strokeStyle = "rgba(232,234,237,0.95)";
	ctx.lineWidth = 1.25;
	ctx.beginPath();
	ctx.moveTo(plotX(t), plotTop);
	ctx.lineTo(plotX(t), plotTop + plotH);
	ctx.stroke();
	ctx.fillStyle = "rgba(232,234,237,0.9)";
	ctx.font = "500 9px 'SF Mono', 'Cascadia Mono', ui-monospace, monospace";
	ctx.textBaseline = "bottom";
	ctx.fillText(formatTick(t, viewDur), Math.min(cssW - DSA_RIGHT - 34, Math.max(36, plotX(t) + 4)), cssH - 2);
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "size-2 shrink-0 rounded-full",
				style: { background: stableTraceColor(track.id, track.kind, lat) },
				"aria-hidden": "true"
			}),
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
var selectClass = "h-8 max-w-32 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent";
var toolClass = "flex h-8 items-center gap-1 rounded-sm px-2 text-[0.6875rem] font-medium transition-colors";
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
	const tool = useEegStore((s) => s.tool);
	const setTool = useEegStore((s) => s.setTool);
	const showAnnotations = useEegStore((s) => s.showAnnotations);
	const setShowAnnotations = useEegStore((s) => s.setShowAnnotations);
	const annotations = useEegStore((s) => s.annotations);
	const showAuto = useEegStore((s) => s.showAuto);
	const setShowAuto = useEegStore((s) => s.setShowAuto);
	const confirmed = annotations.filter((a) => a.source !== "auto").length;
	const suggestions = annotations.filter((a) => a.source === "auto" && a.type !== "qrs").length;
	const selectedPage = PAGE_PRESETS.reduce((closest, value) => Math.abs(value - viewDuration) < Math.abs(closest - viewDuration) ? value : closest, PAGE_PRESETS[0]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex shrink-0 flex-wrap items-end gap-x-3 gap-y-2 border-b border-border bg-surface px-3 py-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Montage",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: selectClass,
					value: montage,
					onChange: (event) => setMontage(event.currentTarget.value),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "double-banana",
							children: "Double banana"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "transverse",
							children: "Transverse"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "original",
							children: "Referential"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "custom",
							children: "Custom"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Page",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: selectClass,
							value: selectedPage,
							onChange: (event) => setViewDuration(Number(event.currentTarget.value)),
							children: PAGE_PRESETS.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value,
								children: [value, " seconds"]
							}, value))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: toolClass + " bg-bg text-muted hover:bg-surface-2 hover:text-fg",
							onClick: () => page(-1),
							"aria-label": "Previous page",
							children: "‹"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: toolClass + " bg-bg text-muted hover:bg-surface-2 hover:text-fg",
							onClick: () => page(1),
							"aria-label": "Next page",
							children: "›"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "LFF",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: selectClass,
					value: filters.lff,
					onChange: (event) => setFilters({
						lff: Number(event.currentTarget.value),
						bandpass: false
					}),
					children: LFF_PRESETS.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value,
						children: value === 0 ? "Off" : `${value} Hz`
					}, value))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "HFF",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: selectClass,
					value: filters.hff,
					onChange: (event) => setFilters({
						hff: Number(event.currentTarget.value),
						bandpass: false
					}),
					children: HFF_PRESETS.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value,
						children: value === 0 ? "Off" : `${value} Hz`
					}, value))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Notch",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: selectClass,
					value: filters.notch60 ? "on" : "off",
					onChange: (event) => setFilters({ notch60: event.currentTarget.value === "on" }),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "off",
						children: "Off"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "on",
						children: "60 Hz"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Sensitivity",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: selectClass,
					value: sensitivity,
					onChange: (event) => setSensitivity(Number(event.currentTarget.value)),
					children: SENSITIVITY_PRESETS.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
						value,
						children: [value, " µV"]
					}, value))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ml-auto flex flex-wrap items-center gap-1",
				"aria-label": "Review tools",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setTool("pointer"),
						className: cn(toolClass, tool === "pointer" ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:bg-surface-2 hover:text-fg"),
						"aria-pressed": tool === "pointer",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MousePointer2, {}), "Pointer"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setTool("annotate"),
						className: cn(toolClass, tool === "annotate" ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:bg-surface-2 hover:text-fg"),
						"aria-pressed": tool === "annotate",
						children: "Annotate"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setTool("caliper"),
						className: cn(toolClass, tool === "caliper" ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:bg-surface-2 hover:text-fg"),
						"aria-pressed": tool === "caliper",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ruler, {}), "Caliper"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setShowAnnotations(!showAnnotations),
						className: cn(toolClass, showAnnotations ? "bg-accent text-accent-fg" : "bg-bg text-muted hover:bg-surface-2 hover:text-fg"),
						"aria-pressed": showAnnotations,
						children: [
							showAnnotations ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden lg:inline",
								children: "Markers"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-[0.625rem]",
								children: confirmed
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setShowAuto(!showAuto),
						className: cn(toolClass, showAuto ? "bg-warn text-bg" : "bg-bg text-muted hover:bg-surface-2 hover:text-fg"),
						"aria-pressed": showAuto,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbulb, {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden lg:inline",
								children: "Suggestions"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-[0.625rem]",
								children: suggestions
							})
						]
					})
				]
			})
		]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), children]
	});
}
function isTypingTarget(el) {
	const element = el;
	const tag = element?.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	if (element?.isContentEditable) return true;
	return Boolean(element?.closest("button, a, [role='button'], [role='menuitem']"));
}
function useEditorKeys() {
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if (isTypingTarget(e.target)) return;
			const s = useEegStore.getState();
			if ((e.metaKey || e.ctrlKey) && !e.altKey) {
				if (e.key.toLowerCase() === "z") {
					e.preventDefault();
					if (e.shiftKey) s.redoAnnotations();
					else s.undoAnnotations();
				} else if (e.key.toLowerCase() === "y") {
					e.preventDefault();
					s.redoAnnotations();
				}
				return;
			}
			if (e.metaKey || e.ctrlKey || e.altKey) return;
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
			if (e.key === "," || e.key === "<") {
				e.preventDefault();
				s.nudgeSensitivity(-1);
				return;
			}
			if (e.key === "." || e.key === ">") {
				e.preventDefault();
				s.nudgeSensitivity(1);
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
		keys: [",", "<"],
		action: "Bigger waves (more sensitive)"
	},
	{
		group: "Review",
		keys: [".", ">"],
		action: "Smaller waves (less sensitive)"
	},
	{
		group: "Review",
		keys: ["Click (annotate)"],
		action: "Drop a marker"
	},
	{
		group: "Review",
		keys: ["⌘ / Ctrl", "Z"],
		action: "Undo annotation change"
	},
	{
		group: "Review",
		keys: [
			"⌘ / Ctrl",
			"Shift",
			"Z"
		],
		action: "Redo annotation change"
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
	const soundMode = useEegStore((s) => s.soundMode);
	const setSoundMode = useEegStore((s) => s.setSoundMode);
	const evidencePreparation = useEegStore((s) => s.evidencePreparation);
	const evidenceReason = useEegStore((s) => s.evidenceReason);
	const demoStarted = (0, import_react.useRef)(false);
	const fileRef = (0, import_react.useRef)(null);
	useEditorKeys();
	(0, import_react.useEffect)(() => {
		if (status !== "idle" || demoStarted.current) return;
		demoStarted.current = true;
		let cancelled = false;
		(async () => {
			try {
				const buffer = buildSyntheticEdf({ duration: 60 });
				if (!cancelled) await loadFile(buffer, "synthetic-demo.edf");
			} catch {}
		})();
		return () => {
			cancelled = true;
		};
	}, [loadFile, status]);
	const onFile = (event) => {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = "";
		if (file) loadFile(file, file.name);
	};
	const soundStatus = {
		off: "Visual review at 1× · sound off",
		evidence: evidencePreparation ? "Loui 2014 study reproduction · Level B" : evidenceReason ?? "Fz–Cz required",
		hybrid: evidencePreparation ? "Loui 2014 mapping + disclosed soft style" : evidenceReason ?? "Fz–Cz required",
		experimental: "Experimental contour mapping active",
		musical: "Musical mapping active"
	}[soundMode];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh min-h-0 flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2",
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
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "order-last flex w-full items-center gap-2 sm:order-none sm:w-auto",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "sr-only",
								htmlFor: "sound-mode",
								children: "Sound mode"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								id: "sound-mode",
								value: soundMode,
								onChange: (event) => setSoundMode(event.currentTarget.value),
								className: "h-8 rounded-sm border border-border bg-bg px-2 text-xs font-medium text-fg outline-none focus:border-accent",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "off",
										children: "Sound off"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "evidence",
										children: "Evidence"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "hybrid",
										children: "Hybrid"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "experimental",
										children: "Experimental"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "musical",
										children: "Musical"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "min-w-0 truncate text-xs text-muted",
								"aria-live": "polite",
								children: soundStatus
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: fileRef,
						type: "file",
						accept: ".edf,.EDF",
						className: "sr-only",
						onChange: onFile
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "secondary",
						onClick: () => fileRef.current?.click(),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {}),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden sm:inline",
								children: "Open EDF"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						"aria-label": "Toggle fullscreen",
						onClick: () => {
							if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
							else document.exitFullscreen?.();
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Expand, {})
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Transport, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex min-h-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: panel === true ? "absolute inset-0 z-40 flex min-h-0 w-full flex-col border-r border-border bg-surface md:static md:z-0 md:w-80 md:shrink-0" : panel === false ? "hidden" : "hidden min-h-0 w-80 shrink-0 flex-col border-r border-border bg-surface md:flex",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ControlPanel, {})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-h-0 min-w-0 flex-1 flex-col",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReviewBar, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaveformView, {})]
				})]
			}),
			aboutOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: "About Auris",
				onClose: () => setAboutOpen(false),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 text-pretty text-sm leading-relaxed text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Auris is a local EEG review workstation for teaching and exploratory listening. Evidence mode contains a Level B reproduction of the disclosed Loui 2014 Fz–Cz symbolic mapping. It is evidence for a bounded listening study, not a validated clinical interpretation. Hybrid applies a disclosed downstream soft timbre while preserving mapped pitch and timing. Experimental and musical modes remain Level X. Trace colors and the DSA display support visual review; suggested markers are educational prompts, not findings." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The overview shows the full recording and the highlighted window is the current editor page. In visual mode, playback advances the review cursor at normal EEG time. Files are processed locally in this browser." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "This is a research and teaching aid, not a diagnostic instrument. It does not detect seizures or interpret studies. Use deidentified recordings and retain clinical responsibility for any review." })
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
