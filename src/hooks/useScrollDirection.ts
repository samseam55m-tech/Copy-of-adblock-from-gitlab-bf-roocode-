import { useState, useEffect, useRef, useCallback } from 'react';

export type ScrollDirection = 'up' | 'down' | 'none';

/**
 * Tracks scroll direction on a given scrollable element (or window).
 * Returns 'up', 'down', or 'none' based on the user's scroll delta.
 *
 * @param threshold - minimum delta (px) before direction changes (default: 10)
 */
export function useScrollDirection(threshold = 10): {
  scrollDirection: ScrollDirection;
  scrollRef: (node: HTMLElement | null) => void;
} {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none');
  const lastScrollTop = useRef(0);
  const elementRef = useRef<HTMLElement | null>(null);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;

    requestAnimationFrame(() => {
      const el = elementRef.current;
      const currentScrollTop = el ? el.scrollTop : 0;
      const delta = currentScrollTop - lastScrollTop.current;

      if (Math.abs(delta) >= threshold) {
        setScrollDirection(delta > 0 ? 'down' : 'up');
        lastScrollTop.current = currentScrollTop;
      }

      // Reset to 'none' if at top
      if (currentScrollTop <= 0) {
        setScrollDirection('none');
      }

      ticking.current = false;
    });
  }, [threshold]);

  const scrollRef = useCallback(
    (node: HTMLElement | null) => {
      // Detach from previous element
      if (elementRef.current) {
        elementRef.current.removeEventListener('scroll', handleScroll);
      }

      elementRef.current = node;

      // Attach to new element
      if (node) {
        node.addEventListener('scroll', handleScroll, { passive: true });
        lastScrollTop.current = node.scrollTop;
      }
    },
    [handleScroll],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  return { scrollDirection, scrollRef };
}
