"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Info, Keyboard, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ControlPanel } from "./control-panel";
import { Transport } from "./transport";
import { WaveformView } from "./waveform-view";
import { ReviewBar } from "./review-bar";
import { useEditorKeys } from "./use-editor-keys";
import { SHORTCUTS } from "@/lib/eeg/shortcuts";
import { useEegStore } from "@/store/eeg-store";

export function Workstation() {
  const [panel, setPanel] = useState<boolean | null>(null);
  const aboutOpen = useEegStore((s) => s.aboutOpen);
  const setAboutOpen = useEegStore((s) => s.setAboutOpen);
  const keysOpen = useEegStore((s) => s.keysOpen);
  const setKeysOpen = useEegStore((s) => s.setKeysOpen);
  const loadFile = useEegStore((s) => s.loadFile);
  const status = useEegStore((s) => s.status);
  useEditorKeys();

  useEffect(() => {
    if (status !== "idle") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}sample.edf`);
        if (!res.ok || cancelled) return;
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        await loadFile(buf, "demo-deidentified.edf");
      } catch {
        /* demo optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFile, status]);

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-bg text-fg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Toggle controls"
          onClick={() => {
            const desktop = window.matchMedia("(min-width: 768px)").matches;
            setPanel((v) => {
              const open = v == null ? desktop : v;
              return !open;
            });
          }}
        >
          <PanelLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-base tracking-tight">Auris</span>
            <span className="hidden text-xs text-muted sm:inline">EEG sonification</span>
          </div>
        </div>
        <p className="hidden max-w-xl truncate text-xs text-subtle md:block">
          Educational aid — not a medical device. No seizure detection. Processing is local.
        </p>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Keyboard shortcuts"
          onClick={() => setKeysOpen(true)}
        >
          <Keyboard />
        </Button>
        <Button size="icon" variant="ghost" aria-label="About" onClick={() => setAboutOpen(true)}>
          <Info />
        </Button>
      </header>

      <Transport />

      <div className="relative flex min-h-0 flex-1">
        <div
          className={
            panel === true
              ? "absolute inset-0 z-40 flex min-h-0 w-full flex-col border-r border-border bg-surface md:static md:z-0 md:w-80 md:shrink-0"
              : panel === false
                ? "hidden"
                : "hidden min-h-0 w-80 shrink-0 flex-col border-r border-border bg-surface md:flex"
          }
        >
          <ControlPanel />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ReviewBar />
          <WaveformView />
        </div>
      </div>

      {aboutOpen && (
        <Modal title="About Auris" onClose={() => setAboutOpen(false)}>
          <div className="space-y-3 text-pretty text-sm leading-relaxed text-muted">
            <p>
              Auris is a local EEG review + listening station. Contour maps the tracing itself: a
              deflection up on the graph raises pitch. Pen mode (Norata 2023) is the analog paper
              scratch — pen speed is |dV/dt|, so spikes hiss and isoelectric baseline is almost
              silent. Choir uses just-intonation partials with 1/f loudness (Wu 2009 scale-free
              brain-wave music). Piano keeps a scale while the field looks ordinary and leaves it
              when it does not — educational, not a diagnosis. Ambient maps smoothed delta, theta,
              alpha, and beta power to a restrained harmonic choir; Piano uses a scale with
              rate-limited transient accents. Trace colors come from stable channel identity, not
              zoom or signal density. The DSA strip is a left/right power spectral density view with
              a fixed robust dB scale. Suggested markers are educational — not a diagnosis. Audible
              scrubbing previews a short grain under the pointer. Nothing leaves this browser.
            </p>
            <p>
              The strip at the top is the entire recording. The highlighted window is what the
              editor shows. Playback is continuous across the file; the playhead can follow while
              you zoom. Mute (M) and solo (S) work like a mixer — any number of tracks can be
              soloed; muted tracks are silent without stopping the clock.
            </p>
            <p>
              This is a research and teaching aid, not a diagnostic instrument. It does not detect
              seizures, mark spikes, or interpret studies. Do not load identifiable recordings.
              Files never leave this device.
            </p>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setAboutOpen(false)}>Close</Button>
          </div>
        </Modal>
      )}

      {keysOpen && (
        <Modal title="Keyboard shortcuts" onClose={() => setKeysOpen(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            {["Playback", "View", "Review", "Tracks", "Help"].map((group) => (
              <div key={group}>
                <p className="mb-2 text-[0.6875rem] font-medium uppercase tracking-wider text-subtle">
                  {group}
                </p>
                <ul className="space-y-1.5">
                  {SHORTCUTS.filter((k) => k.group === group).map((k) => (
                    <li
                      key={`${group}-${k.action}`}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="text-muted">{k.action}</span>
                      <span className="flex shrink-0 gap-1">
                        {k.keys.map((key) => (
                          <kbd
                            key={key}
                            className="rounded-sm bg-bg px-1.5 py-0.5 font-mono text-[0.6875rem] text-fg shadow-border"
                          >
                            {key}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setKeysOpen(false)}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4" onClick={onClose}>
      <div
        className="max-h-[min(32rem,90dvh)] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-6 shadow-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
