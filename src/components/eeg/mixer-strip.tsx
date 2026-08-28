"use client";

import { cn } from "@/lib/utils";
import type { ChannelKind, Laterality, ProcessedTrack, TrackState } from "@/lib/eeg/types";
import { Button } from "@/components/ui/button";
import { useEegStore } from "@/store/eeg-store";

const KIND_LABEL: Record<ChannelKind, string> = {
  eeg: "EEG",
  ekg: "EKG",
  eog: "Lids",
  emg: "EMG",
  extra: "Extra",
  dc: "DC",
  other: "Other",
};

function kindOf(tr: ProcessedTrack): ChannelKind {
  return tr.kind ?? "eeg";
}

export function MixerStrip() {
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
  if (list.length === 0) {
    return (
      <p className="text-xs text-subtle">Load a recording to get per-track mute, solo, and gain.</p>
    );
  }

  const groups: { kind: ChannelKind; rows: ProcessedTrack[] }[] = [];
  for (const kind of ["eeg", "eog", "ekg", "emg", "extra"] as ChannelKind[]) {
    const rows = list.filter((t) => kindOf(t) === kind);
    if (rows.length) groups.push({ kind, rows });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="secondary" onClick={() => soloHemi("left")}>
          Solo L
        </Button>
        <Button size="sm" variant="secondary" onClick={() => soloHemi("right")}>
          Solo R
        </Button>
        <Button size="sm" variant="ghost" onClick={clearSolos}>
          Clear solos
        </Button>
        <Button size="sm" variant="ghost" onClick={unmuteAll}>
          Unmute all
        </Button>
      </div>
      {groups.map((g) => (
        <div key={g.kind} className="space-y-1">
          <p className="text-[0.625rem] font-medium uppercase tracking-wider text-subtle">
            {KIND_LABEL[g.kind]}
          </p>
          <ul className="space-y-0.5">
            {g.rows.map((tr) => {
              const st = tracks[tr.id] as TrackState | undefined;
              const muted = Boolean(st?.mute);
              const solo = Boolean(st?.solo);
              const lat = st?.lateralityOverride ?? tr.laterality;
              return (
                <li
                  key={tr.id}
                  className={cn(
                    "flex items-center gap-1 rounded-sm px-1 py-0.5",
                    muted && "opacity-50",
                    solo && "bg-ok/10",
                  )}
                >
                  <button
                    type="button"
                    title="Solo (multiple allowed). Double-click = exclusive."
                    onClick={() => toggleSolo(tr.id)}
                    onDoubleClick={() => soloExclusive(tr.id)}
                    className={cn(
                      "h-6 min-w-7 rounded-sm px-1.5 text-[0.625rem] font-semibold tracking-wide",
                      solo ? "bg-ok text-bg" : "bg-bg text-subtle shadow-border hover:text-fg",
                    )}
                  >
                    S
                  </button>
                  <button
                    type="button"
                    title={muted ? "Unmute" : "Mute"}
                    onClick={() => toggleMute(tr.id)}
                    className={cn(
                      "h-6 min-w-7 rounded-sm px-1.5 text-[0.625rem] font-semibold tracking-wide",
                      muted ? "bg-danger text-bg" : "bg-bg text-subtle shadow-border hover:text-fg",
                    )}
                  >
                    M
                  </button>
                  <span className="min-w-0 flex-1 truncate font-mono text-[0.6875rem] text-fg">
                    {tr.label}
                  </span>
                  <span
                    className={cn(
                      "w-3 shrink-0 text-center text-[0.625rem] uppercase",
                      lat === "left" && "text-hemi-l",
                      lat === "right" && "text-hemi-r",
                      (lat === "midline" || lat === "unknown") && "text-subtle",
                    )}
                  >
                    {latLetter(lat)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={typeof st?.gain === "number" ? st.gain : 1}
                    onChange={(e) => setGain(tr.id, Number(e.target.value))}
                    className="h-1 w-14 shrink-0 cursor-pointer accent-accent"
                    aria-label={`${tr.label} gain`}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function latLetter(lat: Laterality): string {
  if (lat === "left") return "L";
  if (lat === "right") return "R";
  if (lat === "midline") return "C";
  return "—";
}
