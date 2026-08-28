import type { ChannelInfo, ChannelKind, Laterality } from "./types.ts";

const PREFIX = /^(eeg|eog|emg|ecg|ekg|pg|eog)\s+/i;
const SUFFIX =
  /(-ref|-le|-re|-avg|-ar|-a1|-a2|-m1|-m2|-cz|-linkedears|-linked-ears|-avr|-g2|-n\/a)*$/i;

/** Legacy 10-20 temporal names ↔ modern 10-10. */
export const TEMPORAL_ALIASES: Record<string, string> = {
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
  FT10: "FT10",
};

const LEGACY_FROM_MODERN: Record<string, string> = {
  T7: "T3",
  T8: "T4",
  P7: "T5",
  P8: "T6",
  FT9: "T1",
  FT10: "T2",
};

export function stripChannelDecorations(raw: string): string {
  let s = raw.trim();
  s = s.replace(PREFIX, "");
  s = s.replace(SUFFIX, "");
  s = s.replace(/\s+/g, "");
  return s;
}

export function canonicalElectrode(raw: string): string {
  const stripped = stripChannelDecorations(raw);
  const upper = stripped.toUpperCase();
  if (!upper) return stripped;
  const modern = TEMPORAL_ALIASES[upper] ?? upper;
  if (/^FP[12Z]$/.test(modern)) return `Fp${modern.slice(2)}`;
  if (modern.endsWith("Z") && modern.length <= 3) {
    return modern[0] + "z";
  }
  return modern;
}

export function electrodeKey(raw: string): string {
  return canonicalElectrode(raw).toUpperCase();
}

export function aliasKeys(raw: string): string[] {
  const key = electrodeKey(raw);
  const keys = new Set<string>([key, stripChannelDecorations(raw).toUpperCase()]);
  const modern = TEMPORAL_ALIASES[key];
  if (modern) keys.add(modern);
  const legacy = LEGACY_FROM_MODERN[key];
  if (legacy) keys.add(legacy);
  return [...keys];
}

export function classifyLaterality(raw: string): Laterality {
  const key = electrodeKey(raw);
  if (!key) return "unknown";
  if (key === "FZ" || key === "CZ" || key === "PZ" || key === "OZ" || key === "NZ") {
    return "midline";
  }
  if (/Z$/.test(key) && key.length <= 3) return "midline";
  const num = key.match(/(\d+)$/);
  if (num) {
    const n = Number(num[1]);
    if (n % 2 === 1) return "left";
    return "right";
  }
  if (key === "A1" || key === "M1" || key === "PG1" || key === "E1") return "left";
  if (key === "A2" || key === "M2" || key === "PG2" || key === "E2") return "right";
  return "unknown";
}

const EEG_ELECTRODE =
  /^(FP[12Z]|F[PZ]|F[3-8]|C[PZ]|C[34]|P[PZ]|P[34]|O[12Z]|T[3-8]|T[12]|A[12]|M[12]|FT[79]|FT10|P[78])$/i;

export function classifyChannelKind(label: string, unit: string): ChannelKind {
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
  if ((u === "uv" || u === "µv" || u === "μv") && !/^X\d+$/i.test(key) && !/^DC/i.test(key)) {
    return EEG_ELECTRODE.test(key) ? "eeg" : "extra";
  }
  return "other";
}

export function isLikelyEeg(label: string, unit: string): boolean {
  return classifyChannelKind(label, unit) === "eeg";
}

export function auxDisplayLabel(kind: ChannelKind, canonical: string): string {
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

export function describeChannel(
  index: number,
  label: string,
  unit: string,
  sampleRate: number,
): ChannelInfo {
  const kind = classifyChannelKind(label, unit);
  return {
    originalLabel: label,
    index,
    canonical: canonicalElectrode(label),
    laterality: classifyLaterality(label),
    kind,
    isEeg: kind === "eeg",
    unit,
    sampleRate,
  };
}

export function lateralityPan(lat: Laterality): number {
  if (lat === "left") return -1;
  if (lat === "right") return 1;
  return 0;
}
