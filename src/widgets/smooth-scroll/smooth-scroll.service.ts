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
 *
 * `focus`: for a jump the visitor asked for (a menu link), the keyboard moves
 * there too (see focusArrival).
 */
export function glideTo(target: HTMLElement | number, { focus = false } = {}) {
  const lenis = current;
  if (lenis) {
    sync(lenis);
    lenis.scrollTo(target);
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target });
  } else {
    target.scrollIntoView({ block: 'start' });
  }
  if (focus && typeof target !== 'number') focusArrival(target);
}

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

/**
 * Moves keyboard focus to where an in-page jump lands, without scrolling (the
 * glide does that). The browser's own jump moves the reading position with
 * it; Lenis cancels that jump to glide instead, and the next Tab used to go
 * on from the link at the top of the page, scrolling back up to it. A section
 * is made focusable by script only (tabindex -1), so Tab never stops on it.
 */
export function focusArrival(target: HTMLElement) {
  if (!target.matches(FOCUSABLE)) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

/** The element an in-page link points at, or null for a link elsewhere. */
function inPageTarget(link: HTMLAnchorElement): HTMLElement | null {
  const url = new URL(link.href, window.location.href);
  const here = window.location;
  if (url.origin !== here.origin || url.pathname !== here.pathname) return null;
  if (url.search !== here.search || url.hash.length < 2) return null;
  return document.getElementById(decodeURIComponent(url.hash.slice(1)));
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
    // first, in the capture phase, so it measures from where the page is, and
    // takes the keyboard along to where the link leads.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
      if (!link) return;
      sync(lenis);
      const target = inPageTarget(link);
      if (target) focusArrival(target);
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
