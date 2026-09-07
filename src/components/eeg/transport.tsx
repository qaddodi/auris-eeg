"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  Download, Expand, Eye, EyeOff, Info, Keyboard, Lock, MoreHorizontal, PanelLeft, Pause, Play,
  Repeat, Scan, Square, Unlock, Upload, Volume2, VolumeX, ZoomIn, ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VIEW_PRESETS } from "@/lib/eeg/view";
import { formatTime } from "@/lib/utils";
import { eegNow, useEegStore } from "@/store/eeg-store";

interface TransportProps {
  onOpenFile: () => void;
  onTogglePanel: () => void;
  onToggleFocus: () => void;
  onToggleFullscreen: () => void;
  onAbout: () => void;
}

const selectClass = "h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent";

export function Transport({ onOpenFile, onTogglePanel, onToggleFocus, onToggleFullscreen, onAbout }: TransportProps) {
  const playing = useEegStore((s) => s.playing);
  const loop = useEegStore((s) => s.loop);
  const follow = useEegStore((s) => s.followPlayhead);
  const segment = useEegStore((s) => s.segment);
  const togglePlay = useEegStore((s) => s.togglePlay);
  const stop = useEegStore((s) => s.stop);
  const setLoop = useEegStore((s) => s.setLoop);
  const download = useEegStore((s) => s.download);
  const zoomAt = useEegStore((s) => s.zoomAt);
  const zoomLocked = useEegStore((s) => s.zoomLocked);
  const setZoomLocked = useEegStore((s) => s.setZoomLocked);
  const setViewDuration = useEegStore((s) => s.setViewDuration);
  const setFollow = useEegStore((s) => s.setFollow);
  const setKeysOpen = useEegStore((s) => s.setKeysOpen);
  const viewDuration = useEegStore((s) => s.viewDuration);
  const soundMode = useEegStore((s) => s.soundMode);
  const setSoundMode = useEegStore((s) => s.setSoundMode);
  const evidencePreparation = useEegStore((s) => s.evidencePreparation);
  const evidenceReason = useEegStore((s) => s.evidenceReason);
  const showDsa = useEegStore((s) => s.showDsa);
  const setShowDsa = useEegStore((s) => s.setShowDsa);
  const playheadEeg = useEegStore((s) => s.playheadEeg);
  const hiddenTrackIds = useEegStore((s) => s.hiddenTrackIds);
  const toggleTrackVisibility = useEegStore((s) => s.toggleTrackVisibility);
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

  return (
    <div className="transport-bar relative flex h-11 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-2 sm:gap-2 sm:px-3">
      <Button size="iconSm" variant="ghost" aria-label="Open review controls" onClick={onTogglePanel}><PanelLeft /></Button>
      <span className="hidden font-display text-sm font-semibold tracking-tight sm:inline">Auris</span>
      <Button size="sm" variant="secondary" onClick={onOpenFile} title="Open EDF recording"><Upload /><span className="hidden sm:inline">Open</span></Button>
      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
      <Button size="iconSm" variant="secondary" aria-label={playing ? "Pause" : "Play"} onClick={() => void togglePlay()} disabled={!segment}>
        {playing ? <Pause /> : <Play className="ml-px" />}
      </Button>
      <Button size="iconSm" variant="ghost" aria-label="Stop" onClick={stop}><Square /></Button>
      <Button size="iconSm" variant="ghost" aria-label="Zoom out" onClick={() => zoomAt(1.25)}><ZoomOut /></Button>
      <Button
        size="sm"
        variant={zoomLocked ? "default" : "secondary"}
        className="shrink-0 px-2"
        aria-pressed={zoomLocked}
        aria-label={`Zoom lock: ${zoomLocked ? "on" : "off"}`}
        title={zoomLocked ? "Zoom lock on: scroll and trackpad gestures pan; zoom buttons remain available" : "Zoom lock off: scrolling zooms the time window"}
        onClick={() => setZoomLocked(!zoomLocked)}
      >
        {zoomLocked ? <Lock /> : <Unlock />}<span className="hidden sm:inline">Zoom lock</span>
      </Button>
      <select className={`${selectClass} w-[4.75rem]`} aria-label="Time window" value={selectedDuration}
        onChange={(event) => setViewDuration(event.currentTarget.value === "all" ? total : Number(event.currentTarget.value))}>
        {!isPreset && selectedDuration !== "all" && <option value={selectedDuration}>{viewDuration.toFixed(1)}s</option>}
        {VIEW_PRESETS.map((duration) => <option key={duration} value={duration}>{duration}s</option>)}
        <option value="all">All</option>
      </select>
      <Button size="iconSm" variant="ghost" aria-label="Zoom in" onClick={() => zoomAt(1 / 1.25)}><ZoomIn /></Button>
      <div className="hidden items-center gap-1 rounded-sm border border-border bg-bg px-1 md:flex">
        <span className={soundActive ? "text-accent" : "text-muted"} title={soundActive ? "Sound on" : "Sound off"}>
          {soundActive ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
        </span>
        <select className="h-7 w-[6.5rem] bg-transparent px-1 text-xs text-fg outline-none" aria-label="Sound mode" value={soundMode}
        onChange={(event) => setSoundMode(event.currentTarget.value as typeof soundMode)}>
        <SoundOptions />
        </select>
      </div>
      <Button size="sm" variant={showDsa ? "default" : "ghost"} className="hidden lg:inline-flex" aria-pressed={showDsa}
        onClick={() => setShowDsa(!showDsa)} title={showDsa ? "Hide DSA" : "Show DSA"}>
        {showDsa ? <EyeOff /> : <Eye />} DSA
      </Button>
      <div className="min-w-0 flex-1" />
      <span className="font-mono text-xs tabular-nums text-muted">EEG <span ref={eegRef} className="text-fg">{formatTime(playheadEeg, true)}</span></span>
      <details className="group relative">
        <summary className="grid size-8 list-none place-items-center rounded-sm text-muted hover:bg-surface-2 hover:text-fg [&::-webkit-details-marker]:hidden" aria-label="More controls"><MoreHorizontal className="size-4" /></summary>
        <div className="absolute right-0 top-9 z-50 grid w-56 gap-1 rounded-md border border-border bg-surface p-2 shadow-2xl">
          <select className="h-8 w-full rounded-sm border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent md:hidden" aria-label="Sound mode" value={soundMode}
            onChange={(event) => setSoundMode(event.currentTarget.value as typeof soundMode)}><SoundOptions /></select>
          <MenuButton onClick={() => setFollow(!follow)} icon={<Scan />} label={follow ? "Stop following" : "Follow playhead"} />
          <MenuButton onClick={() => setLoop(!loop)} icon={<Repeat />} label={loop ? "Disable loop" : "Loop playback"} />
          <MenuButton onClick={() => setShowDsa(!showDsa)} icon={showDsa ? <EyeOff /> : <Eye />} label={showDsa ? "Hide DSA" : "Show DSA"} />
          <MenuButton onClick={onToggleFocus} icon={<Scan />} label="Focus EEG" />
          <MenuButton onClick={onToggleFullscreen} icon={<Expand />} label="Toggle fullscreen" />
          <MenuButton onClick={() => setKeysOpen(true)} icon={<Keyboard />} label="Keyboard shortcuts" />
          <MenuButton onClick={onAbout} icon={<Info />} label="About Auris" />
          {segment && (
            <div className="mt-1 border-t border-border pt-2">
              <p className="mb-1 px-2 text-[0.625rem] font-semibold uppercase tracking-wide text-subtle">Channels</p>
              <div className="max-h-40 overflow-y-auto">
                {segment.tracks.filter((track) => track.kind !== "extra").map((track) => {
                  const hidden = hiddenTrackIds.includes(track.id);
                  return (
                    <button key={track.id} type="button" onClick={() => toggleTrackVisibility(track.id)}
                      className="flex h-7 w-full items-center gap-2 rounded-sm px-2 text-left font-mono text-[0.6875rem] text-muted hover:bg-surface-2 hover:text-fg">
                      {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      <span className="truncate">{track.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button type="button" disabled={!segment || !soundActive} onClick={download}
            title={!soundActive ? (evidenceReason ?? "Choose a sound mode first") : undefined}
            className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-xs text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40">
            <Download className="size-4" /> Download WAV
          </button>
        </div>
      </details>
    </div>
  );
}

function SoundOptions() {
  return <><option value="off">Sound off</option><option value="evidence">Evidence</option><option value="hybrid">Hybrid</option><option value="experimental">Experimental</option><option value="musical">Musical</option></>;
}

function MenuButton({ onClick, icon, label }: { onClick: () => void; icon: ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-xs text-muted hover:bg-surface-2 hover:text-fg"><span className="[&>svg]:size-4">{icon}</span>{label}</button>;
}
