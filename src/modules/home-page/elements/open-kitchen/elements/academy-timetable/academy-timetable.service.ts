'use client';

import { Flip } from 'gsap/Flip';
import { useLayoutEffect, useRef, useState } from 'react';

import { OK_MOTION } from '@/modules/home-page/elements/open-kitchen/open-kitchen.constants';
import { gsap } from '@/shared/lib/motion/gsap';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ALL = 'all';

/**
 * The Academy's filter. Choosing a category records where every row is,
 * lets React hide the others, then animates the rest from where they were
 * (GSAP Flip): rows that stay slide up into the gaps, leaving ones fade out,
 * returning ones fade in. Under reduced motion the list simply changes.
 */
export function useCourseFilter() {
  const [filter, setFilter] = useState<string>(ALL);
  const list = useRef<HTMLUListElement>(null);
  const before = useRef<{ state: Flip.FlipState; height: number } | null>(null);

  const choose = (next: string) => {
    if (next === filter) return;
    const element = list.current;
    if (element && !reducedMotion()) {
      gsap.registerPlugin(Flip);
      before.current = {
        state: Flip.getState(element.querySelectorAll('[data-course-row]')),
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
    const { duration, ease } = OK_MOTION.flip;
    // The rows move out of the flow while they travel, so the list keeps its
    // own height in step with them instead of snapping to the new one.
    const height = gsap.fromTo(
      element,
      { height: recorded.height },
      { height: element.offsetHeight, duration, ease, clearProps: 'height' },
    );
    const rows = Flip.from(recorded.state, {
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
      rows.progress(1);
      height.progress(1);
    };
  }, [filter]);

  return { filter, choose, list };
}
