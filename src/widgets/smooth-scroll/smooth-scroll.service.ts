'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';

import { gsap, registerMotion, ScrollTrigger } from '@/shared/lib/motion/gsap';

/** The page's one Lenis instance while a design that uses it is mounted. */
let current: Lenis | null = null;

/** Lenis, when smooth scrolling is on; null under reduced motion. */
export function getSmoothScroll(): Lenis | null {
  return current;
}

/**
 * Smooth, inertial scrolling for a whole page, driven by GSAP's clock so that
 * pinned and scrubbed scenes read the same scroll position Lenis paints.
 *
 * - Off under reduced motion: the browser's own scrolling, untouched.
 * - `anchors`: in-page links ("Start a Project" → the inquiry form) glide
 *   there too, and land below a sticky header by `anchorOffset`.
 * - Touch keeps native scrolling (`syncTouch: false`): a phone's own
 *   momentum is better than any imitation of it.
 */
export function useSmoothScroll({
  lerp,
  anchorOffset = 0,
}: {
  lerp: number;
  anchorOffset?: number;
}) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    registerMotion();

    const lenis = new Lenis({
      lerp,
      autoRaf: false,
      syncTouch: false,
      anchors: { offset: -anchorOffset },
    });
    const onFrame = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(onFrame);
    // Lenis already smooths; GSAP's lag smoothing would add a second, visible catch-up.
    gsap.ticker.lagSmoothing(0);
    current = lenis;

    return () => {
      gsap.ticker.remove(onFrame);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      if (current === lenis) current = null;
    };
  }, [lerp, anchorOffset]);
}
