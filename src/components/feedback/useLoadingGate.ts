import { useEffect, useRef, useState } from "react";

type UseLoadingGateOptions = {
  showDelayMs?: number;
  minVisibleMs?: number;
};

const DEFAULT_SHOW_DELAY_MS = 280;
const DEFAULT_MIN_VISIBLE_MS = 480;

export function useLoadingGate(
  active: boolean,
  options: UseLoadingGateOptions = {}
): boolean {
  const showDelayMs = options.showDelayMs ?? DEFAULT_SHOW_DELAY_MS;
  const minVisibleMs = options.minVisibleMs ?? DEFAULT_MIN_VISIBLE_MS;

  const startsVisible = active && showDelayMs <= 0;
  const [visible, setVisible] = useState(startsVisible);
  const shownAtRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearShowTimer = () => {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    };

    const clearHideTimer = () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    if (active) {
      clearHideTimer();

      if (visible) {
        if (shownAtRef.current === null) {
          shownAtRef.current = Date.now();
        }
        return undefined;
      }

      clearShowTimer();
      showTimerRef.current = window.setTimeout(() => {
        shownAtRef.current = Date.now();
        setVisible(true);
        showTimerRef.current = null;
      }, Math.max(0, showDelayMs));

      return () => {
        clearShowTimer();
      };
    }

    clearShowTimer();

    if (!visible) {
      shownAtRef.current = null;
      return undefined;
    }

    const shownAt = shownAtRef.current ?? Date.now();
    const elapsedMs = Date.now() - shownAt;
    const remainingMs = Math.max(0, minVisibleMs - elapsedMs);

    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      shownAtRef.current = null;
      hideTimerRef.current = null;
    }, remainingMs);

    return () => {
      clearHideTimer();
    };
  }, [active, visible, minVisibleMs, showDelayMs]);

  return visible;
}
