import { useState, useEffect, useRef } from 'react';

export type ScrollDirection = 'up' | 'down' | 'none';

/**
 * Tracks scroll direction from ANY scrollable element on the page.
 * Uses a capture-phase listener on document to detect scroll events
 * from nested scroll containers (scroll events don't bubble, but
 * they can be intercepted in the capture phase).
 *
 * Returns 'down' on any downward motion, 'up' on upward motion,
 * and 'none' when at rest or at top.
 *
 * @param threshold - minimum delta (px) before direction changes (default: 3)
 */
export function useScrollDirection(threshold = 3): {
  scrollDirection: ScrollDirection;
} {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none');
  const scrollTopMap = useRef(new WeakMap<EventTarget, number>());
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = (e: Event) => {
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

        if (Math.abs(delta) >= threshold) {
          setScrollDirection(delta > 0 ? 'down' : 'up');
          scrollTopMap.current.set(target, currentScrollTop);
        }

        // Reset to 'none' if at top
        if (currentScrollTop <= 0) {
          setScrollDirection('none');
        }

        ticking.current = false;
      });
    };

    // Capture phase so we intercept scroll from any nested element
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions);
    };
  }, [threshold]);

  return { scrollDirection };
}
