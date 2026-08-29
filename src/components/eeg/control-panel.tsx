"use client";

import { useRef } from "react";
import { ChevronDown, Headphones, SlidersHorizontal, Upload } from "lucide-react";
import {
  COMPRESSION_PRESETS,
  ROOT_NOTES,
  SENSITIVITY_PRESETS,
  TIME_SCALE_PRESETS,
  MIN_SENSITIVITY_UV,
  MAX_SENSITIVITY_UV,
} from "@/lib/eeg/defaults";
import { describeMapping } from "@/lib/eeg/sonify";
import { SCALE_LABELS } from "@/lib/eeg/musify";
import { STANDARD_ELECTRODES } from "@/lib/eeg/montages";
import { sampleRateSummary } from "@/lib/eeg/edf";
import { VIEW_PRESETS } from "@/lib/eeg/view";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MixerStrip } from "./mixer-strip";
import { EventList } from "./event-list";
import { useEegStore, currentRepro } from "@/store/eeg-store";
import type { MontageKind, ScaleName } from "@/lib/eeg/types";

const field =
  "h-8 w-full rounded-sm bg-bg px-2 text-sm text-fg shadow-border outline-none focus:ring-2 focus:ring-accent/50";

export function ControlPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
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

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void loadFile(f, f.name);
  };

  const rates = recording ? sampleRateSummary(recording.header) : null;
  const available = derivations.filter((d) => d.available);
  const missing = derivations.filter((d) => !d.available);
  const repro = currentRepro(state);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-y-auto bg-surface">
      <section className="space-y-3 p-4">
        <div>
          <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-subtle">File</p>
          <h2 className="mt-1 font-display text-lg tracking-tight text-fg">Recording</h2>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".edf,.EDF"
          className="sr-only"
          onChange={(e) => onFiles(e.target.files)}
        />
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
          className="rounded-lg bg-bg p-3 shadow-border"
        >
          <p className="text-sm text-pretty text-muted">
            Drop a deidentified EDF/EDF+ file. Nothing is uploaded.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <Upload /> Open EDF
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const res = await fetch(`${import.meta.env.BASE_URL}sample.edf`);
                if (!res.ok) return;
                const buf = await res.arrayBuffer();
                await loadFile(buf, "demo-deidentified.edf");
              }}
            >
              Load demo
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {recording && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs text-muted">
            <dt className="text-subtle">Duration</dt>
            <dd className="tabular-nums text-fg">{recording.header.duration.toFixed(1)} s</dd>
            <dt className="text-subtle">Rate</dt>
            <dd className="tabular-nums text-fg">
              {rates?.primary ?? "—"} Hz{rates?.mixed ? " mixed" : ""}
            </dd>
            <dt className="text-subtle">Signals</dt>
            <dd className="tabular-nums text-fg">{recording.header.signals.length}</dd>
            <dt className="text-subtle">Format</dt>
            <dd className="text-fg">{recording.header.isEdfPlus ? "EDF+" : "EDF"}</dd>
          </dl>
        )}
        {recording?.header.identifierWarning && (
          <p className="text-xs text-pretty text-warn">
            Header text may still contain identifiers. Patient fields are hidden here — confirm
            deidentification before sharing.
          </p>
        )}
        {recording && recording.annotations.length > 0 && (
          <p className="text-xs text-muted">
            {recording.annotations.length} annotations in file (not interpreted).
          </p>
        )}
      </section>

      <Separator />

      <section className="space-y-3 p-4">
        <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-subtle">Montage</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              ["original", "Referential"],
              ["double-banana", "Double banana"],
              ["transverse", "Transverse"],
              ["custom", "Custom"],
            ] as [MontageKind, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMontage(id)}
              className={`h-8 rounded-sm px-2 text-left text-xs ${
                montage === id
                  ? "bg-accent text-accent-fg"
                  : "bg-bg text-fg/80 shadow-border hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          {available.length} derivations ready
          {missing.length > 0 ? ` · ${missing.length} skipped (missing electrodes)` : ""}
        </p>
        {missing.length > 0 && (
          <p className="text-[0.6875rem] text-pretty text-subtle">
            Cannot form: {missing.map((m) => m.label).join(", ")}
          </p>
        )}
        {montage === "custom" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                className={field}
                value={customA}
                onChange={(e) => setCustomAB(e.target.value, customB)}
              >
                {STANDARD_ELECTRODES.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
              <select
                className={field}
                value={customB}
                onChange={(e) => setCustomAB(customA, e.target.value)}
              >
                {STANDARD_ELECTRODES.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
            <Button size="sm" variant="secondary" onClick={addCustomPair}>
              Add pair
            </Button>
            <ul className="space-y-1">
              {customPairs.map((p, i) => (
                <li
                  key={`${p[0]}-${p[1]}-${i}`}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-mono">
                    {p[0]}–{p[1]}
                  </span>
                  <button
                    type="button"
                    className="text-subtle hover:text-danger"
                    onClick={() => removeCustomPair(i)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-3 p-4">
        <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-subtle">Events</p>
        <EventList />
      </section>

      <Separator />

      <section className="space-y-3 p-4">
        <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-subtle">View</p>
        <p className="text-pretty text-xs text-muted">
          The overview is the whole recording. This window is what the editor shows — zoom and
          follow like a DAW.
        </p>
        <Label htmlFor="jump">Jump to (s)</Label>
        <input
          id="jump"
          type="number"
          min={0}
          step={1}
          defaultValue={0}
          className={field}
          onBlur={(e) => seekEeg(Number(e.target.value) || 0)}
          onKeyDown={(e) => {
            if (e.key === "Enter") seekEeg(Number((e.target as HTMLInputElement).value) || 0);
          }}
        />
        <Label>Window</Label>
        <div className="flex flex-wrap gap-1">
          {VIEW_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setViewDuration(d)}
              className={`h-7 rounded-full px-2.5 text-xs tabular-nums ${
                Math.abs(duration - d) < 0.05
                  ? "bg-accent text-accent-fg"
                  : "bg-bg text-muted shadow-border"
              }`}
            >
              {d}s
            </button>
          ))}
          {recording && (
            <button
              type="button"
              onClick={() => setViewDuration(recording.header.duration)}
              className={`h-7 rounded-full px-2.5 text-xs ${
                duration >= recording.header.duration - 0.05
                  ? "bg-accent text-accent-fg"
                  : "bg-bg text-muted shadow-border"
              }`}
            >
              All
            </button>
          )}
        </div>
        <p className="font-mono text-[0.6875rem] tabular-nums text-subtle">
          {start.toFixed(1)}–{(start + duration).toFixed(1)} s
        </p>
        <div className="flex items-center justify-between gap-2">
          <Label>Sensitivity</Label>
          <span className="font-mono text-xs tabular-nums text-muted">{sensitivityUv} µV p–p</span>
        </div>
        <p className="text-[0.6875rem] text-subtle">
          Lower µV = bigger waves. Fit sizes the page to the tracing.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-sm bg-bg text-sm text-muted shadow-border"
            onClick={() => nudgeSensitivity(-1)}
            aria-label="Increase gain"
          >
            −
          </button>
          <input
            type="range"
            min={Math.log10(MIN_SENSITIVITY_UV)}
            max={Math.log10(MAX_SENSITIVITY_UV)}
            step={0.01}
            value={Math.log10(sensitivityUv)}
            onChange={(e) => setSensitivity(10 ** Number(e.target.value))}
            className="h-7 flex-1 accent-accent"
            aria-label="Display sensitivity"
          />
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-sm bg-bg text-sm text-muted shadow-border"
            onClick={() => nudgeSensitivity(1)}
            aria-label="Decrease gain"
          >
            +
          </button>
          <Button type="button" size="sm" variant="secondary" onClick={() => fitSensitivity()}>
            Fit
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {SENSITIVITY_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSensitivity(d)}
              className={`h-7 rounded-full px-2 text-xs tabular-nums ${
                sensitivityUv === d ? "bg-accent text-accent-fg" : "bg-bg text-muted shadow-border"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between gap-2 text-sm text-fg">
          Negative up
          <input
            type="checkbox"
            checked={negativeUp}
            onChange={(e) => setNegativeUp(e.target.checked)}
            className="size-4 accent-accent"
          />
        </label>
      </section>

      <Separator />

      <section className="space-y-3 p-4">
        <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-subtle">Listen</p>
        <p className="text-pretty text-xs text-muted">
          Contour: up on the graph raises pitch. Pen: analog paper scratch — fast deflections hiss,
          still baseline is quiet. Pulse: count the rhythm. Ambient: smoothed delta–beta power
          becomes a restrained harmonic bed. Choir is the just-intonation 1/f version. Piano is a
          restrained scale voice with transient accents. Direct is the raw wave. Playback starts at
          a fixed safe level; per-track gain is in Extra tools.
        </p>
        <Label>Scale</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(SCALE_LABELS) as ScaleName[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setSonify({ scale: id })}
              className={`h-8 rounded-sm px-2 text-left text-xs ${
                sonify.scale === id ? "bg-accent text-accent-fg" : "bg-bg text-muted shadow-border"
              }`}
            >
              {SCALE_LABELS[id]}
            </button>
          ))}
        </div>
        <Label>Root</Label>
        <div className="flex flex-wrap gap-1">
          {ROOT_NOTES.map((n) => (
            <button
              key={n.midi}
              type="button"
              onClick={() => setSonify({ rootMidi: n.midi })}
              className={`h-7 rounded-full px-2.5 text-xs ${
                sonify.rootMidi === n.midi
                  ? "bg-accent text-accent-fg"
                  : "bg-bg text-muted shadow-border"
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between text-sm">
          Snap to scale
          <input
            type="checkbox"
            checked={sonify.quantize}
            onChange={(e) => setSonify({ quantize: e.target.checked })}
            className="size-4 accent-accent"
          />
        </label>
        <Label>Pitch range ±{sonify.rangeSemitones} st</Label>
        <input
          type="range"
          min={4}
          max={12}
          step={1}
          value={sonify.rangeSemitones}
          onChange={(e) => setSonify({ rangeSemitones: Number(e.target.value) })}
          className="w-full accent-accent"
        />
        {sonify.mode === "direct" ? (
          <>
            <Label>Time compression</Label>
            <div className="flex flex-wrap gap-1">
              {COMPRESSION_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSonify({ compression: c })}
                  className={`h-7 rounded-full px-2.5 text-xs tabular-nums ${
                    sonify.compression === c
                      ? "bg-accent text-accent-fg"
                      : "bg-bg text-muted shadow-border"
                  }`}
                >
                  {c}×
                </button>
              ))}
            </div>
            <p className="text-[0.6875rem] text-pretty text-subtle">
              {describeMapping(sonify.compression)}
            </p>
          </>
        ) : (
          <>
            <Label>Time {sonify.timeScale}×</Label>
            <div className="flex flex-wrap gap-1">
              {TIME_SCALE_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSonify({ timeScale: c })}
                  className={`h-7 rounded-full px-2.5 text-xs tabular-nums ${
                    sonify.timeScale === c
                      ? "bg-accent text-accent-fg"
                      : "bg-bg text-muted shadow-border"
                  }`}
                >
                  {c}×
                </button>
              ))}
            </div>
            <p className="text-[0.6875rem] text-pretty text-subtle">
              1× is clinical time. Solo one chain to hear a single contour clearly.
            </p>
          </>
        )}
      </section>

      <Separator />

      <section className="space-y-3 p-4">
        <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-subtle">Filters</p>
        <p className="text-xs text-pretty text-muted">
          LFF / HFF / Notch live on the review bar (Natus-style). DC is removed by default.
        </p>
        <label className="flex items-center justify-between text-sm">
          Remove DC
          <input
            type="checkbox"
            checked={filters.removeDc}
            onChange={(e) => setFilters({ removeDc: e.target.checked })}
            className="size-4 accent-accent"
          />
        </label>
      </section>

      <Separator />

      <section className="p-4">
        <details className="group overflow-hidden rounded-md bg-bg shadow-border">
          <summary className="flex min-h-11 list-none items-center gap-2 px-3 py-2 text-left [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="size-4 text-accent" aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-sm font-medium text-fg">Extra tools</span>
              <span className="block text-[0.6875rem] text-subtle">
                Mixer, channel gain, and scrub audio
              </span>
            </span>
            <ChevronDown
              className="size-4 text-subtle transition-transform duration-150 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="space-y-4 border-t border-border px-3 py-3">
            <div className="space-y-2">
              <div>
                <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-subtle">
                  Mixer
                </p>
                <p className="mt-1 text-pretty text-xs text-muted">
                  S = solo, M = mute. Double-click S for an exclusive solo. Track gains stay live
                  during playback.
                </p>
              </div>
              <MixerStrip />
            </div>
            <div className="border-t border-border pt-3">
              <label className="flex min-h-11 items-center gap-3 text-sm text-fg">
                <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-surface-2 text-accent">
                  <Headphones className="size-4" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block font-medium">Audible scrubbing</span>
                  <span className="block text-[0.6875rem] text-subtle">
                    Hear a short preview while dragging the tracing
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={audibleScrub}
                  onChange={(e) => setAudibleScrub(e.target.checked)}
                  className="size-4 accent-accent"
                  aria-label="Enable audible scrubbing"
                />
              </label>
            </div>
          </div>
        </details>
      </section>

      <Separator />

      <section className="space-y-2 p-4">
        <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-subtle">
          Reproducibility
        </p>
        {repro ? (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-bg p-3 font-mono text-[0.6875rem] leading-relaxed text-muted">
            {formatRepro(repro)}
          </pre>
        ) : (
          <p className="text-xs text-subtle">Load a recording to capture settings.</p>
        )}
        {status === "ready" && <Badge tone="accent">Local only</Badge>}
      </section>
    </aside>
  );
}

function formatRepro(r: NonNullable<ReturnType<typeof currentRepro>>): string {
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
    `stereo: ${r.stereo}`,
  ].join("\n");
}
