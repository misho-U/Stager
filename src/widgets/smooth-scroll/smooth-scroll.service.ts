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
 * Brings Lenis up to the page's real scroll position before it measures.
 *
 * Lenis places a target at its top plus Lenis's own idea of the scroll, which
 * follows the page through scroll events, a frame late. A jump asked for in
 * the same frame as a native scroll (a tap right after the page moved, focus
 * scrolling a link into view) was measured from the old position and stopped
 * short by however far the page had moved. Mid-glide, Lenis is the one moving
 * the page, and is right.
 */
function sync(lenis: Lenis) {
  // An immediate jump to where the page already is: moves nothing, and leaves
  // Lenis measuring from there.
  if (lenis.isScrolling !== 'smooth') lenis.scrollTo(lenis.actualScroll, { immediate: true });
}

/**
 * Glides to an element or a page position, or jumps there without smooth
 * scrolling. An element lands its `scroll-margin-top` below the top, which
 * each design sets to clear its header: Lenis reads it, as the browser does
 * without Lenis, so no offset is added here (one was, and doubled it).
 */
export function glideTo(target: HTMLElement | number) {
  const lenis = current;
  if (lenis) {
    sync(lenis);
    lenis.scrollTo(target);
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target });
  } else {
    target.scrollIntoView({ block: 'start' });
  }
}

/**
 * Smooth, inertial scrolling for a whole page, driven by GSAP's clock so that
 * pinned and scrubbed scenes read the same scroll position Lenis paints.
 *
 * - Off under reduced motion: the browser's own scrolling, untouched.
 * - `anchors`: in-page links ("Start a Project" → the inquiry form) glide
 *   there too, landing at the target's `scroll-margin-top` (see glideTo).
 * - Touch keeps native scrolling (`syncTouch: false`): a phone's own
 *   momentum is better than any imitation of it.
 */
export function useSmoothScroll({ lerp }: { lerp: number }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    registerMotion();

    const lenis = new Lenis({ lerp, autoRaf: false, syncTouch: false, anchors: true });
    // Lenis hears in-page links on window, as the click bubbles up; this runs
    // first, in the capture phase, so it measures from where the page is.
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('a[href*="#"]')) sync(lenis);
    };
    document.addEventListener('click', onClick, true);
    const onFrame = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(onFrame);
    // Lenis already smooths; GSAP's lag smoothing would add a second, visible catch-up.
    gsap.ticker.lagSmoothing(0);
    current = lenis;

    return () => {
      document.removeEventListener('click', onClick, true);
      gsap.ticker.remove(onFrame);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      if (current === lenis) current = null;
    };
  }, [lerp]);
}
