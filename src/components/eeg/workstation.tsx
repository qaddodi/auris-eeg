"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { Activity, Expand, Info, Keyboard, PanelLeft, Scan, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ControlPanel } from "./control-panel";
import { Transport } from "./transport";
import { WaveformView } from "./waveform-view";
import { ReviewBar } from "./review-bar";
import { useEditorKeys } from "./use-editor-keys";
import { SHORTCUTS } from "@/lib/eeg/shortcuts";
import { buildSyntheticEdf } from "@/lib/eeg/synthetic";
import { useEegStore } from "@/store/eeg-store";

export function Workstation() {
  const [panel, setPanel] = useState<boolean | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [focusEeg, setFocusEeg] = useState(false);
  const aboutOpen = useEegStore((s) => s.aboutOpen);
  const setAboutOpen = useEegStore((s) => s.setAboutOpen);
  const keysOpen = useEegStore((s) => s.keysOpen);
  const setKeysOpen = useEegStore((s) => s.setKeysOpen);
  const loadFile = useEegStore((s) => s.loadFile);
  const status = useEegStore((s) => s.status);
  const soundMode = useEegStore((s) => s.soundMode);
  const setSoundMode = useEegStore((s) => s.setSoundMode);
  const evidencePreparation = useEegStore((s) => s.evidencePreparation);
  const evidenceReason = useEegStore((s) => s.evidenceReason);
  const showDsa = useEegStore((s) => s.showDsa);
  const setShowDsa = useEegStore((s) => s.setShowDsa);
  const demoStarted = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toggleFocusEeg = useCallback(() => setFocusEeg((value) => !value), []);
  useEditorKeys(toggleFocusEeg);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    if (status !== "idle" || demoStarted.current) return;
    demoStarted.current = true;
    let cancelled = false;
    (async () => {
      try {
        const buffer = buildSyntheticEdf({ duration: 60 });
        if (!cancelled) await loadFile(buffer, "synthetic-demo.edf");
      } catch {
        /* The editor remains ready for a local EDF if a demo cannot initialize. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFile, status]);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void loadFile(file, file.name);
  };

  const soundStatus = {
    off: "Visual review at 1× · sound off",
    evidence: evidencePreparation
      ? "Loui 2014 study reproduction · Level B"
      : (evidenceReason ?? "Fz–Cz required"),
    hybrid: evidencePreparation
      ? "Loui 2014 mapping + disclosed soft style"
      : (evidenceReason ?? "Fz–Cz required"),
    experimental: "Experimental contour mapping active",
    musical: "Musical mapping active",
  }[soundMode];

  const togglePanel = () => {
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    setPanel((value) => {
      const open = value == null ? desktop : value;
      return !open;
    });
  };

  return (
    <div
      className={`workstation-shell flex h-dvh min-h-0 flex-col bg-bg text-fg ${focusEeg ? "workstation-focus" : ""}`}
    >
      {!focusEeg && (
        <header className="workstation-header flex min-h-10 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 py-1.5 sm:px-3">
          <Button
            size="icon"
            variant="ghost"
            aria-label={panel === true ? "Close review controls" : "Open review controls"}
            aria-expanded={panel !== false}
            title={panel === true ? "Close review controls" : "Open review controls"}
            onClick={togglePanel}
          >
            <PanelLeft />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-sm font-semibold tracking-tight sm:text-base">
                Auris
              </span>
              <span className="hidden text-[0.6875rem] text-muted md:inline">
                EEG review workstation
              </span>
            </div>
          </div>
          <div className="hidden min-w-0 max-w-[min(36vw,24rem)] items-center gap-2 lg:flex">
            <label className="sr-only" htmlFor="sound-mode">
              Sound mode
            </label>
            <select
              id="sound-mode"
              value={soundMode}
              onChange={(event) => setSoundMode(event.currentTarget.value as typeof soundMode)}
              className="h-8 rounded-sm border border-border bg-bg px-2 text-xs font-medium text-fg outline-none focus:border-accent"
            >
              <option value="off">Sound off</option>
              <option value="evidence">Evidence</option>
              <option value="hybrid">Hybrid</option>
              <option value="experimental">Experimental</option>
              <option value="musical">Musical</option>
            </select>
            <p className="min-w-0 truncate text-[0.6875rem] text-muted" aria-live="polite">
              {soundStatus}
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".edf,.EDF"
            className="sr-only"
            onChange={onFile}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            title="Open EDF recording"
          >
            <Upload /> <span className="hidden sm:inline">Open EDF</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Focus EEG: hide workstation chrome"
            title="Focus EEG (Ctrl/⌘+Shift+F)"
            onClick={toggleFocusEeg}
            className="hidden sm:inline-flex"
          >
            <Scan aria-hidden="true" /> <span>Focus EEG</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={() => {
              if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
              else void document.exitFullscreen?.();
            }}
          >
            <Expand className={fullscreen ? "rotate-180" : undefined} />
          </Button>
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
      )}

      {!focusEeg && <Transport />}

      <div className="relative flex min-h-0 flex-1">
        <div
          className={
            panel === true
              ? "absolute inset-y-0 left-0 z-40 flex min-h-0 w-[min(23rem,calc(100vw-1rem))] flex-col border-r border-border bg-surface shadow-2xl md:static md:z-0 md:w-[21rem] md:shrink-0 md:shadow-none lg:w-[23rem]"
              : panel === false
                ? "hidden"
                : "hidden min-h-0 w-[21rem] shrink-0 flex-col border-r border-border bg-surface md:flex lg:w-[23rem]"
          }
          aria-label="Review controls"
        >
          <ControlPanel onClose={() => setPanel(false)} />
        </div>
        {panel === true && (
          <button
            type="button"
            aria-label="Close review controls"
            className="absolute inset-0 z-30 bg-bg/60 md:hidden"
            onClick={() => setPanel(false)}
          />
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!focusEeg && <ReviewBar />}
          <WaveformView />
        </div>
      </div>

      {focusEeg && (
        <div
          className="focus-edge-strip fixed right-2 top-2 z-50 flex items-center gap-1 rounded-md border border-border bg-surface/95 p-1 shadow-2xl backdrop-blur"
          aria-label="Focused EEG controls"
        >
          <Button
            size="iconSm"
            variant="ghost"
            aria-label={panel === true ? "Close review controls" : "Open review controls"}
            aria-expanded={panel === true}
            title={panel === true ? "Close review controls" : "Open review controls"}
            onClick={togglePanel}
          >
            <PanelLeft aria-hidden="true" />
          </Button>
          <Button
            size="iconSm"
            variant={showDsa ? "default" : "ghost"}
            aria-label={showDsa ? "Hide DSA heatmap" : "Show DSA heatmap"}
            aria-pressed={showDsa}
            title={showDsa ? "Hide DSA heatmap" : "Show DSA heatmap"}
            onClick={() => setShowDsa(!showDsa)}
          >
            <Activity aria-hidden="true" />
          </Button>
          <Button
            size="iconSm"
            variant="default"
            aria-label="Show workstation chrome"
            title="Show workstation chrome (Ctrl/⌘+Shift+F)"
            onClick={toggleFocusEeg}
          >
            <span aria-hidden="true" className="font-mono text-[0.625rem] font-bold">
              F
            </span>
          </Button>
        </div>
      )}

      {aboutOpen && (
        <Modal title="About Auris" onClose={() => setAboutOpen(false)}>
          <div className="space-y-3 text-pretty text-sm leading-relaxed text-muted">
            <p>
              Auris is a local EEG review workstation for teaching and exploratory listening.
              Evidence mode contains a Level B reproduction of the disclosed Loui 2014 Fz–Cz
              symbolic mapping. It is evidence for a bounded listening study, not a validated
              clinical interpretation. Hybrid applies a disclosed downstream soft timbre while
              preserving mapped pitch and timing. Experimental and musical modes remain Level X.
              Trace colors and the DSA display support visual review; suggested markers are
              educational prompts, not findings.
            </p>
            <p>
              The overview shows the full recording and the highlighted window is the current editor
              page. In visual mode, playback advances the review cursor at normal EEG time. Files
              are processed locally in this browser.
            </p>
            <p>
              This is a research and teaching aid, not a diagnostic instrument. It does not detect
              seizures or interpret studies. Use deidentified recordings and retain clinical
              responsibility for any review.
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
            {["Playback", "View", "Review", "Help"].map((group) => (
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
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = dialogRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    first?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[min(32rem,90dvh)] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-6 shadow-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-xl tracking-tight">
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
