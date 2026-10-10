'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A project's photos, one to a frame, side by side in a row that scrolls
 * and snaps: a swipe on a phone, the arrows with a mouse or a keyboard.
 * This tracks which photo is in the frame and moves to the next one.
 */
export function useProjectPhotos(count: number) {
  const track = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const element = track.current;
    if (!element || count < 2) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = element.clientWidth || 1;
        setCurrent(Math.min(count - 1, Math.max(0, Math.round(element.scrollLeft / width))));
      });
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('scroll', onScroll);
    };
  }, [count]);

  /** One photo on (1) or back (-1), round from the last to the first: an
   *  arrow is never disabled, so focus never drops off it. */
  const go = useCallback(
    (step: 1 | -1) => {
      const element = track.current;
      if (!element) return;
      const target = (current + step + count) % count;
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollTo({ left: target * element.clientWidth, behavior: still ? 'auto' : 'smooth' });
    },
    [current, count],
  );

  return { track, current, go };
}
