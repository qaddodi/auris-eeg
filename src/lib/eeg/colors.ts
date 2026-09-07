import type { ChannelKind, Laterality } from "./types.ts";

/**
 * Semantic colors for the Natus longitudinal chains. Every derivation in a
 * chain shares its color, so color reinforces the anatomical grouping without
 * becoming the only way to tell channels apart.
 */
export const EEG_CHAIN_COLORS = {
  "left-temporal": "#52c3d2",
  "left-parasagittal": "#6f9fe8",
  midline: "#c2c9d2",
  "right-parasagittal": "#e0ad61",
  "right-temporal": "#dc7c82",
  unknown: "#9aa5b3",
} as const;

export const AUX_TRACE_COLORS: Record<Exclude<ChannelKind, "eeg">, string> = {
  ekg: "#ec7474",
  eog: "#c49adf",
  emg: "#e0ad61",
  extra: "#8f9aaa",
  dc: "#64b9a5",
  other: "#9aa5b3",
};

export const LATERALITY_COLORS: Record<Laterality, string> = {
  left: EEG_CHAIN_COLORS["left-parasagittal"],
  right: EEG_CHAIN_COLORS["right-parasagittal"],
  midline: EEG_CHAIN_COLORS.midline,
  unknown: EEG_CHAIN_COLORS.unknown,
};

function bananaChainForId(id: string): keyof typeof EEG_CHAIN_COLORS | null {
  const pair = id.startsWith("banana:")
    ? id
        .slice("banana:".length)
        .toUpperCase()
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, "")
    : "";
  if (["FP1-F7", "F7-T3", "T3-T5", "T5-O1"].includes(pair)) return "left-temporal";
  if (["FP1-F3", "F3-C3", "C3-P3", "P3-O1"].includes(pair)) return "left-parasagittal";
  if (["FZ-CZ", "CZ-PZ"].includes(pair)) return "midline";
  if (["FP2-F4", "F4-C4", "C4-P4", "P4-O2"].includes(pair)) return "right-parasagittal";
  if (["FP2-F8", "F8-T4", "T4-T6", "T6-O2"].includes(pair)) return "right-temporal";
  return null;
}

export function stableTraceColor(id: string, kind: ChannelKind, laterality: Laterality): string {
  if (kind !== "eeg") return AUX_TRACE_COLORS[kind] ?? LATERALITY_COLORS[laterality];
  const chain = bananaChainForId(id);
  if (chain) return EEG_CHAIN_COLORS[chain];
  // Referential/transverse/custom montages do not encode a longitudinal chain
  // in their id, so laterality is the most useful stable semantic fallback.
  return LATERALITY_COLORS[laterality] ?? EEG_CHAIN_COLORS.unknown;
}

export function traceColorForIdentity(identity: {
  id: string;
  kind: ChannelKind;
  laterality: Laterality;
}): string {
  return stableTraceColor(identity.id, identity.kind, identity.laterality);
}

export const EVENT_STYLE = {
  confirmed: "#7eb8c9",
  suggested: "#c6a86a",
  file: "#9aa6b5",
  cursor: "#f0f2f4",
} as const;
