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

export type MotionConditions = Record<keyof typeof MOTION_QUERIES, boolean> & {
  /**
   * Whether the hero may still play its entrance: only on arrival, and only
   * if this script came in time (see ENTRANCE_DEADLINE_MS). Otherwise the
   * hero is simply shown, and never hidden again.
   */
  entrance: boolean;
};

/**
 * How long the hero may wait, hidden, for its entrance. Below the 1s at which
 * the CSS fallback starts revealing it (globals.css), so a script that comes
 * later never hides again what the fallback has begun to show. On a slow
 * phone the script can take seconds, and the text a visitor came for (the
 * page's Largest Contentful Paint) waited for it.
 */
const ENTRANCE_DEADLINE_MS = 900;

/**
 * Each design's decision, made once and kept with its wrapper. Whichever of
 * its motion leaves runs first decides, before any of them hands over (React
 * runs a child's effects before its parent's, and the hand-over stops the
 * clock below); every leaf, and every later run of a setup (React's
 * development double run, a resize across a breakpoint), reads the same one.
 */
const entranceDecided = new WeakMap<HTMLElement, boolean>();

/**
 * How long the design's hero has been hidden, waiting for this script: the
 * clock of the CSS fallback that would reveal it, which starts when the
 * element is first drawn, on a first load and a client-side navigation alike.
 */
function hiddenForMs(root: HTMLElement): number {
  const fallback = root
    .querySelector('[data-enter]')
    ?.getAnimations()
    .find(
      (animation) =>
        animation instanceof CSSAnimation && animation.animationName === 'motion-fallback-in',
    );
  const time = fallback?.currentTime;
  return typeof time === 'number' ? time : 0;
}

/** Before paint in the browser, so a starting state never flashes; a no-op on the server. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Runs a design's GSAP setup inside `scope`, scoped and cleaned up.
 *
 * - Every tween, ScrollTrigger and SplitText created in `setup` is recorded in
 *   a GSAP context and reverted on unmount, so a locale switch or a page
 *   change leaves nothing pinned or hidden behind.
 * - `setup` receives the scope element as `root`; query inside it
 *   (`root.querySelectorAll('[data-enter]')`), never the whole document.
 * - The design hands itself over from the CSS starting state (see
 *   `[data-enter]` in globals.css) by setting `data-motion="on"` on its
 *   `[data-site]` wrapper, but only when motion is allowed: under
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

    const design = element.closest<HTMLElement>('[data-site]') ?? element;
    let entrance = entranceDecided.get(design);
    if (entrance === undefined) {
      entrance = hiddenForMs(design) < ENTRANCE_DEADLINE_MS;
      entranceDecided.set(design, entrance);
    }

    const media = gsap.matchMedia(element);
    media.add(MOTION_QUERIES, (context) => {
      const conditions = { ...(context.conditions as MotionConditions), entrance };
      const cleanup = setup(conditions, element);
      if (conditions.motion) {
        element.closest('[data-site]')?.setAttribute('data-motion', 'on');
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
