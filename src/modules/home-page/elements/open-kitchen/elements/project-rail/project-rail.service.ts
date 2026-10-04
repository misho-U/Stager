'use client';

import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import type { RefObject } from 'react';

import { gsap } from '@/shared/lib/motion/gsap';
import { useMotion } from '@/shared/lib/motion/use-motion';

/**
 * The rail of projects (from round 3's "Pass").
 *
 * - It is a native horizontal scroller, so a finger, a trackpad, the
 *   keyboard (it is focusable) and the prev/next buttons all move it.
 * - With a mouse it can also be grabbed and thrown, with momentum.
 * - A thin line under it shows how much of the rail is in view, and where.
 */
export function useProjectRail(scroller: RefObject<HTMLElement | null>) {
  useMotion(scroller, ({ motion, finePointer }, rail) => {
    const cleanups: Array<() => void> = [];

    if (finePointer) {
      gsap.registerPlugin(Draggable, InertiaPlugin);
      const [drag] = Draggable.create(rail, {
        type: 'scrollLeft',
        inertia: motion,
        edgeResistance: 0.85,
        cursor: 'grab',
        activeCursor: 'grabbing',
        // A click on a card is still a click, not the start of a drag.
        minimumMovement: 6,
      });
      if (drag) cleanups.push(() => drag.kill());
    }

    const bar = rail.closest('[data-rail]')?.querySelector<HTMLElement>('[data-rail-thumb]');
    if (bar) {
      const place = () => {
        const visible = rail.clientWidth / Math.max(rail.scrollWidth, 1);
        const travel = rail.scrollWidth - rail.clientWidth;
        const progress = travel > 0 ? rail.scrollLeft / travel : 0;
        bar.style.width = `${Math.max(visible, 0.08) * 100}%`;
        bar.style.translate = `${progress * (1 / Math.max(visible, 0.08) - 1) * 100}% 0`;
        bar.parentElement?.toggleAttribute('hidden', travel <= 1);
      };
      place();
      rail.addEventListener('scroll', place, { passive: true });
      const observer = new ResizeObserver(place);
      observer.observe(rail);
      cleanups.push(() => {
        rail.removeEventListener('scroll', place);
        observer.disconnect();
      });
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  });
}

/** Moves the rail by one card, gliding unless the visitor asked for less motion. */
export function stepRail(rail: HTMLElement | null, direction: 1 | -1) {
  if (!rail) return;
  const card = rail.querySelector<HTMLElement>('[data-rail-card]');
  const gap = card?.parentElement
    ? parseFloat(getComputedStyle(card.parentElement).columnGap) || 0
    : 0;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  rail.scrollBy({
    left: direction * ((card?.offsetWidth ?? rail.clientWidth) + gap),
    behavior: reduce ? 'auto' : 'smooth',
  });
}
