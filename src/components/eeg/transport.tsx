"use client";

import { useEffect, useRef } from "react";
import {
  Download,
  Pause,
  Play,
  Square,
  Repeat,
  ZoomIn,
  ZoomOut,
  Scan,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils";
import { VIEW_PRESETS } from "@/lib/eeg/view";
import { timeScaleFor } from "@/lib/eeg/musify";
import { playback } from "@/lib/eeg/audio";
import { BAND_LABELS, readoutAt, type BandName } from "@/lib/eeg/spectrum";
import { eegNow, useEegStore } from "@/store/eeg-store";
import { cn } from "@/lib/utils";

const BAND_KEYS: BandName[] = ["delta", "theta", "alpha", "beta", "gamma"];

export function Transport() {
  const playing = useEegStore((s) => s.playing);
  const loop = useEegStore((s) => s.loop);
  const follow = useEegStore((s) => s.followPlayhead);
  const mix = useEegStore((s) => s.mix);
  const segment = useEegStore((s) => s.segment);
  const togglePlay = useEegStore((s) => s.togglePlay);
  const stop = useEegStore((s) => s.stop);
  const setLoop = useEegStore((s) => s.setLoop);
  const download = useEegStore((s) => s.download);
  const zoomAt = useEegStore((s) => s.zoomAt);
  const setViewDuration = useEegStore((s) => s.setViewDuration);
  const setFollow = useEegStore((s) => s.setFollow);
  const setKeysOpen = useEegStore((s) => s.setKeysOpen);
  const viewDuration = useEegStore((s) => s.viewDuration);
  const sonify = useEegStore((s) => s.sonify);
  const eegRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<HTMLSpanElement>(null);
  const hzRef = useRef<HTMLSpanElement>(null);
  const uvRef = useRef<HTMLSpanElement>(null);
  const bandRef = useRef<HTMLSpanElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const s = useEegStore.getState();
      const t = eegNow(s);
      if (eegRef.current) eegRef.current.textContent = formatTime(t, true);
      if (audioRef.current) audioRef.current.textContent = `${playback.currentTime().toFixed(2)}s`;
      if (!s.segment) return;
      const r = readoutAt(s.segment.tracks, t, s.dsa);
      if (hzRef.current) hzRef.current.textContent = r.hz > 0.2 ? r.hz.toFixed(1) : "—";
      if (uvRef.current) uvRef.current.textContent = r.uv.toFixed(0);
      if (bandRef.current) {
        bandRef.current.textContent = r.hz > 0.2 ? r.band : "—";
        bandRef.current.style.color = `var(--color-band-${r.band})`;
      }
      if (barsRef.current && r.l) {
        const kids = barsRef.current.querySelectorAll("[data-band]");
        kids.forEach((el) => {
          const id = el.getAttribute("data-band") as BandName | null;
          if (!id) return;
          const v = ((r.l?.[id] ?? 0) + (r.r?.[id] ?? 0)) / 2;
          (el as HTMLElement).style.height = `${Math.round(Math.min(1, v * 2.2) * 100)}%`;
        });
      }
    };
    update();
    if (!playing) return;
    let raf = 0;
    const loopFn = () => {
      update();
      raf = requestAnimationFrame(loopFn);
    };
    raf = requestAnimationFrame(loopFn);
    return () => cancelAnimationFrame(raf);
  }, [playing, segment]);

  const factor = timeScaleFor(sonify);
  const total = segment?.duration ?? 0;
  const showingAll = total > 0 && viewDuration >= total - 1e-6;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface px-3 py-2">
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="secondary"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => void togglePlay()}
          disabled={!mix || mix.duration <= 0}
        >
          {playing ? <Pause /> : <Play className="ml-px" />}
        </Button>
        <Button size="icon" variant="ghost" aria-label="Stop" onClick={stop}>
          <Square />
        </Button>
        <Button
          size="icon"
          variant={loop ? "default" : "ghost"}
          aria-label="Loop"
          onClick={() => setLoop(!loop)}
        >
          <Repeat />
        </Button>
        <Button
          size="icon"
          variant={follow ? "default" : "ghost"}
          aria-label="Follow playhead"
          title="Follow playhead (F)"
          onClick={() => setFollow(!follow)}
        >
          <Scan />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Zoom out"
          onClick={() => zoomAt(1.25)}
        >
          <ZoomOut />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Zoom in"
          onClick={() => zoomAt(1 / 1.25)}
        >
          <ZoomIn />
        </Button>
        <div className="hidden items-center gap-1 md:flex">
          {VIEW_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setViewDuration(d)}
              className={cn(
                "h-7 rounded-full px-2 text-[0.6875rem] tabular-nums",
                Math.abs(viewDuration - d) < 0.05
                  ? "bg-accent text-accent-fg"
                  : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {d}s
            </button>
          ))}
          <button
            type="button"
            onClick={() => total && setViewDuration(total)}
            className={cn(
              "h-7 rounded-full px-2 text-[0.6875rem]",
              showingAll ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            All
          </button>
        </div>
      </div>

      <div
        ref={barsRef}
        className="hidden h-7 items-end gap-0.5 sm:flex"
        title="Live band power at the playhead"
      >
        {BAND_KEYS.map((id) => (
          <span
            key={id}
            data-band={id}
            className="w-1.5 rounded-sm"
            style={{
              height: "20%",
              background: `var(--color-band-${id})`,
            }}
          />
        ))}
      </div>
      <div className="hidden items-baseline gap-2 font-mono text-[0.6875rem] tabular-nums text-muted lg:flex">
        <span>
          <span ref={hzRef} className="text-fg">—</span> Hz
        </span>
        <span ref={bandRef} className="uppercase">—</span>
        <span>
          <span ref={uvRef} className="text-fg">—</span> µV
        </span>
        <span className="hidden xl:inline text-subtle">
          {BAND_LABELS.map((b) => b.glyph).join(" ")}
        </span>
      </div>

      <div className="min-w-0 flex-1" />

      <div className="flex items-baseline gap-3 font-mono text-xs tabular-nums text-muted">
        <span>
          EEG <span ref={eegRef} className="text-fg">{formatTime(0, true)}</span>
        </span>
        <span className="hidden sm:inline">
          window <span className="text-fg">{viewDuration.toFixed(viewDuration < 10 ? 1 : 0)}s</span>
        </span>
        <span className="hidden sm:inline">
          audio <span ref={audioRef} className="text-fg">{(mix?.duration ?? 0).toFixed(2)}s</span>
        </span>
        <span>{factor}×</span>
      </div>
      <Button size="icon" variant="ghost" aria-label="Keyboard shortcuts" onClick={() => setKeysOpen(true)}>
        <Keyboard />
      </Button>
      <Button size="sm" variant="secondary" disabled={!segment} onClick={download}>
        <Download /> WAV
      </Button>
    </div>
  );
}
