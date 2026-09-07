"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Download, Play, Redo2, Trash2, Undo2, Upload, XCircle } from "lucide-react";
import { ANNOTATION_TYPES, MORPH_COLOR } from "@/lib/eeg/defaults";
import {
  AnnotationImportError,
  annotationSourceLabel,
  annotationTrackIds,
  parseAnnotationsJson,
  snapAnnotationTime,
} from "@/lib/eeg/annotations";
import { MORPH_HELP } from "@/lib/eeg/patterns";
import type { Annotation, MorphologyType } from "@/lib/eeg/types";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEegStore } from "@/store/eeg-store";
import type { UnifiedAbnormalityFinding } from "@/lib/eeg/abnormality/types";

const DEFAULT_DURATION = 1;
type EditorDraft = Pick<Annotation, "start" | "end" | "trackId" | "trackIds" | "type" | "text">;

function draftFor(annotation: Annotation): EditorDraft {
  return {
    start: annotation.start,
    end: annotation.end,
    trackId: annotation.trackId,
    trackIds: annotation.trackIds ? [...annotation.trackIds] : undefined,
    type: annotation.type,
    text: annotation.text,
  };
}

function NumberField({
  id,
  label,
  value,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <label
      className="grid min-w-0 gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle"
      htmlFor={id}
    >
      {label}
      <input
        id={id}
        type="number"
        min="0"
        max={max}
        step="0.01"
        value={snapAnnotationTime(value)}
        onChange={(event) => onChange(snapAnnotationTime(event.currentTarget.valueAsNumber))}
        className="h-8 min-w-0 rounded-sm border border-border bg-bg px-2 font-mono text-xs tabular-nums text-fg outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}

export function EventList() {
  const annotations = useEegStore((s) => s.annotations);
  const selectedId = useEegStore((s) => s.selectedAnnotation);
  const showAuto = useEegStore((s) => s.showAuto);
  const selectAnnotation = useEegStore((s) => s.selectAnnotation);
  const nextAnnotation = useEegStore((s) => s.nextAnnotation);
  const addAnnotation = useEegStore((s) => s.addAnnotation);
  const updateAnnotation = useEegStore((s) => s.updateAnnotation);
  const removeAnnotation = useEegStore((s) => s.removeAnnotation);
  const undoAnnotations = useEegStore((s) => s.undoAnnotations);
  const redoAnnotations = useEegStore((s) => s.redoAnnotations);
  const importAnnotations = useEegStore((s) => s.importAnnotations);
  const annotationPast = useEegStore((s) => s.annotationPast);
  const annotationFuture = useEegStore((s) => s.annotationFuture);
  const pendingType = useEegStore((s) => s.pendingType);
  const setPendingType = useEegStore((s) => s.setPendingType);
  const setTool = useEegStore((s) => s.setTool);
  const exportAnnotations = useEegStore((s) => s.exportAnnotations);
  const segment = useEegStore((s) => s.segment);
  const playheadEeg = useEegStore((s) => s.playheadEeg);

  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | Annotation["source"]>("all");
  const [newType, setNewType] = useState<MorphologyType>(pendingType);
  const [newText, setNewText] = useState("");
  const [newStart, setNewStart] = useState(() => snapAnnotationTime(playheadEeg));
  const [newDuration, setNewDuration] = useState(DEFAULT_DURATION);
  const [newTrackId, setNewTrackId] = useState("");
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = annotations.find((annotation) => annotation.id === selectedId) ?? null;
  const tracks = segment?.tracks ?? [];
  const duration = segment?.duration ?? 0;
  const isEditable = selected?.source === "user";
  const trackLabels = new Map(tracks.map((track) => [track.id, track.label]));
  const hasNavigableAnnotations = annotations.some(
    (annotation) => annotation.source !== "auto" || (showAuto && annotation.type !== "qrs"),
  );

  function channelsFor(annotation: Annotation): string {
    const ids = annotationTrackIds(annotation) ?? [];
    if (ids.length === 0) return "All channels";
    return ids.map((id) => trackLabels.get(id) ?? id).join(", ");
  }

  useEffect(() => setNewType(pendingType), [pendingType]);
  useEffect(() => setDraft(selected ? draftFor(selected) : null), [selected]);

  const visible = annotations
    .filter((annotation) => annotation.source !== "auto" || (showAuto && annotation.type !== "qrs"))
    .filter((annotation) => sourceFilter === "all" || annotation.source === sourceFilter)
    .filter((annotation) =>
      `${annotation.type} ${annotation.text} ${annotation.trackId ?? ""} ${annotation.trackIds?.join(" ") ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));

  function submitNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!segment) return;
    const start = snapAnnotationTime(
      Number.isFinite(newStart) ? Math.max(0, Math.min(newStart, duration)) : playheadEeg,
    );
    const end = snapAnnotationTime(
      Math.min(duration, start + Math.max(0, Number.isFinite(newDuration) ? newDuration : 0)),
    );
    addAnnotation({
      start,
      end,
      trackId: newTrackId || null,
      type: newType,
      text: newText.trim(),
      source: "user",
      confidence: 1,
    });
    setNewText("");
    setMessage("Marker added.");
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft || !isEditable || !segment) return;
    const start = snapAnnotationTime(Math.max(0, Math.min(draft.start, duration)));
    const end = snapAnnotationTime(Math.max(0, Math.min(draft.end, duration)));
    if (!Number.isFinite(draft.start) || !Number.isFinite(draft.end) || end < start) {
      setMessage("Use times within this recording, with end at or after start.");
      return;
    }
    updateAnnotation(selected.id, { ...draft, start, end, text: draft.text.trim() });
    setMessage("Marker updated.");
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !segment) return;
    try {
      const imported = parseAnnotationsJson(await file.text(), {
        duration,
        trackIds: tracks.map((track) => track.id),
        source: "file",
      });
      importAnnotations(imported);
      setMessage(`${imported.length} file suggestion${imported.length === 1 ? "" : "s"} imported.`);
    } catch (error) {
      setMessage(
        error instanceof AnnotationImportError
          ? error.message
          : "Could not read that annotation file.",
      );
    }
  }

  return (
    <section className="space-y-3" aria-label="Annotations">
      <div className="flex items-end justify-between gap-3 rounded-md border border-border bg-bg px-3 py-2">
        <div>
          <p className="text-sm font-medium text-fg">Review markers</p>
          <p className="text-[0.6875rem] text-subtle">Jump between events or add one at the cursor</p>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted">{visible.length}/{annotations.length}</span>
      </div>
      <p className="text-pretty text-xs leading-5 text-muted">
        Suggested waveforms are educational markers, not a diagnosis. Add a marker at the cursor or
        press A and click the tracing.
      </p>
      <MachineFindingPanel />
      <div className="flex flex-wrap gap-1" aria-label="Annotation tool">
        {ANNOTATION_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              setPendingType(type.id);
              setNewType(type.id);
              setTool("annotate");
            }}
            className={`h-8 rounded-sm px-2 text-[0.625rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${pendingType === type.id ? "text-bg" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
            style={{
              background: pendingType === type.id ? MORPH_COLOR[type.id] : undefined,
            }}
          >
            {type.label}
          </button>
        ))}
      </div>

      <form
        className="grid grid-cols-2 gap-2 rounded-md border border-border bg-surface p-2"
        onSubmit={submitNew}
      >
        <p className="col-span-2 text-xs font-medium text-fg">Add marker</p>
        <div className="grid gap-1">
          <NumberField
            id="annotation-start"
            label="Time"
            value={newStart}
            max={duration}
            onChange={setNewStart}
          />
          <button
            type="button"
            onClick={() => setNewStart(snapAnnotationTime(playheadEeg))}
            className="text-left text-[0.625rem] text-muted underline decoration-border underline-offset-2 hover:text-fg"
          >
            Use cursor ({formatTime(snapAnnotationTime(playheadEeg))})
          </button>
        </div>
        <NumberField
          id="annotation-duration"
          label="Duration"
          value={newDuration}
          max={duration}
          onChange={setNewDuration}
        />
        <label
          className="grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle"
          htmlFor="annotation-type"
        >
          Type
          <select
            id="annotation-type"
            value={newType}
            onChange={(event) => setNewType(event.currentTarget.value as MorphologyType)}
            className="h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent"
          >
            {ANNOTATION_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label
          className="grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle"
          htmlFor="annotation-channel"
        >
          Channel
          <select
            id="annotation-channel"
            value={newTrackId}
            onChange={(event) => setNewTrackId(event.currentTarget.value)}
            className="h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent"
          >
            <option value="">All channels</option>
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.label}
              </option>
            ))}
          </select>
        </label>
        <label
          className="col-span-2 grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle"
          htmlFor="annotation-note"
        >
          Note
          <input
            id="annotation-note"
            maxLength={2000}
            value={newText}
            onChange={(event) => setNewText(event.currentTarget.value)}
            placeholder="Optional observation"
            className="h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none placeholder:text-subtle focus:border-accent"
          />
        </label>
        <Button className="col-span-2" size="sm" type="submit" disabled={!segment}>
          Add at {formatTime(Math.max(0, newStart || 0))}
        </Button>
      </form>

      <div className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-border bg-surface p-2">
        <label className="sr-only" htmlFor="annotation-search">
          Search markers
        </label>
        <input
          id="annotation-search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search marker notes"
          className="h-8 min-w-0 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none placeholder:text-subtle focus:border-accent"
        />
        <label className="sr-only" htmlFor="annotation-source">
          Filter marker source
        </label>
        <div className="flex min-w-0 gap-1">
          <select
            id="annotation-source"
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.currentTarget.value as typeof sourceFilter)}
            className="h-8 min-w-0 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent"
          >
            <option value="all">All sources</option>
            <option value="user">Mine</option>
            <option value="file">File</option>
            <option value="auto">Candidates</option>
          </select>
          <Button
            size="iconSm"
            variant="ghost"
            type="button"
            onClick={() => nextAnnotation(-1)}
            disabled={!hasNavigableAnnotations}
            aria-label="Previous event"
            title="Previous event (P)"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            size="iconSm"
            variant="ghost"
            type="button"
            onClick={() => nextAnnotation(1)}
            disabled={!hasNavigableAnnotations}
            aria-label="Next event"
            title="Next event (N)"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <ul className="max-h-64 space-y-1 overflow-auto pr-0.5" aria-label="Review markers">
        {visible.length === 0 && (
          <li className="rounded-sm border border-dashed border-border p-2 text-xs text-subtle">
            No matching markers.
          </li>
        )}
        {visible.map((annotation) => (
          <li key={annotation.id}>
            <button
              type="button"
              onClick={() => selectAnnotation(annotation.id)}
              className={`flex min-h-10 w-full items-center gap-2 rounded-md border border-border/70 border-l-2 px-2.5 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${selectedId === annotation.id ? "border-accent bg-surface-2" : annotation.source === "auto" ? "border-warn/40 border-l-warn/70 border-dashed hover:bg-bg" : "border-transparent hover:border-border hover:bg-bg"}`}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: MORPH_COLOR[annotation.type] }}
              />
              <span className="w-12 shrink-0 font-mono tabular-nums text-muted">
                {formatTime(annotation.start)}
              </span>
              <span className="min-w-0 flex-1 truncate text-fg" title={channelsFor(annotation)}>
                <span className="font-medium">
                  {annotation.source === "auto" && annotation.type === "spike"
                    ? "Spike-like candidate"
                    : annotation.source === "auto" && annotation.type === "sharp"
                      ? "Sharp-wave-like candidate"
                      : ANNOTATION_TYPES.find((type) => type.id === annotation.type)?.label ??
                        annotation.type}
                </span>
                <span className="text-muted"> · {channelsFor(annotation)}</span>
                {annotation.text ? ` · ${annotation.text}` : ""}
              </span>
              <span className="shrink-0 font-mono text-[0.625rem] tabular-nums text-subtle">
                {formatTime(Math.max(0, annotation.end - annotation.start), true)}
              </span>
              <span
                className="shrink-0 text-[0.5625rem] uppercase text-subtle"
                title={annotationSourceLabel(annotation.source)}
              >
                {annotation.source === "auto"
                  ? "candidate"
                  : annotation.source === "file"
                    ? "file"
                    : "mine"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && draft && (
        <form
          className="space-y-2 rounded-md border border-border bg-surface p-2"
          onSubmit={saveDraft}
          aria-label="Selected marker"
          aria-live="polite"
          data-selected-event={selected.id}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-fg">
              Selected · {annotationSourceLabel(selected.source)}
            </p>
            {selected.source === "file" && (
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => addAnnotation({ ...draft, source: "user", confidence: 1 })}
              >
                Copy as mine
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-sm border border-border/60 bg-bg px-2 py-1.5 text-[0.625rem]">
            <span className="text-subtle">Time</span>
            <span className="font-mono text-right tabular-nums text-fg">
              {formatTime(selected.start, true)}–{formatTime(selected.end, true)}
            </span>
            <span className="text-subtle">Duration</span>
            <span className="font-mono text-right tabular-nums text-fg">
              {formatTime(Math.max(0, selected.end - selected.start), true)}
            </span>
            <span className="text-subtle">Channels</span>
            <span className="truncate text-right text-fg" title={channelsFor(selected)}>
              {channelsFor(selected)}
            </span>
            {selected.source === "auto" && (
              <>
                <span className="text-subtle">Rule score</span>
                <span className="font-mono text-right tabular-nums text-fg">
                  {Math.round(selected.confidence * 100)} / 90
                </span>
              </>
            )}
          </div>
          <p className="text-[0.6875rem] leading-4 text-muted">
            {MORPH_HELP[selected.type]}{" "}
            {selected.source === "auto" &&
              "Rule-based review cue only. It has not been validated to identify abnormalities and requires expert visual review."}
          </p>
          {isEditable ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  id="selected-start"
                  label="Start"
                  value={draft.start}
                  max={duration}
                  onChange={(start) => setDraft({ ...draft, start })}
                />
                <NumberField
                  id="selected-end"
                  label="End"
                  value={draft.end}
                  max={duration}
                  onChange={(end) => setDraft({ ...draft, end })}
                />
              </div>
              {draft.trackIds && draft.trackIds.length > 1 ? (
                <div className="grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle">
                  Channels
                  <p className="rounded-sm border border-border bg-bg px-2 py-1.5 text-xs font-normal normal-case text-fg">
                    {channelsFor({ ...selected, trackIds: draft.trackIds })}
                  </p>
                </div>
              ) : (
                <label
                  className="grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle"
                  htmlFor="selected-channel"
                >
                  Channel
                  <select
                    id="selected-channel"
                    value={draft.trackId ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        trackId: event.currentTarget.value || null,
                        trackIds: undefined,
                      })
                    }
                    className="h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent"
                  >
                    <option value="">All channels</option>
                    {tracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label
                className="grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle"
                htmlFor="selected-type"
              >
                Type
                <select
                  id="selected-type"
                  value={draft.type}
                  onChange={(event) =>
                    setDraft({ ...draft, type: event.currentTarget.value as MorphologyType })
                  }
                  className="h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent"
                >
                  {ANNOTATION_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="grid gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-subtle"
                htmlFor="selected-note"
              >
                Note
                <input
                  id="selected-note"
                  maxLength={2000}
                  value={draft.text}
                  onChange={(event) => setDraft({ ...draft, text: event.currentTarget.value })}
                  className="h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent"
                />
              </label>
              <div className="flex gap-1">
                <Button size="sm" type="submit">
                  Save changes
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  type="button"
                  onClick={() => removeAnnotation(selected.id)}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs leading-5 text-muted">
              Suggestions from EEG analysis and imported files are preserved. Copy a file suggestion
              to make an editable personal marker.
            </p>
          )}
        </form>
      )}
      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant="secondary"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!segment}
        >
          <Upload aria-hidden="true" />
          Import JSON
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={importFile}
          className="sr-only"
        />
        <Button
          size="sm"
          variant="secondary"
          type="button"
          onClick={exportAnnotations}
          disabled={!annotations.length}
        >
          <Download aria-hidden="true" />
          Export JSON
        </Button>
        <Button
          size="iconSm"
          variant="ghost"
          type="button"
          onClick={undoAnnotations}
          disabled={!annotationPast.length}
          aria-label="Undo annotation change"
        >
          <Undo2 aria-hidden="true" />
        </Button>
        <Button
          size="iconSm"
          variant="ghost"
          type="button"
          onClick={redoAnnotations}
          disabled={!annotationFuture.length}
          aria-label="Redo annotation change"
        >
          <Redo2 aria-hidden="true" />
        </Button>
      </div>
      {message && (
        <p className="text-xs text-muted" role="status">
          {message}
        </p>
      )}
      {segment && (
        <p className="text-[0.625rem] text-subtle">
          {visible.length} visible marker{visible.length === 1 ? "" : "s"} in this recording.
        </p>
      )}
    </section>
  );
}

function MachineFindingPanel() {
  const findings = useEegStore((s) => s.machineFindings);
  const status = useEegStore((s) => s.findingRunStatus);
  const progress = useEegStore((s) => s.findingProgress);
  const error = useEegStore((s) => s.findingError);
  const models = useEegStore((s) => s.findingModels);
  const enabled = useEegStore((s) => s.enabledFindingDetectorIds);
  const filters = useEegStore((s) => s.findingFilters);
  const showRejected = useEegStore((s) => s.showRejectedFindings);
  const selectedId = useEegStore((s) => s.selectedFindingId);
  const run = useEegStore((s) => s.runFindingAnalysis);
  const cancel = useEegStore((s) => s.cancelFindingAnalysis);
  const setFilters = useEegStore((s) => s.setFindingFilters);
  const setShowRejected = useEegStore((s) => s.setShowRejectedFindings);
  const select = useEegStore((s) => s.setSelectedFinding);
  const toggleDetector = useEegStore((s) => s.toggleFindingDetector);
  const accept = useEegStore((s) => s.acceptFinding);
  const reject = useEegStore((s) => s.rejectFinding);
  const convert = useEegStore((s) => s.convertFindingToAnnotation);
  const recording = useEegStore((s) => s.recording);

  const visible = findings
    .filter((finding) => showRejected || finding.reviewStatus !== "dismissed")
    .filter((finding) => {
      if (filters.type !== "all" && finding.type !== filters.type) return false;
      if (filters.detector !== "all" && finding.detector.name !== filters.detector) return false;
      if (filters.laterality !== "all" && finding.laterality !== filters.laterality) return false;
      if (filters.confidence !== "all") {
        const threshold = filters.confidence === "high" ? 0.8 : filters.confidence === "medium" ? 0.5 : 0.25;
        if (finding.confidence < threshold) return false;
      }
      if (filters.electrode !== "all") {
        const electrodes = [...finding.electrodeProbabilities.map((item) => item.electrode), ...finding.candidateElectrodes.map((item) => item.electrode), ...finding.displayedDerivations.flatMap((item) => item.electrodes)];
        if (!electrodes.includes(filters.electrode)) return false;
      }
      return true;
    })
    .sort((a, b) => a.interval.start - b.interval.start || b.confidence - a.confidence);
  const types = [...new Set(findings.map((finding) => finding.type))];
  const electrodes = [...new Set(findings.flatMap((finding) => [...finding.electrodeProbabilities.map((item) => item.electrode), ...finding.candidateElectrodes.map((item) => item.electrode)]))].sort();
  const detectors = [...new Set(findings.map((finding) => finding.detector.name))];
  const active = status === "loading" || status === "running";

  return (
    <section className="space-y-2 rounded-md border border-border bg-bg p-2" aria-label="Machine findings">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-fg">Machine findings</p>
          <p className="text-[0.625rem] leading-4 text-subtle">Local suggestions kept separate from clinician annotations.</p>
        </div>
        {active ? (
          <Button size="sm" variant="danger" type="button" onClick={cancel}>
            <XCircle aria-hidden="true" /> Cancel
          </Button>
        ) : (
          <Button size="sm" type="button" onClick={() => void run()} disabled={!recording || enabled.length === 0}>
            <Play aria-hidden="true" /> Run local screen
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1" aria-label="Enabled detectors">
        {models.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => toggleDetector(model.id)}
            className={`rounded-full border px-2 py-1 text-[0.625rem] ${enabled.includes(model.id) ? "border-accent bg-accent/15 text-fg" : "border-border text-subtle"}`}
            aria-pressed={enabled.includes(model.id)}
            title={`${model.classification} · ${model.version}`}
          >
            {model.displayName}
          </button>
        ))}
      </div>
      {progress && (active || status === "complete") && (
        <div className="space-y-1" aria-live="polite">
          <div className="flex justify-between text-[0.625rem] text-muted"><span>{progress.message ?? progress.phase}</span><span className="font-mono">{progress.total ? Math.round((progress.completed / progress.total) * 100) : 0}%</span></div>
          <div className="h-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-accent transition-all" style={{ width: `${Math.min(100, Math.max(0, progress.total ? (progress.completed / progress.total) * 100 : 0))}%` }} /></div>
        </div>
      )}
      {status === "model-not-installed" && <p className="rounded-sm border border-warn/40 bg-warn/10 p-2 text-[0.6875rem] leading-4 text-warn">{error ?? "Selected model is not installed."}</p>}
      {status === "error" && error && <p className="text-[0.6875rem] leading-4 text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-1">
        <select aria-label="Finding type filter" value={filters.type} onChange={(event) => setFilters({ type: event.currentTarget.value })} className="h-7 rounded-sm border border-border bg-surface px-1 text-[0.625rem] text-fg">
          <option value="all">All types</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select aria-label="Finding confidence filter" value={filters.confidence} onChange={(event) => setFilters({ confidence: event.currentTarget.value as typeof filters.confidence })} className="h-7 rounded-sm border border-border bg-surface px-1 text-[0.625rem] text-fg">
          <option value="all">Any confidence</option><option value="high">High ≥80%</option><option value="medium">Medium ≥50%</option><option value="low">Low ≥25%</option>
        </select>
        <select aria-label="Finding electrode filter" value={filters.electrode} onChange={(event) => setFilters({ electrode: event.currentTarget.value })} className="h-7 rounded-sm border border-border bg-surface px-1 text-[0.625rem] text-fg">
          <option value="all">All electrodes</option>{electrodes.map((electrode) => <option key={electrode} value={electrode}>{electrode}</option>)}
        </select>
        <select aria-label="Finding laterality filter" value={filters.laterality} onChange={(event) => setFilters({ laterality: event.currentTarget.value as typeof filters.laterality })} className="h-7 rounded-sm border border-border bg-surface px-1 text-[0.625rem] text-fg">
          <option value="all">All sides</option><option value="left">Left</option><option value="right">Right</option><option value="midline">Midline</option><option value="unknown">Unknown</option>
        </select>
        <select aria-label="Finding detector filter" value={filters.detector} onChange={(event) => setFilters({ detector: event.currentTarget.value })} className="h-7 rounded-sm border border-border bg-surface px-1 text-[0.625rem] text-fg">
          <option value="all">All detectors</option>{detectors.map((detector) => <option key={detector} value={detector}>{detector}</option>)}
        </select>
        <label className="flex h-7 items-center gap-1 rounded-sm border border-border px-1 text-[0.625rem] text-muted"><input type="checkbox" checked={showRejected} onChange={(event) => setShowRejected(event.currentTarget.checked)} /> Show rejected</label>
      </div>
      {visible.length === 0 ? <p className="rounded-sm border border-dashed border-border p-2 text-[0.6875rem] text-subtle">{findings.length ? "No findings match these filters." : "Run the local screen to create review suggestions."}</p> : (
        <ul className="max-h-[30rem] space-y-1 overflow-auto" aria-label="Machine finding rows">
          {visible.map((finding) => <MachineFindingRow key={finding.id} finding={finding} selected={finding.id === selectedId} onSelect={() => select(finding.id)} onAccept={() => accept(finding.id)} onReject={() => reject(finding.id)} onConvert={(text) => convert(finding.id, text)} />)}
        </ul>
      )}
      <p className="text-[0.625rem] leading-4 text-subtle">Expert review only; not diagnostic. Findings and data remain local to this browser.</p>
    </section>
  );
}

function MachineFindingRow({ finding, selected, onSelect, onAccept, onReject, onConvert }: { finding: UnifiedAbnormalityFinding; selected: boolean; onSelect: () => void; onAccept: () => void; onReject: () => void; onConvert: (text?: string) => void }) {
  const electrodes = [...new Set([...finding.electrodeProbabilities.map((item) => item.electrode), ...finding.candidateElectrodes.map((item) => item.electrode)])];
  const derivations = finding.displayedDerivations.map((item) => item.label).join(", ") || "No mapped derivation";
  const editAndConvert = () => {
    const note = window.prompt("Edit the note for the clinician annotation:", finding.label);
    if (note !== null) onConvert(note.trim() || finding.label);
  };
  return <li className={`rounded-md border border-border/70 p-2 ${selected ? "border-accent bg-surface-2" : "bg-surface"}`}>
    <button type="button" onClick={onSelect} className="w-full text-left" aria-pressed={selected}>
      <div className="flex items-start justify-between gap-2"><span className="font-medium text-xs text-fg">{finding.label || finding.type}</span><span className="font-mono text-[0.625rem] tabular-nums text-accent">{(finding.confidence * 100).toFixed(0)}%</span></div>
      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[0.625rem] leading-4"><span className="text-subtle">Interval</span><span className="font-mono text-right text-fg">{formatTime(finding.interval.start, true)}–{formatTime(finding.interval.end, true)}</span><span className="text-subtle">Electrodes</span><span className="truncate text-right text-fg" title={electrodes.join(", ")}>{electrodes.join(", ") || "—"}</span><span className="text-subtle">Derivations</span><span className="truncate text-right text-fg" title={derivations}>{derivations}</span><span className="text-subtle">Spatial</span><span className="truncate text-right text-fg" title={finding.spatialDistribution}>{finding.laterality} · {finding.spatialDistribution}</span><span className="text-subtle">Class distribution</span><span className="truncate text-right text-fg" title={finding.distribution.entries.map((entry) => `${entry.label} ${(entry.probability * 100).toFixed(0)}%`).join(", ")}>{finding.distribution.entries.map((entry) => `${entry.label} ${(entry.probability * 100).toFixed(0)}%`).join(", ") || "—"}</span><span className="text-subtle">Artifact</span><span className="text-right text-fg">{finding.artifactProbability == null ? "not estimated" : `${(finding.artifactProbability * 100).toFixed(0)}%`}</span><span className="text-subtle">Detector</span><span className="truncate text-right text-fg" title={`${finding.detector.name} ${finding.detector.version}`}>{finding.detector.name} · {finding.detector.version} · {finding.detector.classification}</span></div>
    </button>
    {selected && <div className="mt-1.5 space-y-1 border-t border-border/60 pt-1.5"><p className="text-[0.625rem] leading-4 text-muted"><span className="text-subtle">Limitations:</span> {finding.limitations.join(" ") || "Not stated by detector."}</p><div className="flex flex-wrap gap-1"><Button size="sm" type="button" onClick={onAccept}>Accept</Button><Button size="sm" variant="secondary" type="button" onClick={() => onConvert()}>Convert to annotation</Button><Button size="sm" variant="secondary" type="button" onClick={editAndConvert}>Edit &amp; convert</Button><Button size="sm" variant="danger" type="button" onClick={onReject}>Reject</Button></div></div>}
  </li>;
}
