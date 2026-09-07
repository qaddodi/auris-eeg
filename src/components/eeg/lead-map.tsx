"use client";

import { useMemo } from "react";
import { useEegStore } from "@/store/eeg-store";

const POSITIONS: Record<string, [number, number]> = {
  FP1: [28, 18], F7: [12, 34], T7: [8, 50], P7: [12, 66], O1: [28, 82],
  F3: [36, 34], C3: [36, 50], P3: [36, 66], FZ: [50, 28], CZ: [50, 50], PZ: [50, 72],
  FP2: [72, 18], F8: [88, 34], T8: [92, 50], P8: [88, 66], O2: [72, 82],
  F4: [64, 34], C4: [64, 50], P4: [64, 66],
};

function canonical(label: string): string {
  const key = label.toUpperCase().replace(/\s+/g, "").replace("EEG", "").replace(/[–—]/g, "-");
  return ({ T3: "T7", T4: "T8", T5: "P7", T6: "P8" } as Record<string, string>)[key] ?? key;
}

export function LeadMap() {
  const findings = useEegStore((s) => s.machineFindings);
  const selectedId = useEegStore((s) => s.selectedFindingId);
  const setSelected = useEegStore((s) => s.setSelectedFinding);
  const active = useMemo(() => {
    const map = new Map<string, { count: number; selected: boolean }>();
    for (const finding of findings) {
      if (finding.reviewStatus === "dismissed") continue;
      const selected = finding.id === selectedId;
      const electrodes = [...finding.electrodeProbabilities.map((item) => item.electrode), ...finding.candidateElectrodes.map((item) => item.electrode), ...finding.displayedDerivations.flatMap((item) => item.electrodes)];
      for (const electrode of electrodes) {
        const key = canonical(electrode);
        const prior = map.get(key);
        map.set(key, { count: (prior?.count ?? 0) + 1, selected: Boolean(prior?.selected || selected) });
      }
    }
    return map;
  }, [findings, selectedId]);
  const selected = selectedId ? findings.find((finding) => finding.id === selectedId) : null;
  return <div className="rounded-md border border-border bg-bg p-2" aria-label="Electrode distribution map">
    <div className="mb-1 flex items-center justify-between"><p className="text-[0.625rem] font-semibold uppercase tracking-wider text-subtle">Electrode map</p><span className="font-mono text-[0.625rem] text-muted">{active.size} leads</span></div>
    <svg viewBox="0 0 100 100" className="mx-auto block h-32 w-full max-w-[11rem]" role="img" aria-label="Compact scalp electrode map">
      <ellipse cx="50" cy="50" rx="42" ry="45" fill="none" stroke="currentColor" strokeOpacity=".25" />
      <path d="M50 5v90M8 50h84" stroke="currentColor" strokeOpacity=".1" />
      {Object.entries(POSITIONS).map(([name, [x, y]]) => {
        const item = active.get(name);
        const emphasized = item?.selected || (selected?.laterality === "left" && x < 50) || (selected?.laterality === "right" && x > 50) || (selected?.laterality === "midline" && Math.abs(x - 50) < 8);
        return <g key={name} className="cursor-pointer" onClick={() => selectedId && setSelected(selectedId)}><circle cx={x} cy={y} r={emphasized ? 3.1 : item ? 2.4 : 1.45} fill={item ? "#7eb8c9" : "#68717c"} fillOpacity={item ? Math.min(1, .45 + item.count * .12) : .55} stroke={emphasized ? "#f2c879" : "none"} strokeWidth=".9" /><text x={x} y={y - 3.5} textAnchor="middle" fill="currentColor" fontSize="3.5" opacity={item ? 1 : .62}>{name}</text></g>;
      })}
    </svg>
    <p className="text-[0.625rem] leading-4 text-subtle">Highlighted leads reflect the selected machine finding and current montage mapping.</p>
  </div>;
}
