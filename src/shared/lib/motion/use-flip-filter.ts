'use client';

import { Flip } from 'gsap/Flip';
import { useLayoutEffect, useRef, useState } from 'react';

import { gsap } from '@/shared/lib/motion/gsap';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The filter value that shows everything. */
export const ALL = 'all';

/**
 * A list filtered in place, animated with GSAP Flip.
 *
 * Choosing a value records where every item is, lets React hide the others
 * (mark them with `data-filtered-out`, never `hidden`: Tailwind makes that
 * !important, and a leaving item must stay visible for a moment), then
 * animates from where they were: items that stay move into the gaps, leaving
 * ones fade out, returning ones fade in. Items are found by `itemSelector`
 * inside the element `list` is attached to.
 *
 * Flip takes the items out of the flow while they travel, so the list's own
 * height is tweened alongside, or it would snap shut under them. Under
 * reduced motion the list simply changes.
 */
export function useFlipFilter<T extends HTMLElement>({
  itemSelector,
  duration,
  ease,
}: {
  itemSelector: string;
  duration: number;
  ease: string;
}) {
  const [filter, setFilter] = useState<string>(ALL);
  const list = useRef<T | null>(null);
  const before = useRef<{ state: Flip.FlipState; height: number } | null>(null);

  const choose = (next: string) => {
    if (next === filter) return;
    const element = list.current;
    if (element && !reducedMotion()) {
      gsap.registerPlugin(Flip);
      before.current = {
        state: Flip.getState(element.querySelectorAll(itemSelector)),
        height: element.offsetHeight,
      };
    }
    setFilter(next);
  };

  useLayoutEffect(() => {
    const element = list.current;
    const recorded = before.current;
    before.current = null;
    if (!element || !recorded) return;
    const height = gsap.fromTo(
      element,
      { height: recorded.height },
      { height: element.offsetHeight, duration, ease, clearProps: 'height' },
    );
    const items = Flip.from(recorded.state, {
      duration,
      ease,
      absolute: true,
      onEnter: (entering) =>
        gsap.fromTo(
          entering,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.45, delay: 0.15 },
        ),
      onLeave: (leaving) => gsap.to(leaving, { opacity: 0, duration: 0.2 }),
    });
    return () => {
      items.progress(1);
      height.progress(1);
    };
    // Only a new filter animates; the options are fixed per list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  /** Whether an item in `category` is shown under the current filter. */
  const shows = (category: string) => filter === ALL || category === filter;

  return { filter, choose, list, shows };
}
