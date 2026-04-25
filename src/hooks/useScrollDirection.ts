import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Tracks scroll direction from ANY scrollable element on the page and
 * returns a `barsVisible` flag suitable for hiding/showing UI chrome.
 *
 * Behaviour:
 *  - Bars start visible.
 *  - Any downward scroll hides them.
 *  - They stay hidden while the user is idle (no "reset to visible on stop").
 *  - A small upward scroll (>= threshold) brings them back.
 *  - If the scroll container is at the very top, bars are always visible.
 *  - Near the very bottom of the scroll container, direction changes are
 *    ignored to prevent jitter from overscroll bounce.
 *  - State changes are debounced to prevent rapid toggling.
 *
 * Uses a capture-phase listener on `document` so it works with any
 * nested scroll container (scroll events don't bubble but are visible
 * during capture).
 *
 * @param threshold minimum delta in px before a direction change registers (default 8)
 */
export function useScrollDirection(threshold = 8): { barsVisible: boolean } {
  const [barsVisible, setBarsVisible] = useState(true);
  const scrollTopMap = useRef(new WeakMap<EventTarget, number>());
  const lastToggleTime = useRef(0);
  const pendingDirection = useRef<boolean | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Minimum ms between state changes to prevent rapid toggling / jitter
  const DEBOUNCE_MS = 100;
  // How close to the bottom (px) we ignore direction changes
  const BOTTOM_DEAD_ZONE = 20;

  const handleScroll = useCallback(
    (e: Event) => {
      const target = e.target;
      if (!target || !(target instanceof HTMLElement)) return;

      const currentScrollTop = target.scrollTop;
      const lastScrollTop = scrollTopMap.current.get(target) ?? currentScrollTop;
      const delta = currentScrollTop - lastScrollTop;

      // Always show bars when at the very top
      if (currentScrollTop <= 0) {
        scrollTopMap.current.set(target, currentScrollTop);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        pendingDirection.current = null;
        setBarsVisible(true);
        lastToggleTime.current = Date.now();
        return;
      }

      // Dead zone near the bottom — ignore fluctuations from overscroll bounce
      const maxScroll = target.scrollHeight - target.clientHeight;
      if (maxScroll > 0 && currentScrollTop >= maxScroll - BOTTOM_DEAD_ZONE) {
        scrollTopMap.current.set(target, currentScrollTop);
        return; // Do nothing, keep current state
      }

      if (Math.abs(delta) < threshold) return;

      const newVisible = delta < 0; // up = show, down = hide
      scrollTopMap.current.set(target, currentScrollTop);

      // Debounce: if we recently toggled, queue the change
      const now = Date.now();
      if (now - lastToggleTime.current < DEBOUNCE_MS) {
        pendingDirection.current = newVisible;
        if (!debounceTimer.current) {
          debounceTimer.current = setTimeout(() => {
            debounceTimer.current = null;
            if (pendingDirection.current !== null) {
              setBarsVisible(pendingDirection.current);
              lastToggleTime.current = Date.now();
              pendingDirection.current = null;
            }
          }, DEBOUNCE_MS);
        }
        return;
      }

      pendingDirection.current = null;
      setBarsVisible(newVisible);
      lastToggleTime.current = now;
    },
    [threshold],
  );

  useEffect(() => {
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [handleScroll]);

  return { barsVisible };
}
