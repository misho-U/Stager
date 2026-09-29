'use client';

import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import type { RefObject } from 'react';

import { PASS_MOTION as M } from '@/modules/home-page/elements/variant-d/variant-d.constants';
import { gsap } from '@/shared/lib/motion/gsap';
import { useMotion } from '@/shared/lib/motion/use-motion';

/**
 * The rail of service tickets.
 *
 * - It is a native horizontal scroller, so a finger, a trackpad, the
 *   keyboard (it is focusable) and the prev/next keys all move it.
 * - With a mouse it can also be grabbed and thrown, with momentum.
 * - However it moves, the tickets swing on their clips with its speed and
 *   settle when it stops.
 */
export function useTicketRail(scroller: RefObject<HTMLElement | null>) {
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
        // A click on a ticket is still a click, not the start of a drag.
        minimumMovement: 6,
      });
      if (drag) cleanups.push(() => drag.kill());
    }

    if (motion) {
      const tickets = [...rail.querySelectorAll<HTMLElement>('[data-hang]')];
      const swingTo = tickets.map((ticket) =>
        gsap.quickTo(ticket, 'rotation', { duration: 0.35, ease: 'power3.out' }),
      );
      let last = rail.scrollLeft;
      let lastTime = performance.now();
      let settle = 0;
      const onScroll = () => {
        const now = performance.now();
        const speed = ((rail.scrollLeft - last) / Math.max(16, now - lastTime)) * 1000;
        last = rail.scrollLeft;
        lastTime = now;
        // The rail moves one way, the paper hanging from it lags the other.
        const angle = gsap.utils.clamp(-M.swing.max, M.swing.max, -speed / M.swing.divisor);
        for (const swing of swingTo) swing(angle);
        window.clearTimeout(settle);
        settle = window.setTimeout(() => {
          gsap.to(tickets, {
            rotation: 0,
            duration: M.settle.duration,
            ease: M.settle.ease,
            overwrite: 'auto',
          });
        }, 90);
      };
      rail.addEventListener('scroll', onScroll, { passive: true });
      cleanups.push(() => {
        rail.removeEventListener('scroll', onScroll);
        window.clearTimeout(settle);
      });
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  });
}

/** Moves the rail by one ticket, gliding unless the visitor asked for less motion. */
export function stepRail(rail: HTMLElement | null, direction: 1 | -1) {
  if (!rail) return;
  const ticket = rail.querySelector<HTMLElement>('[data-hang]');
  const gap = ticket?.parentElement
    ? parseFloat(getComputedStyle(ticket.parentElement).columnGap) || 0
    : 0;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  rail.scrollBy({
    left: direction * ((ticket?.offsetWidth ?? rail.clientWidth) + gap),
    behavior: reduce ? 'auto' : 'smooth',
  });
}
