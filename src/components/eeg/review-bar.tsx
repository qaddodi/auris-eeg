"use client";

import type { ReactNode } from "react";
import { Eye, EyeOff, Lightbulb, MousePointer2, Ruler } from "lucide-react";
import { HFF_PRESETS, LFF_PRESETS, PAGE_PRESETS, SENSITIVITY_PRESETS } from "@/lib/eeg/defaults";
import type { MontageKind } from "@/lib/eeg/types";
import { cn } from "@/lib/utils";
import { useEegStore } from "@/store/eeg-store";

const selectClass =
  "h-8 max-w-32 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent";
const toolClass =
  "flex h-8 items-center gap-1 rounded-sm px-2 text-[0.6875rem] font-medium transition-colors";

export function ReviewBar() {
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
  const selectedPage = PAGE_PRESETS.reduce(
    (closest, value) =>
      Math.abs(value - viewDuration) < Math.abs(closest - viewDuration) ? value : closest,
    PAGE_PRESETS[0]!,
  );

  return (
    <div className="flex shrink-0 flex-wrap items-end gap-x-3 gap-y-2 border-b border-border bg-surface px-3 py-2">
      <Field label="Montage">
        <select
          className={selectClass}
          value={montage}
          onChange={(event) => setMontage(event.currentTarget.value as MontageKind)}
        >
          <option value="double-banana">Double banana</option>
          <option value="transverse">Transverse</option>
          <option value="original">Referential</option>
          <option value="custom">Custom</option>
        </select>
      </Field>
      <Field label="Page">
        <div className="flex items-center gap-1">
          <select
            className={selectClass}
            value={selectedPage}
            onChange={(event) => setViewDuration(Number(event.currentTarget.value))}
          >
            {PAGE_PRESETS.map((value) => (
              <option key={value} value={value}>
                {value} seconds
              </option>
            ))}
          </select>
          <button
            type="button"
            className={toolClass + " bg-bg text-muted hover:bg-surface-2 hover:text-fg"}
            onClick={() => page(-1)}
            aria-label="Previous page"
          >
            ‹
          </button>
          <button
            type="button"
            className={toolClass + " bg-bg text-muted hover:bg-surface-2 hover:text-fg"}
            onClick={() => page(1)}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </Field>
      <Field label="LFF">
        <select
          className={selectClass}
          value={filters.lff}
          onChange={(event) =>
            setFilters({ lff: Number(event.currentTarget.value), bandpass: false })
          }
        >
          {LFF_PRESETS.map((value) => (
            <option key={value} value={value}>
              {value === 0 ? "Off" : `${value} Hz`}
            </option>
          ))}
        </select>
      </Field>
      <Field label="HFF">
        <select
          className={selectClass}
          value={filters.hff}
          onChange={(event) =>
            setFilters({ hff: Number(event.currentTarget.value), bandpass: false })
          }
        >
          {HFF_PRESETS.map((value) => (
            <option key={value} value={value}>
              {value === 0 ? "Off" : `${value} Hz`}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notch">
        <select
          className={selectClass}
          value={filters.notch60 ? "on" : "off"}
          onChange={(event) => setFilters({ notch60: event.currentTarget.value === "on" })}
        >
          <option value="off">Off</option>
          <option value="on">60 Hz</option>
        </select>
      </Field>
      <Field label="Sensitivity">
        <select
          className={selectClass}
          value={sensitivity}
          onChange={(event) => setSensitivity(Number(event.currentTarget.value))}
        >
          {SENSITIVITY_PRESETS.map((value) => (
            <option key={value} value={value}>
              {value} µV
            </option>
          ))}
        </select>
      </Field>
      <div className="ml-auto flex flex-wrap items-center gap-1" aria-label="Review tools">
        <button
          type="button"
          onClick={() => setTool("pointer")}
          className={cn(
            toolClass,
            tool === "pointer"
              ? "bg-accent text-accent-fg"
              : "bg-bg text-muted hover:bg-surface-2 hover:text-fg",
          )}
          aria-pressed={tool === "pointer"}
        >
          <MousePointer2 />
          Pointer
        </button>
        <button
          type="button"
          onClick={() => setTool("annotate")}
          className={cn(
            toolClass,
            tool === "annotate"
              ? "bg-accent text-accent-fg"
              : "bg-bg text-muted hover:bg-surface-2 hover:text-fg",
          )}
          aria-pressed={tool === "annotate"}
        >
          Annotate
        </button>
        <button
          type="button"
          onClick={() => setTool("caliper")}
          className={cn(
            toolClass,
            tool === "caliper"
              ? "bg-accent text-accent-fg"
              : "bg-bg text-muted hover:bg-surface-2 hover:text-fg",
          )}
          aria-pressed={tool === "caliper"}
        >
          <Ruler />
          Caliper
        </button>
        <button
          type="button"
          onClick={() => setShowAnnotations(!showAnnotations)}
          className={cn(
            toolClass,
            showAnnotations
              ? "bg-accent text-accent-fg"
              : "bg-bg text-muted hover:bg-surface-2 hover:text-fg",
          )}
          aria-pressed={showAnnotations}
        >
          {showAnnotations ? <Eye /> : <EyeOff />}
          <span className="hidden lg:inline">Markers</span>
          <span className="font-mono text-[0.625rem]">{confirmed}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowAuto(!showAuto)}
          className={cn(
            toolClass,
            showAuto ? "bg-warn text-bg" : "bg-bg text-muted hover:bg-surface-2 hover:text-fg",
          )}
          aria-pressed={showAuto}
        >
          <Lightbulb />
          <span className="hidden lg:inline">Suggestions</span>
          <span className="font-mono text-[0.625rem]">{suggestions}</span>
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle">
      <span>{label}</span>
      {children}
    </label>
  );
}
