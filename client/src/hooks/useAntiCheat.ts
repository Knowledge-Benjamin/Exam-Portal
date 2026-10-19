import { useEffect, useRef, useState, useCallback } from 'react';

interface AntiCheatOptions {
  onViolation?: (type: string) => void;
  allowExternalApps?: boolean;
}

/**
 * Enforces exam integrity in the ExamRoom.
 *
 * False-positive mitigations:
 *  - window.blur is NOT used — it fires for native dialogs (confirm/alert),
 *    fullscreen transitions, OS notifications, and any browser UI interaction.
 *    visibilitychange is the correct signal for genuine tab-switches.
 *  - When allowExternalApps is enabled (for exams configured with VS Code, Word, etc.),
 *    switching to the external tool does not generate spurious tab-switch penalties.
 *  - A mute() function is exported so callers can suppress detections
 *    for the duration of intentional app actions (e.g. submit confirm dialog).
 *  - visibilitychange is debounced 200ms to ignore brief browser transitions
 *    (e.g. entering fullscreen, PDF load, file download dialog).
 */
export function useAntiCheat(active: boolean, { onViolation, allowExternalApps }: AntiCheatOptions = {}) {
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenRequested = useRef(false);
  const muteUntil = useRef<number>(0);      // epoch ms — suppress violations until this time
  const visibilityTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** Call before any window.confirm / alert / intentional navigation */
  const mute = useCallback((ms = 2000) => {
    muteUntil.current = Date.now() + ms;
  }, []);

  const report = useCallback((type: string) => {
    if (Date.now() < muteUntil.current) return;   // suppressed
    setTabSwitchCount((c) => c + 1);
    onViolation?.(type);
  }, [onViolation]);

  const isEditableElement = (el: EventTarget | null): boolean => {
    if (!el || !(el instanceof HTMLElement)) return false;
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable ||
      !!el.closest('.tiptap') ||
      !!el.closest('.essay-prose') ||
      !!el.closest('[contenteditable="true"]')
    );
  };

  // ─── Keyboard Blocking ────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const insideEditable = isEditableElement(e.target);

      // DevTools
      if (e.key === 'F12') { e.preventDefault(); report('devtools'); return; }
      if (ctrl && e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key.toUpperCase())) {
        e.preventDefault(); report('devtools'); return;
      }
      // Print
      if (ctrl && e.key === 'p') { e.preventDefault(); report('print'); return; }

      // Inside editable text areas (answer inputs & essay editor), allow standard text editing:
      if (insideEditable) {
        // Ctrl+A, Ctrl+Z, Ctrl+Y, Cut/Copy within own answers are normal writing operations
        if (ctrl && (e.key === 'a' || e.key === 'z' || e.key === 'y' || e.key === 'c' || e.key === 'x')) {
          return;
        }
        if (ctrl && e.key === 'v') {
          if (!allowExternalApps) {
            // In strict mode without external apps, allow paste only within the editor
            return;
          }
          return;
        }
      }

      // Outside editable areas: Block Copy / Cut of exam questions
      if (ctrl && (e.key === 'c' || e.key === 'x')) {
        e.preventDefault();
        report('copy');
        return;
      }
      // Paste outside editable areas
      if (ctrl && e.key === 'v') {
        if (!allowExternalApps) {
          e.preventDefault();
          report('paste');
        }
        return;
      }
      // Block Select All outside editable areas (e.g. whole page scraping)
      if (ctrl && e.key === 'a') { e.preventDefault(); return; }
      // View source
      if (ctrl && e.key === 'u') { e.preventDefault(); return; }
      // Find
      if (ctrl && e.key === 'f') { e.preventDefault(); return; }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [active, allowExternalApps, report]);

  // ─── Clipboard Blocking ───────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    const blockCopy = (e: ClipboardEvent) => {
      if (isEditableElement(e.target)) return; // Allow student to copy their own typed answer text
      e.preventDefault();
      report('copy');
    };

    const blockCut = (e: ClipboardEvent) => {
      if (isEditableElement(e.target)) return; // Allow student to cut text within their own answers
      e.preventDefault();
      report('copy');
    };

    const blockPaste = (e: ClipboardEvent) => {
      if (allowExternalApps || isEditableElement(e.target)) return; // Allow pasting into answers
      e.preventDefault();
      report('paste');
    };

    document.addEventListener('copy',  blockCopy,  true);
    document.addEventListener('cut',   blockCut,   true);
    document.addEventListener('paste', blockPaste, true);

    return () => {
      document.removeEventListener('copy',  blockCopy,  true);
      document.removeEventListener('cut',   blockCut,   true);
      document.removeEventListener('paste', blockPaste, true);
    };
  }, [active, allowExternalApps, report]);

  // ─── Right-click / Drag Blocking ──────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const blockCtx   = (e: MouseEvent) => e.preventDefault();
    const blockDrag  = (e: DragEvent)  => e.preventDefault();

    document.addEventListener('contextmenu', blockCtx,  true);
    document.addEventListener('dragstart',   blockDrag, true);
    document.addEventListener('drop',        blockDrag, true);

    return () => {
      document.removeEventListener('contextmenu', blockCtx,  true);
      document.removeEventListener('dragstart',   blockDrag, true);
      document.removeEventListener('drop',        blockDrag, true);
    };
  }, [active]);

  // ─── Tab-switch Detection ────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    const onVisibilityChange = () => {
      clearTimeout(visibilityTimer.current);
      if (document.hidden) {
        // If external applications are permitted (e.g. VS Code, Word),
        // switching out of the browser to work in the app is legitimate.
        if (allowExternalApps) return;

        visibilityTimer.current = setTimeout(() => {
          if (document.hidden) report('tab_switch');
        }, 200);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(visibilityTimer.current);
    };
  }, [active, allowExternalApps, report]);

  // ─── Fullscreen ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || fullscreenRequested.current) return;
    fullscreenRequested.current = true;

    // Mute for 1s during the fullscreen enter transition to avoid
    // spurious visibilitychange events on some browsers.
    mute(1000);
    document.documentElement.requestFullscreen?.().catch(() => {});

    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        // Mute briefly — exit transition may fire visibilitychange
        mute(800);
        report('fullscreen_exit');
        // Re-request
        setTimeout(() => {
          mute(800);
          document.documentElement.requestFullscreen?.().catch(() => {});
        }, 600);
      }
    };

    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [active, mute, report]);

  return { tabSwitchCount, isFullscreen, mute };
}
