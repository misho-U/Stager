'use client';

import { useEffect, useLayoutEffect, type DependencyList, type RefObject } from 'react';

import { gsap, registerMotion, ScrollTrigger } from '@/shared/lib/motion/gsap';

/**
 * The media queries every design's motion is written against. Each one is a
 * boolean in `conditions`, and GSAP reverts and re-runs the setup when any of
 * them changes (a window resized across the desktop breakpoint, the OS
 * reduced-motion switch flipped).
 */
export const MOTION_QUERIES = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
  desktop: '(min-width: 1024px)',
  finePointer: '(hover: hover) and (pointer: fine)',
} as const;

export type MotionConditions = Record<keyof typeof MOTION_QUERIES, boolean>;

/** Before paint in the browser, so a starting state never flashes; a no-op on the server. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Runs a design's GSAP setup inside `scope`, scoped and cleaned up.
 *
 * - Every tween, ScrollTrigger and SplitText created in `setup` is recorded in
 *   a GSAP context and reverted on unmount, so a locale switch or a design
 *   switch leaves nothing pinned or hidden behind.
 * - `setup` receives the scope element as `root`; query inside it
 *   (`root.querySelectorAll('[data-enter]')`), never the whole document.
 * - The design hands itself over from the CSS starting state (see
 *   `[data-enter]` in globals.css) by setting `data-motion="on"` on its
 *   `[data-home-variant]` wrapper, but only when motion is allowed: under
 *   reduced motion nothing was ever hidden and nothing animates.
 * - Pinned scenes are re-measured once the web fonts have loaded, since a
 *   heading that re-wraps in the real face changes every height below it,
 *   and again whenever the scope's own height changes (a filtered list).
 */
export function useMotion(
  scope: RefObject<HTMLElement | null>,
  setup: (conditions: MotionConditions, root: HTMLElement) => void | (() => void),
  deps: DependencyList = [],
): void {
  useIsomorphicLayoutEffect(() => {
    const element = scope.current;
    if (!element) return;
    registerMotion();

    const media = gsap.matchMedia(element);
    media.add(MOTION_QUERIES, (context) => {
      const conditions = context.conditions as MotionConditions;
      const cleanup = setup(conditions, element);
      if (conditions.motion) {
        element.closest('[data-home-variant]')?.setAttribute('data-motion', 'on');
      }
      return cleanup;
    });

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    // Content that changes height after load (a filter, an accordion, a
    // panel) moves every trigger below it, and a reveal measured for the old
    // page would never fire. Re-measure once the height settles.
    let lastHeight = element.offsetHeight;
    let settle = 0;
    const resize = new ResizeObserver(() => {
      const height = element.offsetHeight;
      if (Math.abs(height - lastHeight) < 1) return;
      lastHeight = height;
      window.clearTimeout(settle);
      settle = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    resize.observe(element);

    return () => {
      cancelled = true;
      resize.disconnect();
      window.clearTimeout(settle);
      media.revert();
    };
    // `setup` is recreated on every render; the caller's deps decide when it re-runs.
  }, deps);
}
