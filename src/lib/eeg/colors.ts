import type { ChannelKind, Laterality } from "./types.ts";

/** Stable, color-vision-friendly trace colors. Assignment is based on id, never render order. */
export const TRACE_PALETTE = [
  "#5cc8d5", // cyan
  "#6e9be6", // blue
  "#9a8bd8", // indigo
  "#69b889", // green
  "#d3a35c", // amber
  "#d67878", // red
] as const;

export const AUX_TRACE_COLORS: Record<Exclude<ChannelKind, "eeg">, string> = {
  ekg: "#dc7777",
  eog: "#c59bda",
  emg: "#d3a35c",
  extra: "#8f98a5",
  dc: "#8f98a5",
  other: "#8f98a5",
};

export const LATERALITY_COLORS: Record<Laterality, string> = {
  left: "#5cc8d5",
  right: "#d3a35c",
  midline: "#c5cbd4",
  unknown: "#8f98a5",
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function stableTraceColor(id: string, kind: ChannelKind, laterality: Laterality): string {
  if (kind !== "eeg") return AUX_TRACE_COLORS[kind] ?? LATERALITY_COLORS[laterality];
  return TRACE_PALETTE[stableHash(id) % TRACE_PALETTE.length]!;
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
