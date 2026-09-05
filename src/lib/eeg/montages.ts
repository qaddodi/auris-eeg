import { aliasKeys, auxDisplayLabel, classifyLaterality, electrodeKey } from "./channels.ts";
import type { ChannelInfo, ChannelKind, Derivation, Laterality, MontageKind } from "./types.ts";

export const DOUBLE_BANANA: [string, string][] = [
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
  ["Cz", "Pz"],
];

export const TRANSVERSE: [string, string][] = [
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
  ["O2", "T6"],
];

function indexByKeys(channels: ChannelInfo[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const ch of channels) {
    for (const k of aliasKeys(ch.originalLabel)) {
      if (!map.has(k)) map.set(k, ch.index);
    }
    map.set(electrodeKey(ch.originalLabel), ch.index);
  }
  return map;
}

function pairLaterality(a: string, b: string): Laterality {
  const la = classifyLaterality(a);
  const lb = classifyLaterality(b);
  if (la === lb) return la;
  if (la === "unknown") return lb;
  if (lb === "unknown") return la;
  return "midline";
}

function referential(c: ChannelInfo, kind: ChannelKind, label: string): Derivation {
  return {
    id: `aux:${kind}:${c.index}`,
    label,
    sources: [c.index],
    laterality: c.laterality,
    kind,
    sampleRate: c.sampleRate,
    available: true,
    missing: [],
  };
}

export function auxDerivations(channels: ChannelInfo[]): Derivation[] {
  const ekg = channels.filter((c) => c.kind === "ekg");
  const eog = channels.filter((c) => c.kind === "eog");
  const emg = channels.filter((c) => c.kind === "emg");
  const extra = channels.filter((c) => c.kind === "extra");
  const out: Derivation[] = [];
  if (ekg.length >= 2) {
    const sameRate = ekg[0]!.sampleRate === ekg[1]!.sampleRate;
    out.push({
      id: "aux:ekg",
      label: "EKG",
      sources: [ekg[0]!.index, ekg[1]!.index],
      laterality: "midline",
      kind: "ekg",
      sampleRate: ekg[0]!.sampleRate,
      available: sameRate,
      missing: sameRate ? [] : ["matching sample rates"],
    });
  } else {
    for (const c of ekg) out.push(referential(c, "ekg", auxDisplayLabel("ekg", c.canonical)));
  }
  for (const c of eog) out.push(referential(c, "eog", auxDisplayLabel("eog", c.canonical)));
  for (const c of emg) out.push(referential(c, "emg", auxDisplayLabel("emg", c.canonical)));
  for (const c of extra) out.push(referential(c, "extra", c.canonical));
  return out;
}

export function buildOriginalMontage(channels: ChannelInfo[]): Derivation[] {
  return channels
    .filter((c) => c.isEeg)
    .map((c) => ({
      id: `ref:${c.index}`,
      label: c.canonical || c.originalLabel,
      sources: [c.index] as [number],
      laterality: c.laterality,
      kind: "eeg" as const,
      sampleRate: c.sampleRate,
      available: true,
      missing: [],
    }));
}

function buildPairs(
  channels: ChannelInfo[],
  pairs: [string, string][],
  prefix: string,
): Derivation[] {
  const map = indexByKeys(channels);
  const rate = channels.find((c) => c.isEeg)?.sampleRate ?? channels[0]?.sampleRate ?? 0;
  return pairs.map(([a, b]) => {
    const ia = findElectrode(map, a);
    const ib = findElectrode(map, b);
    const missing: string[] = [];
    if (ia == null) missing.push(a);
    if (ib == null) missing.push(b);
    const sameRate = ia == null || ib == null || channels.find((c) => c.index === ia)?.sampleRate === channels.find((c) => c.index === ib)?.sampleRate;
    const available = ia != null && ib != null && sameRate;
    if (!sameRate) missing.push("matching sample rates");
    return {
      id: `${prefix}:${a}-${b}`,
      label: `${a}–${b}`,
      sources: available ? ([ia, ib] as [number, number]) : ([ia ?? -1, ib ?? -1] as [number, number]),
      laterality: pairLaterality(a, b),
      kind: "eeg" as const,
      sampleRate: ia == null ? rate : (channels.find((c) => c.index === ia)?.sampleRate ?? rate),
      available,
      missing,
    };
  });
}

function findElectrode(map: Map<string, number>, name: string): number | undefined {
  for (const k of aliasKeys(name)) {
    const hit = map.get(k);
    if (hit != null) return hit;
  }
  return map.get(electrodeKey(name));
}

export function buildDoubleBanana(channels: ChannelInfo[]): Derivation[] {
  return buildPairs(channels, DOUBLE_BANANA, "banana");
}

export function buildTransverse(channels: ChannelInfo[]): Derivation[] {
  return buildPairs(channels, TRANSVERSE, "trans");
}

export function buildCustomPairs(
  channels: ChannelInfo[],
  pairs: [string, string][],
): Derivation[] {
  return buildPairs(channels, pairs, "custom");
}

export function montageDerivations(
  kind: MontageKind,
  channels: ChannelInfo[],
  customPairs: [string, string][] = [],
): Derivation[] {
  let core: Derivation[];
  if (kind === "original") core = buildOriginalMontage(channels);
  else if (kind === "double-banana") core = buildDoubleBanana(channels);
  else if (kind === "transverse") core = buildTransverse(channels);
  else core = buildCustomPairs(channels, customPairs);
  return [...core, ...auxDerivations(channels)];
}

export function applyDerivation(
  samplesBySignal: Float32Array[],
  der: Derivation,
): Float32Array {
  if (!der.available) return new Float32Array(0);
  if (der.sources.length === 1) {
    const src = samplesBySignal[der.sources[0]];
    return src ? new Float32Array(src) : new Float32Array(0);
  }
  const a = samplesBySignal[der.sources[0]];
  const b = samplesBySignal[der.sources[1]];
  if (!a || !b) return new Float32Array(0);
  if (a.length !== b.length) {
    throw new Error(`Cannot derive ${der.label}: source sample counts differ.`);
  }
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i]! - b[i]!;
  return out;
}

export const STANDARD_ELECTRODES = [
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
  "T2",
];
