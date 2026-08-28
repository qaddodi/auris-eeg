"use client";

import { ANNOTATION_TYPES, MORPH_COLOR } from "@/lib/eeg/defaults";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEegStore } from "@/store/eeg-store";

export function EventList() {
  const annotations = useEegStore((s) => s.annotations);
  const selected = useEegStore((s) => s.selectedAnnotation);
  const showAuto = useEegStore((s) => s.showAuto);
  const setShowAuto = useEegStore((s) => s.setShowAuto);
  const showAnnotations = useEegStore((s) => s.showAnnotations);
  const setShowAnnotations = useEegStore((s) => s.setShowAnnotations);
  const selectAnnotation = useEegStore((s) => s.selectAnnotation);
  const removeAnnotation = useEegStore((s) => s.removeAnnotation);
  const pendingType = useEegStore((s) => s.pendingType);
  const setPendingType = useEegStore((s) => s.setPendingType);
  const setTool = useEegStore((s) => s.setTool);
  const exportAnnotations = useEegStore((s) => s.exportAnnotations);
  const segment = useEegStore((s) => s.segment);

  const visible = annotations.filter((a) => showAuto || a.source === "user" || a.source === "file");

  return (
    <div className="space-y-2">
      <p className="text-pretty text-xs text-muted">
        Suggested waveforms are educational markers, not a diagnosis. Press A or use Annotate, then
        click the tracing.
      </p>
      <div className="flex flex-wrap gap-1">
        {ANNOTATION_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setPendingType(t.id);
              setTool("annotate");
            }}
            className="h-6 rounded-sm px-1.5 text-[0.625rem]"
            style={{
              background: pendingType === t.id ? MORPH_COLOR[t.id] : "var(--color-bg, #07080a)",
              color: pendingType === t.id ? "#111" : undefined,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <label className="flex items-center justify-between text-xs text-muted">
        Show annotations
        <input
          type="checkbox"
          checked={showAnnotations}
          onChange={(e) => setShowAnnotations(e.target.checked)}
          className="size-3.5 accent-accent"
        />
      </label>
      <label className="flex items-center justify-between text-xs text-muted">
        Show suggested
        <input
          type="checkbox"
          checked={showAuto}
          onChange={(e) => setShowAuto(e.target.checked)}
          className="size-3.5 accent-accent"
        />
      </label>
      <ul className="max-h-48 space-y-0.5 overflow-auto">
        {visible.length === 0 && <li className="text-xs text-subtle">No markers yet.</li>}
        {visible.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => selectAnnotation(a.id)}
              className={`flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-left text-[0.6875rem] ${
                selected === a.id ? "bg-surface-2" : "hover:bg-bg"
              }`}
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: MORPH_COLOR[a.type] }} />
              <span className="w-12 shrink-0 font-mono tabular-nums text-muted">{formatTime(a.start)}</span>
              <span className="min-w-0 flex-1 truncate text-fg">
                {ANNOTATION_TYPES.find((t) => t.id === a.type)?.label ?? a.type}
                {a.text ? ` · ${a.text}` : ""}
              </span>
              <span className="text-[0.625rem] uppercase text-subtle">{a.source === "auto" ? "sug" : a.source}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1">
        <Button size="sm" variant="secondary" onClick={exportAnnotations} disabled={!annotations.length}>
          Export JSON
        </Button>
        {selected && (
          <Button size="sm" variant="ghost" onClick={() => removeAnnotation(selected)}>
            Delete
          </Button>
        )}
      </div>
      {segment && (
        <p className="text-[0.625rem] text-subtle">{visible.length} markers on this recording.</p>
      )}
    </div>
  );
}
