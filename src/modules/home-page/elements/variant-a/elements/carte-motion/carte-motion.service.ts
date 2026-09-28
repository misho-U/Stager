'use client';

import type { RefObject } from 'react';

import { CARTE_MOTION as M } from '@/modules/home-page/elements/variant-a/variant-a.constants';
import { gsap, ScrollTrigger } from '@/shared/lib/motion/gsap';
import { cappedStagger, splitReveal } from '@/shared/lib/motion/split';
import { useMotion } from '@/shared/lib/motion/use-motion';

/**
 * Carte's motion, all of it:
 *
 * - On load the border round the first screen draws out from the middle of
 *   each side, the ornament opens, and the headline inks into the paper line
 *   by line: out of focus and loosely spaced, settling sharp and set.
 * - Further down, each course rises softly into place as it scrolls in,
 *   hairlines draw out from their centre, and a wine-list leader runs from
 *   the name to the year.
 *
 * Markup opts in with data attributes, so the page stays server-rendered and
 * this is the only client code the design has: `data-enter` (on load),
 * `data-reveal` (on scroll), `data-frame-line`, `data-rule`, `data-leader`,
 * `data-ink` (the headline).
 */
export function useCarteMotion(scope: RefObject<HTMLElement | null>) {
  useMotion(scope, ({ motion }, root) => {
    if (!motion) return;
    const all = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];

    const load = gsap.timeline({ defaults: { overwrite: 'auto' } });

    // The frame: every line from zero length at its own midpoint.
    const lines = all('[data-frame-line]');
    const outer = lines.filter((line) => !line.hasAttribute('data-inner'));
    const inner = lines.filter((line) => line.hasAttribute('data-inner'));
    const drawFrom = (line: HTMLElement) =>
      line.dataset.frameLine === 'x' ? { scaleX: 0 } : { scaleY: 0 };
    for (const [group, delay] of [
      [outer, 0],
      [inner, M.frame.innerDelay],
    ] as const) {
      for (const line of group) {
        load.from(
          line,
          { ...drawFrom(line), duration: M.frame.duration, ease: M.frame.ease },
          delay,
        );
      }
    }

    // The corners, once the lines have nearly met them.
    load.from(
      all('[data-frame-corner]'),
      { scale: 0, duration: 0.6, ease: 'back.out(3)', stagger: 0.06 },
      M.frame.duration * 0.8,
    );

    // The headline: split into lines, each one inked in after the last.
    const headline = root.querySelector<HTMLElement>('[data-ink]');
    const split = headline
      ? splitReveal(headline, {
          type: 'lines',
          animate: (self) =>
            gsap.from(self.lines, {
              opacity: 0,
              filter: `blur(${M.ink.blur}px)`,
              letterSpacing: M.ink.spread,
              yPercent: 12,
              duration: M.ink.duration,
              ease: M.ink.ease,
              stagger: cappedStagger(M.ink.lineStep),
              delay: 0.25,
              // The spacing is only borrowed: hand the line back to the stylesheet.
              clearProps: 'filter,letterSpacing',
            }),
        })
      : null;

    // Everything else that enters on load: ornament, subheading, action, header.
    load.from(
      all('[data-enter]').filter((element) => element !== headline),
      {
        opacity: 0,
        y: 12,
        duration: M.follow.duration,
        ease: M.follow.ease,
        stagger: M.follow.step,
      },
      M.follow.delay,
    );
    if (headline) gsap.set(headline, { opacity: 1 });

    // Courses rising into view, a few at a time as they arrive together.
    const reveals = all('[data-reveal]');
    gsap.set(reveals, { opacity: 0, y: M.course.rise, filter: `blur(${M.course.blur}px)` });
    ScrollTrigger.batch(reveals, {
      start: M.course.start,
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: M.course.duration,
          ease: M.course.ease,
          stagger: M.course.step,
          clearProps: 'filter',
        }),
    });

    // Hairlines from their centre, leaders from the name toward the year.
    for (const line of all('[data-rule], [data-leader]')) {
      gsap.from(line, {
        scaleX: 0,
        duration: M.rule.duration,
        ease: M.rule.ease,
        scrollTrigger: { trigger: line, start: M.rule.start, once: true },
      });
    }

    return () => split?.revert();
  });
}
