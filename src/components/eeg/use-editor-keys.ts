"use client";

import { useEffect } from "react";
import { VIEW_PRESETS } from "@/lib/eeg/view";
import { useEegStore } from "@/store/eeg-store";

function isTypingTarget(el: EventTarget | null): boolean {
  const element = el as HTMLElement | null;
  const tag = element?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (element?.isContentEditable) return true;
  return Boolean(element?.closest("button, a, [role='button'], [role='menuitem']"));
}

export function useEditorKeys(onToggleFocus?: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const s = useEegStore.getState();
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        onToggleFocus?.();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) s.redoAnnotations();
          else s.undoAnnotations();
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          s.redoAnnotations();
        }
        return;
      }
      // Arrow keys page/pan the viewport. Alt+Arrow is a documented fine pan.
      // Other modified shortcuts remain browser/application-owned.
      const arrowPan = e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight");
      if (e.metaKey || e.ctrlKey || (e.altKey && !arrowPan)) return;
      if (e.code === "Space") {
        e.preventDefault();
        void s.togglePlay();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (s.keysOpen) s.setKeysOpen(false);
        else if (s.aboutOpen) s.setAboutOpen(false);
        else s.stop();
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        s.setKeysOpen(!s.keysOpen);
        return;
      }
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        s.setLoop(!s.loop);
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        s.setFollow(!s.followPlayhead);
        return;
      }
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        s.setShowAnnotations(!s.showAnnotations);
        return;
      }
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        s.setShowDsa(!s.showDsa);
        return;
      }
      if (e.key === "," || e.key === "<") {
        e.preventDefault();
        s.nudgeSensitivity(-1);
        return;
      }
      if (e.key === "." || e.key === ">") {
        e.preventDefault();
        s.nudgeSensitivity(1);
        return;
      }
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        s.setTool(s.tool === "annotate" ? "pan" : "annotate");
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        s.setTool(s.tool === "caliper" ? "pan" : "caliper");
        return;
      }
      if (e.key === "PageDown") {
        e.preventDefault();
        s.page(1);
        return;
      }
      if (e.key === "PageUp") {
        e.preventDefault();
        s.page(-1);
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        s.nudgeSensitivity(e.key === "ArrowUp" ? -1 : 1);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        if (e.altKey) s.panView(dir * 0.2);
        else if (e.shiftKey) s.panView(dir * 5);
        else s.page(dir);
        return;
      }
      if (!s.segment) return;

      if (!e.shiftKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        s.nextAnnotation(1);
        return;
      }
      if (!e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        s.nextAnnotation(-1);
        return;
      }

      if (e.key === "Home") {
        e.preventDefault();
        s.seekEeg(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        s.seekEeg(s.segment.duration);
        return;
      }
      if (e.key === "=" || e.key === "+" || e.key === "]") {
        e.preventDefault();
        s.zoomAt(1 / 1.25);
        return;
      }
      if (e.key === "-" || e.key === "[") {
        e.preventDefault();
        s.zoomAt(1.25);
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        s.setViewDuration(s.segment.duration);
        return;
      }
      if (e.key >= "1" && e.key <= "5") {
        const preset = VIEW_PRESETS[[0, 1, 2, 4, 5][Number(e.key) - 1]!] ?? VIEW_PRESETS[2];
        e.preventDefault();
        s.setViewDuration(preset);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggleFocus]);
}
