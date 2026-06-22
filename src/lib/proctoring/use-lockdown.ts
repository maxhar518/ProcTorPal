import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { logEvents } from "./proctoring.functions";

export type LockdownEvent = {
  event_type: string;
  severity: "info" | "warn" | "critical";
  details?: Record<string, any>;
  occurred_at?: string;
};

export function useLockdown(attemptId: string | undefined, enabled: boolean) {
  const log = useServerFn(logEvents);
  const bufferRef = useRef<LockdownEvent[]>([]);
  const [fullscreen, setFullscreen] = useState<boolean>(
    typeof document !== "undefined" && !!document.fullscreenElement
  );
  const [shortcutBlocked, setShortcutBlocked] = useState<string | null>(null);

  const push = useCallback((ev: LockdownEvent) => {
    bufferRef.current.push({ ...ev, occurred_at: new Date().toISOString() });
  }, []);

  const flush = useCallback(async () => {
    if (!attemptId || !enabled) return;
    if (bufferRef.current.length === 0) return;
    const events = bufferRef.current.splice(0, bufferRef.current.length);
    try {
      await log({ data: { attemptId, events } });
    } catch {
      // re-queue on failure (cap to 500)
      bufferRef.current = [...events, ...bufferRef.current].slice(0, 500);
    }
  }, [attemptId, enabled, log]);

  useEffect(() => {
    if (!enabled || !attemptId || typeof window === "undefined") return;

    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      push({ event_type: "contextmenu_blocked", severity: "info" });
    };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); push({ event_type: "copy_blocked", severity: "warn" }); };
    const onCut = (e: ClipboardEvent) => { e.preventDefault(); push({ event_type: "cut_blocked", severity: "warn" }); };
    const onPaste = (e: ClipboardEvent) => { e.preventDefault(); push({ event_type: "paste_blocked", severity: "warn" }); };
    const onDrag = (e: DragEvent) => e.preventDefault();
    const onSelectStart = (e: Event) => e.preventDefault();

    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const combos: { match: boolean; name: string }[] = [
        { match: k === "F12", name: "F12" },
        { match: ctrl && shift && (k === "I" || k === "i"), name: "Ctrl+Shift+I" },
        { match: ctrl && shift && (k === "J" || k === "j"), name: "Ctrl+Shift+J" },
        { match: ctrl && shift && (k === "C" || k === "c"), name: "Ctrl+Shift+C" },
        { match: ctrl && (k === "U" || k === "u"), name: "Ctrl+U" },
        { match: ctrl && (k === "C" || k === "c") && !shift, name: "Ctrl+C" },
        { match: ctrl && (k === "V" || k === "v") && !shift, name: "Ctrl+V" },
        { match: ctrl && (k === "X" || k === "x") && !shift, name: "Ctrl+X" },
        { match: ctrl && (k === "P" || k === "p"), name: "Ctrl+P" },
        { match: ctrl && (k === "S" || k === "s"), name: "Ctrl+S" },
        { match: ctrl && (k === "A" || k === "a"), name: "Ctrl+A" },
      ];
      const hit = combos.find((c) => c.match);
      if (hit) {
        e.preventDefault();
        e.stopPropagation();
        push({ event_type: "restricted_shortcut", severity: "warn", details: { key: hit.name } });
        setShortcutBlocked(hit.name);
        window.setTimeout(() => setShortcutBlocked(null), 1500);
      }
    };

    const onFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setFullscreen(isFs);
      push({ event_type: isFs ? "fullscreen_enter" : "fullscreen_exit", severity: isFs ? "info" : "critical" });
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        push({ event_type: "visibility_hidden", severity: "warn" });
      } else {
        push({ event_type: "visibility_visible", severity: "info" });
      }
    };
    const onBlur = () => push({ event_type: "tab_blur", severity: "warn" });
    const onFocus = () => push({ event_type: "tab_focus", severity: "info" });

    document.addEventListener("contextmenu", onContext);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    // DevTools heuristic
    let devOpen = false;
    const devInterval = window.setInterval(() => {
      const widthGap = window.outerWidth - window.innerWidth;
      const heightGap = window.outerHeight - window.innerHeight;
      const open = widthGap > 200 || heightGap > 200;
      if (open && !devOpen) {
        devOpen = true;
        push({ event_type: "devtools_suspected", severity: "critical" });
      } else if (!open) {
        devOpen = false;
      }
    }, 2500);

    // Flush loop
    const flushInterval = window.setInterval(flush, 5000);
    const beforeUnload = () => { void flush(); };
    window.addEventListener("pagehide", beforeUnload);

    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", beforeUnload);
      window.clearInterval(devInterval);
      window.clearInterval(flushInterval);
      void flush();
    };
  }, [enabled, attemptId, push, flush]);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // ignored
    }
  }, []);

  return { fullscreen, enterFullscreen, shortcutBlocked, push };
}
