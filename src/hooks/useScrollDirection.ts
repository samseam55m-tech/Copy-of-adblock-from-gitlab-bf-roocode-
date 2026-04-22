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
 *
 * Uses a capture-phase listener on `document` so it works with any
 * nested scroll container (scroll events don't bubble but are visible
 * during capture).
 *
 * @param threshold minimum delta in px before a direction change registers (default 5)
 */
export function useScrollDirection(threshold = 5): { barsVisible: boolean } {
  const [barsVisible, setBarsVisible] = useState(true);
  const scrollTopMap = useRef(new WeakMap<EventTarget, number>());
  const ticking = useRef(false);

  const handleScroll = useCallback(
    (e: Event) => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const target = e.target;
        if (!target || !(target instanceof HTMLElement)) {
          ticking.current = false;
          return;
        }

        const currentScrollTop = target.scrollTop;
        const lastScrollTop = scrollTopMap.current.get(target) ?? currentScrollTop;
        const delta = currentScrollTop - lastScrollTop;

        // Always show bars when at the very top
        if (currentScrollTop <= 0) {
          setBarsVisible(true);
          scrollTopMap.current.set(target, currentScrollTop);
          ticking.current = false;
          return;
        }

        if (Math.abs(delta) >= threshold) {
          if (delta > 0) {
            // Scrolling down -> hide
            setBarsVisible(false);
          } else {
            // Scrolling up -> show
            setBarsVisible(true);
          }
          scrollTopMap.current.set(target, currentScrollTop);
        }

        ticking.current = false;
      });
    },
    [threshold],
  );

  useEffect(() => {
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions);
    };
  }, [handleScroll]);

  return { barsVisible };
}
