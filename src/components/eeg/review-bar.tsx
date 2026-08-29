"use client";

import type { ReactNode } from "react";
import { HFF_PRESETS, LFF_PRESETS, PAGE_PRESETS, MAX_SENSITIVITY_UV, MIN_SENSITIVITY_UV } from "@/lib/eeg/defaults";
import { BAND_LABELS } from "@/lib/eeg/spectrum";
import type { ColorMode, MontageKind, SonifyMode } from "@/lib/eeg/types";
import { cn } from "@/lib/utils";
import { useEegStore } from "@/store/eeg-store";

const chip = "h-7 rounded-sm px-2 text-[0.6875rem] tabular-nums";

export function ReviewBar() {
  const montage = useEegStore((s) => s.montage);
  const setMontage = useEegStore((s) => s.setMontage);
  const filters = useEegStore((s) => s.filters);
  const setFilters = useEegStore((s) => s.setFilters);
  const sensitivity = useEegStore((s) => s.sensitivityUv);
  const setSensitivity = useEegStore((s) => s.setSensitivity);
  const nudgeSensitivity = useEegStore((s) => s.nudgeSensitivity);
  const fitSensitivity = useEegStore((s) => s.fitSensitivity);
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

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-surface px-3 py-1.5">
      <Group label="Montage">
        {(
          [
            ["double-banana", "Banana"],
            ["transverse", "Transverse"],
            ["original", "Ref"],
          ] as [MontageKind, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMontage(id)}
            className={cn(chip, montage === id ? "bg-accent text-accent-fg" : "bg-bg text-muted")}
          >
            {label}
          </button>
        ))}
      </Group>
      <Group label="LFF">
        {LFF_PRESETS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilters({ lff: v, bandpass: false })}
            className={cn(chip, filters.lff === v ? "bg-accent text-accent-fg" : "bg-bg text-muted")}
          >
            {v === 0 ? "Off" : v}
          </button>
        ))}
      </Group>
      <Group label="HFF">
        {HFF_PRESETS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilters({ hff: v, bandpass: false })}
            className={cn(chip, filters.hff === v ? "bg-accent text-accent-fg" : "bg-bg text-muted")}
          >
            {v === 0 ? "Off" : v}
          </button>
        ))}
      </Group>
      <Group label="Notch">
        <button
          type="button"
          onClick={() => setFilters({ notch60: !filters.notch60 })}
          className={cn(chip, filters.notch60 ? "bg-accent text-accent-fg" : "bg-bg text-muted")}
        >
          60
        </button>
      </Group>
      <Group label="µV">
        <button
          type="button"
          title="More sensitive — bigger waves (,)"
          onClick={() => nudgeSensitivity(-1)}
          className={cn(chip, "bg-bg text-muted")}
        >
          −
        </button>
        <input
          type="range"
          min={Math.log10(MIN_SENSITIVITY_UV)}
          max={Math.log10(MAX_SENSITIVITY_UV)}
          step={0.01}
          value={Math.log10(sensitivity)}
          onChange={(e) => setSensitivity(10 ** Number(e.target.value))}
          className="h-7 w-24 accent-accent"
          aria-label="Display sensitivity in microvolts"
        />
        <button
          type="button"
          title="Less sensitive — smaller waves (.)"
          onClick={() => nudgeSensitivity(1)}
          className={cn(chip, "bg-bg text-muted")}
        >
          +
        </button>
        <span className="w-8 font-mono text-[0.625rem] tabular-nums text-muted">{sensitivity}</span>
        {([30, 50, 70, 100, 150, 300] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setSensitivity(v)}
            className={cn(
              chip,
              "hidden md:inline-flex",
              sensitivity === v ? "bg-accent text-accent-fg" : "bg-bg text-muted",
            )}
          >
            {v}
          </button>
        ))}
        <button
          type="button"
          title="Fit traces to the current page"
          onClick={() => fitSensitivity()}
          className={cn(chip, "bg-bg text-muted")}
        >
          Fit
        </button>
      </Group>
      <Group label="Page">
        {PAGE_PRESETS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setViewDuration(v)}
            className={cn(chip, Math.abs(viewDuration - v) < 0.05 ? "bg-accent text-accent-fg" : "bg-bg text-muted")}
          >
            {v}s
          </button>
        ))}
        <button type="button" className={cn(chip, "bg-bg text-muted")} onClick={() => page(-1)}>
          Pg↑
        </button>
        <button type="button" className={cn(chip, "bg-bg text-muted")} onClick={() => page(1)}>
          Pg↓
        </button>
      </Group>
      <Group label="Listen">
        {(
          [
            ["contour", "Contour"],
            ["pen", "Pen"],
            ["piano", "Piano"],
            ["pulse", "Pulse"],
            ["choir", "Choir"],
            ["direct", "Direct"],
          ] as [SonifyMode, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSonify(id === "piano" ? { mode: id, quantize: true } : { mode: id })}
            className={cn(chip, sonify.mode === id ? "bg-accent text-accent-fg" : "bg-bg text-muted")}
          >
            {label}
          </button>
        ))}
      </Group>
      <Group label="Vol">
        <input
          type="range"
          min={0.4}
          max={2.2}
          step={0.05}
          value={sonify.volume ?? 1.45}
          onChange={(e) => setSonify({ volume: Number(e.target.value) })}
          className="h-7 w-24 accent-accent"
          aria-label="Listen volume"
        />
        <span className="w-8 font-mono text-[0.625rem] tabular-nums text-muted">
          {Math.round((sonify.volume ?? 1.45) * 100)}%
        </span>
      </Group>
      <Group label="Color">
        {(
          [
            ["band", "Hz"],
            ["hemi", "Hemi"],
          ] as [ColorMode, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setColorBy(id)}
            className={cn(chip, colorBy === id ? "bg-accent text-accent-fg" : "bg-bg text-muted")}
          >
            {label}
          </button>
        ))}
      </Group>
      <Group label="DSA">
        <button
          type="button"
          onClick={() => setShowDsa(!showDsa)}
          className={cn(chip, showDsa ? "bg-accent text-accent-fg" : "bg-bg text-muted")}
        >
          {showDsa ? "On" : "Off"}
        </button>
      </Group>
      <div className="hidden items-center gap-1.5 lg:flex" title="Trace color by instantaneous frequency">
        {BAND_LABELS.map((b) => (
          <span key={b.id} className="flex items-center gap-1 font-mono text-[0.625rem] text-muted">
            <span
              className="inline-block size-1.5 rounded-full"
              style={{ background: `var(--color-band-${b.id})` }}
            />
            {b.glyph}
          </span>
        ))}
      </div>
      <Group label="Tool">
        <button
          type="button"
          onClick={() => setTool("pointer")}
          className={cn(chip, tool === "pointer" ? "bg-accent text-accent-fg" : "bg-bg text-muted")}
        >
          Pointer
        </button>
        <button
          type="button"
          onClick={() => setTool("annotate")}
          className={cn(chip, tool === "annotate" ? "bg-accent text-accent-fg" : "bg-bg text-muted")}
        >
          Annotate
        </button>
        <button
          type="button"
          onClick={() => setTool("caliper")}
          className={cn(chip, tool === "caliper" ? "bg-accent text-accent-fg" : "bg-bg text-muted")}
        >
          Caliper
        </button>
      </Group>
      <label className="ml-auto flex items-center gap-1.5 text-[0.6875rem] text-muted">
        Annotations
        <input
          type="checkbox"
          checked={showAnnotations}
          onChange={(e) => setShowAnnotations(e.target.checked)}
          className="size-3.5 accent-accent"
        />
      </label>
      <label className="flex items-center gap-1.5 text-[0.6875rem] text-muted">
        Neg up
        <input
          type="checkbox"
          checked={negativeUp}
          onChange={(e) => setNegativeUp(e.target.checked)}
          className="size-3.5 accent-accent"
        />
      </label>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[0.625rem] font-medium uppercase tracking-wider text-subtle">{label}</span>
      {children}
    </div>
  );
}
