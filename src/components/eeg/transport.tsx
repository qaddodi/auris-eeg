"use client";

import { useEffect, useRef } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  Eye,
  EyeOff,
  Eraser,
  Filter,
  GitBranch,
  Hand,
  Info,
  Keyboard,
  Layers,
  Lightbulb,
  Lock,
  PanelLeft,
  Pause,
  PencilLine,
  Play,
  Repeat,
  Ruler,
  Scan,
  Square,
  Upload,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VIEW_PRESETS } from "@/lib/eeg/view";
import { HFF_PRESETS, LFF_PRESETS, SENSITIVITY_PRESETS } from "@/lib/eeg/defaults";
import type { MontageKind } from "@/lib/eeg/types";
import { formatTime } from "@/lib/utils";
import { eegNow, useEegStore } from "@/store/eeg-store";
import { nextThemeMode, type ThemeMode } from "./theme";

interface TransportProps {
  onOpenFile: () => void;
  onTogglePanel: () => void;
  onToggleFocus: () => void;
  onToggleFullscreen: () => void;
  onAbout: () => void;
  themeMode: ThemeMode;
  onCycleTheme: () => void;
}

const selectClass =
  "h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent";
const actionClass = "shrink-0";
const toolClass = "shrink-0";

/** The single persistent workstation command bar. Keep this row scrollable: controls should never disappear or wrap. */
export function Transport({
  onOpenFile,
  onTogglePanel,
  onToggleFocus,
  onToggleFullscreen,
  onAbout,
  themeMode,
  onCycleTheme,
}: TransportProps) {
  const playing = useEegStore((s) => s.playing);
  const loop = useEegStore((s) => s.loop);
  const follow = useEegStore((s) => s.followPlayhead);
  const segment = useEegStore((s) => s.segment);
  const togglePlay = useEegStore((s) => s.togglePlay);
  const stop = useEegStore((s) => s.stop);
  const setLoop = useEegStore((s) => s.setLoop);
  const zoomAt = useEegStore((s) => s.zoomAt);
  const zoomLocked = useEegStore((s) => s.zoomLocked);
  const setZoomLocked = useEegStore((s) => s.setZoomLocked);
  const setViewDuration = useEegStore((s) => s.setViewDuration);
  const setFollow = useEegStore((s) => s.setFollow);
  const setKeysOpen = useEegStore((s) => s.setKeysOpen);
  const viewDuration = useEegStore((s) => s.viewDuration);
  const page = useEegStore((s) => s.page);
  const montage = useEegStore((s) => s.montage);
  const setMontage = useEegStore((s) => s.setMontage);
  const filters = useEegStore((s) => s.filters);
  const setFilters = useEegStore((s) => s.setFilters);
  const sensitivity = useEegStore((s) => s.sensitivityUv);
  const setSensitivity = useEegStore((s) => s.setSensitivity);
  const tool = useEegStore((s) => s.tool);
  const setTool = useEegStore((s) => s.setTool);
  const showAnnotations = useEegStore((s) => s.showAnnotations);
  const setShowAnnotations = useEegStore((s) => s.setShowAnnotations);
  const annotations = useEegStore((s) => s.annotations);
  const showAuto = useEegStore((s) => s.showAuto);
  const screeningBusy = useEegStore((s) => s.screeningBusy);
  const setShowAuto = useEegStore((s) => s.setShowAuto);
  const showDsa = useEegStore((s) => s.showDsa);
  const setShowDsa = useEegStore((s) => s.setShowDsa);
  const showDsaBands = useEegStore((s) => s.showDsaBands);
  const setShowDsaBands = useEegStore((s) => s.setShowDsaBands);
  const soundMode = useEegStore((s) => s.soundMode);
  const setSoundMode = useEegStore((s) => s.setSoundMode);
  const download = useEegStore((s) => s.download);
  const evidencePreparation = useEegStore((s) => s.evidencePreparation);
  const evidenceReason = useEegStore((s) => s.evidenceReason);
  const playheadEeg = useEegStore((s) => s.playheadEeg);
  const eegRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = () => {
      const state = useEegStore.getState();
      const time = state.playing ? eegNow(state) : state.playheadEeg;
      if (eegRef.current) eegRef.current.textContent = formatTime(time, true);
    };
    update();
    if (!playing) return;
    let raf = 0;
    const loopFrame = () => {
      update();
      raf = requestAnimationFrame(loopFrame);
    };
    raf = requestAnimationFrame(loopFrame);
    return () => cancelAnimationFrame(raf);
  }, [playing, playheadEeg]);

  const total = segment?.duration ?? 0;
  const selectedDuration = total > 0 && viewDuration >= total - 1e-6 ? "all" : String(viewDuration);
  const isPreset = VIEW_PRESETS.some((duration) => Math.abs(duration - viewDuration) < 1e-6);
  const soundActive = soundMode === "experimental" || soundMode === "musical" ||
    ((soundMode === "evidence" || soundMode === "hybrid") && Boolean(evidencePreparation));
  const confirmed = annotations.filter((a) => a.source !== "auto").length;
  const suggestions = annotations.filter((a) => a.source === "auto" && a.type !== "qrs").length;
  const nextMode = nextThemeMode(themeMode);
  const themeLabel = themeMode[0]!.toUpperCase() + themeMode.slice(1);
  const nextModeLabel = nextMode[0]!.toUpperCase() + nextMode.slice(1);

  return (
    <div className="transport-bar flex h-12 shrink-0 min-w-0 items-center overflow-x-auto overflow-y-hidden border-b border-border bg-surface px-2 [scrollbar-width:thin] sm:px-3">
      <div className="flex min-w-max items-center gap-1.5" aria-label="EEG workstation toolbar">
        <div className="flex items-center gap-1" aria-label="Workspace">
          <Button size="iconSm" variant="ghost" aria-label="Toggle review controls" title="Toggle review controls" onClick={onTogglePanel}>
            <PanelLeft aria-hidden="true" />
          </Button>
          <span className="px-1 font-display text-sm font-semibold tracking-tight">Auris</span>
          <Button size="sm" variant="secondary" onClick={onOpenFile} title="Open EDF recording" aria-label="Open EDF recording">
            <Upload aria-hidden="true" /><span>Open EDF</span>
          </Button>
        </div>

        <Divider />

        <div className="flex items-center gap-1" aria-label="Playback">
          <Button size="iconSm" variant="secondary" className={actionClass} aria-label={playing ? "Pause playback" : "Play playback"} title={playing ? "Pause playback" : "Play playback"} onClick={() => void togglePlay()} disabled={!segment}>
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" className="ml-px" />}
          </Button>
          <Button size="iconSm" variant="ghost" className={actionClass} aria-label="Stop playback" title="Stop playback" onClick={stop}>
            <Square aria-hidden="true" />
          </Button>
          <Button size="iconSm" variant={loop ? "default" : "ghost"} className={actionClass} aria-label={loop ? "Disable loop playback" : "Loop playback"} aria-pressed={loop} title={loop ? "Loop on" : "Loop off"} onClick={() => setLoop(!loop)}>
            <Repeat aria-hidden="true" />
          </Button>
          <Button size="iconSm" variant={follow ? "default" : "ghost"} className={actionClass} aria-label={follow ? "Stop following playhead" : "Follow playhead"} aria-pressed={follow} title={follow ? "Following playhead" : "Follow playhead"} onClick={() => setFollow(!follow)}>
            <Scan aria-hidden="true" />
          </Button>
        </div>

        <Divider />

        <div className="flex items-center gap-1" aria-label="Navigation and view">
          <Button size="iconSm" variant="ghost" className={actionClass} aria-label="Previous page" title="Previous page" onClick={() => page(-1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button size="iconSm" variant="ghost" className={actionClass} aria-label="Next page" title="Next page" onClick={() => page(1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-border bg-bg px-2 text-[0.625rem] font-semibold uppercase tracking-wide text-muted" title="Visible EEG window">
            <span>Window</span>
            <select className="h-7 w-[4.25rem] bg-transparent text-xs font-normal normal-case tracking-normal text-fg outline-none" aria-label="Visible time window" value={selectedDuration} onChange={(event) => setViewDuration(event.currentTarget.value === "all" ? total : Number(event.currentTarget.value))}>
              {!isPreset && selectedDuration !== "all" && <option value={selectedDuration}>{viewDuration.toFixed(1)}s</option>}
              {VIEW_PRESETS.map((duration) => <option key={duration} value={duration}>{duration}s</option>)}
              <option value="all">All</option>
            </select>
          </label>
          <Button size="iconSm" variant="ghost" className={actionClass} aria-label="Zoom out" title="Zoom out" onClick={() => zoomAt(1.25)}>
            <ZoomOut aria-hidden="true" />
          </Button>
          <Button size="iconSm" variant="ghost" className={actionClass} aria-label="Zoom in" title="Zoom in" onClick={() => zoomAt(1 / 1.25)}>
            <ZoomIn aria-hidden="true" />
          </Button>
          <Button size="iconSm" variant={zoomLocked ? "default" : "ghost"} className={actionClass} aria-label={zoomLocked ? "Unlock zoom gestures" : "Lock zoom gestures"} aria-pressed={zoomLocked} title={zoomLocked ? "Zoom gestures locked (scroll pans)" : "Zoom gestures unlocked (scroll zooms)"} onClick={() => setZoomLocked(!zoomLocked)}>
            <Lock aria-hidden="true" />
          </Button>
        </div>

        <Divider />

        <div className="flex items-center gap-1" aria-label="Signal setup">
          <select className={`${selectClass} w-[7.25rem]`} aria-label="Montage" title="Montage" value={montage} onChange={(event) => setMontage(event.currentTarget.value as MontageKind)}>
            <option value="double-banana">Double banana</option>
            <option value="transverse">Transverse</option>
            <option value="original">Referential</option>
            <option value="custom">Custom</option>
          </select>
          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-border bg-bg px-2 text-[0.625rem] font-semibold uppercase tracking-wide text-muted" title="Low-frequency filter">
            <span>LFF</span>
            <select className="h-7 w-[4.25rem] bg-transparent text-xs font-normal normal-case tracking-normal text-fg outline-none" aria-label="Low-frequency filter" value={filters.lff} onChange={(event) => setFilters({ lff: Number(event.currentTarget.value), bandpass: false })}>
              {LFF_PRESETS.map((value) => <option key={value} value={value}>{value === 0 ? "Off" : `${value} Hz`}</option>)}
            </select>
          </label>
          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-border bg-bg px-2 text-[0.625rem] font-semibold uppercase tracking-wide text-muted" title="High-frequency filter">
            <span>HFF</span>
            <select className="h-7 w-[4.25rem] bg-transparent text-xs font-normal normal-case tracking-normal text-fg outline-none" aria-label="High-frequency filter" value={filters.hff} onChange={(event) => setFilters({ hff: Number(event.currentTarget.value), bandpass: false })}>
              {HFF_PRESETS.map((value) => <option key={value} value={value}>{value === 0 ? "Off" : `${value} Hz`}</option>)}
            </select>
          </label>
          <Button size="sm" variant={filters.notch60 ? "default" : "ghost"} className={toolClass} aria-label={filters.notch60 ? "Disable 60 Hz notch filter" : "Enable 60 Hz notch filter"} aria-pressed={filters.notch60} title={filters.notch60 ? "Disable 60 Hz notch filter" : "Enable 60 Hz notch filter"} onClick={() => setFilters({ notch60: !filters.notch60 })}>
            <Filter aria-hidden="true" /> NOTCH 60Hz
          </Button>
          <Button size="sm" variant={filters.artifactReduction ? "default" : "ghost"} className={toolClass} aria-pressed={filters.artifactReduction} title="Display-only: subtract EOG/EMG from EEG by least-squares regression" aria-label={filters.artifactReduction ? "Disable artifact reduction" : "Enable artifact reduction"} onClick={() => setFilters({ artifactReduction: !filters.artifactReduction })}>
            <Eraser aria-hidden="true" /> Artifact
          </Button>
          <Button size="sm" variant={filters.ica ? "default" : "ghost"} className={toolClass} aria-pressed={filters.ica} title="Display-only: reject ICA components correlated with EOG/EMG" aria-label={filters.ica ? "Disable ICA" : "Enable ICA"} onClick={() => setFilters({ ica: !filters.ica })}>
            <GitBranch aria-hidden="true" /> ICA
          </Button>
          <Button size="sm" variant={filters.spatialFilter ? "default" : "ghost"} className={toolClass} aria-pressed={filters.spatialFilter} title="Display-only: project out the shared EOG/EMG spatial pattern" aria-label={filters.spatialFilter ? "Disable spatial filter" : "Enable spatial filter"} onClick={() => setFilters({ spatialFilter: !filters.spatialFilter })}>
            <Layers aria-hidden="true" /> Spatial
          </Button>
          <select className={`${selectClass} w-[5.5rem]`} aria-label="EEG sensitivity" title="EEG sensitivity" value={sensitivity} onChange={(event) => setSensitivity(Number(event.currentTarget.value))}>
            {SENSITIVITY_PRESETS.map((value) => <option key={value} value={value}>{value} µV/mm</option>)}
          </select>
        </div>

        <Divider />

        <div className="flex items-center gap-1" aria-label="Review tools">
          <Button size="sm" variant={tool === "pan" ? "default" : "ghost"} className={toolClass} aria-pressed={tool === "pan"} title="Pan and select annotations" onClick={() => setTool("pan")}>
            <Hand aria-hidden="true" /> Pan
          </Button>
          <Button size="sm" variant={tool === "annotate" ? "default" : "ghost"} className={toolClass} aria-pressed={tool === "annotate"} title="Place an annotation (A)" onClick={() => setTool("annotate")}>
            <PencilLine aria-hidden="true" /> Annotate
          </Button>
          <Button size="sm" variant={tool === "caliper" ? "default" : "ghost"} className={toolClass} aria-pressed={tool === "caliper"} title="Measure a time interval (C)" onClick={() => setTool("caliper")}>
            <Ruler aria-hidden="true" /> Caliper
          </Button>
        </div>

        <Divider />

        <div className="flex items-center gap-1" aria-label="Overlays">
          <Button size="sm" variant={showAnnotations ? "default" : "ghost"} className={toolClass} aria-pressed={showAnnotations} aria-label={`${showAnnotations ? "Hide" : "Show"} markers (${confirmed})`} title={`${showAnnotations ? "Hide" : "Show"} markers`} onClick={() => setShowAnnotations(!showAnnotations)}>
            {showAnnotations ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />} Markers <Count>{confirmed}</Count>
          </Button>
          <Button size="sm" variant={showAuto ? "default" : "ghost"} className={toolClass} aria-pressed={showAuto} aria-label={screeningBusy ? "Analyzing deterministic review cues" : `${showAuto ? "Hide" : "Show"} deterministic non-diagnostic review cues (${suggestions})`} title={screeningBusy ? "Analyzing deterministic signal features" : `${showAuto ? "Hide" : "Show"} deterministic review cues`} onClick={() => setShowAuto(!showAuto)}>
            <Lightbulb aria-hidden="true" /> {screeningBusy ? "Analyzing…" : "Review cues"} <Count>{suggestions}</Count>
          </Button>
          <Button size="sm" variant={showDsa ? "default" : "ghost"} className={toolClass} aria-pressed={showDsa} title={showDsa ? "Hide DSA" : "Show DSA"} onClick={() => setShowDsa(!showDsa)}>
            <Activity aria-hidden="true" /> DSA
          </Button>
          <Button size="sm" variant={showDsaBands ? "default" : "ghost"} className={toolClass} aria-pressed={showDsaBands} disabled={!showDsa} title={showDsaBands ? "Hide frequency bands on DSA and EEG traces" : "Show frequency bands on DSA and EEG traces"} onClick={() => setShowDsaBands(!showDsaBands)}>
            <Layers aria-hidden="true" /> Bands
          </Button>
        </div>

        <Divider />

        <div className="flex items-center gap-1" aria-label="Utilities">
          <label className="flex h-8 shrink-0 items-center gap-1 rounded-sm border border-border bg-bg px-1.5" title="Sound mode">
            {soundActive ? <Volume2 className="size-3.5 text-accent" aria-hidden="true" /> : <VolumeX className="size-3.5 text-muted" aria-hidden="true" />}
            <select className="h-7 w-[6.25rem] bg-transparent px-0.5 text-xs text-fg outline-none" aria-label="Sound mode" value={soundMode} onChange={(event) => setSoundMode(event.currentTarget.value as typeof soundMode)}>
              <SoundOptions />
            </select>
          </label>
          <Button size="iconSm" variant="ghost" className={actionClass} aria-label="Download WAV" title={!soundActive ? (evidenceReason ?? "Choose a sound mode first") : "Download WAV"} disabled={!segment || !soundActive} onClick={download}>
            <Download aria-hidden="true" />
          </Button>
          <Button size="iconSm" variant="ghost" className={actionClass} aria-label="Toggle fullscreen" title="Toggle fullscreen" onClick={onToggleFullscreen}>
            <Expand aria-hidden="true" />
          </Button>
          <Button size="iconSm" variant="ghost" className={actionClass} aria-label="Focus EEG" title="Focus EEG (Ctrl/⌘+Shift+F)" onClick={onToggleFocus}>
            <Scan aria-hidden="true" />
          </Button>
          <Button size="iconSm" variant="ghost" className={actionClass} aria-label="Keyboard shortcuts" title="Keyboard shortcuts" onClick={() => setKeysOpen(true)}>
            <Keyboard aria-hidden="true" />
          </Button>
          <Button size="iconSm" variant="ghost" className={actionClass} aria-label="About Auris" title="About Auris" onClick={onAbout}>
            <Info aria-hidden="true" />
          </Button>
        </div>

        <span className="ml-2 shrink-0 border-l border-border pl-2 font-mono text-xs tabular-nums text-muted">EEG <span ref={eegRef} className="text-fg">{formatTime(playheadEeg, true)}</span></span>
        <Button
          size="iconSm"
          variant="ghost"
          className="ml-1 shrink-0"
          aria-label={`Theme: ${themeLabel}. Switch to ${nextModeLabel} mode`}
          title={`Theme: ${themeLabel} · Switch to ${nextModeLabel}`}
          onClick={onCycleTheme}
        >
          {themeMode === "auto" ? <Monitor aria-hidden="true" /> : themeMode === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />;
}

function Count({ children }: { children: number }) {
  return <span className="rounded bg-bg/40 px-1 font-mono text-[0.625rem] tabular-nums">{children}</span>;
}

function SoundOptions() {
  return <><option value="off">Sound off</option><option value="evidence">Evidence</option><option value="hybrid">Hybrid</option><option value="experimental">Experimental</option><option value="musical">Musical</option></>;
}
