'use client';

import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import type { RefObject } from 'react';

import { setupCrosshair } from '@/modules/home-page/elements/variant-b/elements/crosshair/crosshair.service';
import { BLUEPRINT_MOTION as M } from '@/modules/home-page/elements/variant-b/variant-b.constants';
import { gsap, ScrollTrigger } from '@/shared/lib/motion/gsap';
import { cappedStagger, splitReveal } from '@/shared/lib/motion/split';
import { useMotion } from '@/shared/lib/motion/use-motion';

/**
 * Shortens the headline's dimension line to the headline's longest line: a
 * wrapped heading's box is as wide as its column, not as its text. Runs with
 * or without motion, and again whenever the headline re-wraps.
 */
function fitDimension(root: HTMLElement): () => void {
  const heading = root.querySelector<HTMLElement>('[data-plot]');
  const line = root.querySelector<HTMLElement>('[data-fits-headline]');
  if (!heading || !line) return () => {};
  const measure = () => {
    const range = document.createRange();
    range.selectNodeContents(heading);
    const rights = [...range.getClientRects()].map((rect) => rect.right);
    if (rights.length === 0) return;
    line.style.width = `${Math.max(...rights) - heading.getBoundingClientRect().left}px`;
  };
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(heading);
  return () => observer.disconnect();
}

/** A sheet's four sides traced clockwise from the top-left corner, one after another. */
function traceFrame(sheet: Element, timeline: gsap.core.Timeline, at: number) {
  const side = (name: string) => sheet.querySelector(`[data-edge="${name}"]`);
  const step = { duration: M.frame.side, ease: M.frame.ease };
  timeline
    .from(side('top'), { ...step, scaleX: 0, transformOrigin: 'left center' }, at)
    .from(side('right'), { ...step, scaleY: 0, transformOrigin: 'center top' })
    .from(side('bottom'), { ...step, scaleX: 0, transformOrigin: 'right center' })
    .from(side('left'), { ...step, scaleY: 0, transformOrigin: 'center bottom' });
}

/** Zone letters and sheet numbers settling out of a scramble. */
function scrambleZones(sheet: Element, timeline: gsap.core.Timeline, at: number) {
  sheet.querySelectorAll<HTMLElement>('[data-zone]').forEach((zone, index) => {
    timeline.to(
      zone,
      {
        duration: M.scramble.duration,
        scrambleText: { text: zone.textContent ?? '', chars: M.scramble.chars, speed: 0.6 },
      },
      at + index * 0.04,
    );
  });
}

/**
 * Blueprint's motion:
 *
 * - On load the graph paper appears, the first sheet's border is traced
 *   clockwise, construction lines shoot across it, the zone markers settle
 *   out of a scramble, the headline is plotted line by line, the callout's
 *   leader is drawn to its note, the stamp is pressed and the title block
 *   fills in.
 * - Scrolling draws each following sheet's border and every wall and door of
 *   the floor plan, tied to the scroll; the blueprint prints from the top.
 * - With a mouse, the precision crosshair takes over the pointer.
 */
export function useBlueprintMotion(
  scope: RefObject<HTMLElement | null>,
  crosshair: RefObject<HTMLElement | null>,
) {
  useMotion(scope, ({ motion, finePointer }, root) => {
    const stopFitting = fitDimension(root);
    if (!motion) return stopFitting;
    gsap.registerPlugin(DrawSVGPlugin, ScrambleTextPlugin);
    const all = (selector: string, within: ParentNode = root) => [
      ...within.querySelectorAll<HTMLElement>(selector),
    ];

    const [firstSheet, ...laterSheets] = all('[data-sheet]');
    const load = gsap.timeline();

    load.from(all('[data-grid]'), { opacity: 0, duration: M.grid.duration, ease: M.grid.ease }, 0);
    load.from(all('header[data-enter]'), { opacity: 0, y: -8, duration: 0.6 }, 0.1);

    if (firstSheet) {
      traceFrame(firstSheet, load, 0.2);
      scrambleZones(firstSheet, load, 0.5);
      load.from(
        all('[data-construction="x"]', firstSheet),
        { scaleX: 0, transformOrigin: 'left center', ...M.construction },
        0.35,
      );
      load.from(
        all('[data-construction="y"]', firstSheet),
        { scaleY: 0, transformOrigin: 'center top', ...M.construction },
        0.5,
      );
    }

    // The headline, plotted: each line uncovered left to right, as a pen plotter draws.
    const headline = root.querySelector<HTMLElement>('[data-plot]');
    const split = headline
      ? splitReveal(headline, {
          type: 'lines',
          animate: (self) =>
            gsap.fromTo(
              self.lines,
              { clipPath: 'inset(-20% 100% -20% 0%)' },
              {
                clipPath: 'inset(-20% 0% -20% 0%)',
                duration: M.plot.duration,
                ease: M.plot.ease,
                stagger: cappedStagger(M.plot.lineStep),
                delay: 0.8,
                clearProps: 'clipPath',
              },
            ),
        })
      : null;
    if (headline) gsap.set(headline, { opacity: 1 });

    load.from(
      all('[data-dimension]', firstSheet ?? root).slice(0, 1),
      { scaleX: 0, duration: 0.8, ease: 'power3.inOut' },
      1.3,
    );
    load
      .from(all('[data-leader-dot]'), { scale: 0, duration: 0.3, ease: 'back.out(3)' }, 1.5)
      .from(all('[data-leader="y"]'), { scaleY: 0, duration: 0.35, ease: 'power2.in' })
      .from(all('[data-leader="x"]'), { scaleX: 0, duration: 0.3, ease: 'power2.out' })
      .from(all('[data-callout] [data-enter]'), { opacity: 0, x: -8, duration: 0.5 });
    load.from(
      all('[data-stamp]'),
      { opacity: 0, scale: 1.25, duration: M.stamp.duration, ease: M.stamp.ease },
      2.05,
    );
    load.from(
      all('[data-title-block] [data-cell]'),
      { opacity: 0, duration: 0.35, stagger: 0.08 },
      2.2,
    );

    // Each later sheet's border, traced as it scrolls into view.
    for (const sheet of laterSheets) {
      const trace = gsap.timeline({
        scrollTrigger: { trigger: sheet, start: 'top 88%', end: 'top 30%', scrub: 0.6 },
      });
      traceFrame(sheet, trace, 0);
      const zones = gsap.timeline({
        scrollTrigger: { trigger: sheet, start: 'top 80%', once: true },
      });
      scrambleZones(sheet, zones, 0);
    }

    // The floor plan: walls first, then the doors, drawn with the scroll.
    for (const plan of all('[data-plan]')) {
      const draw = gsap.timeline({
        scrollTrigger: { trigger: plan, start: 'top 88%', end: 'center 72%', scrub: 0.6 },
      });
      draw.from(all('[data-wall="x"]', plan), {
        scaleX: 0,
        transformOrigin: 'left center',
        stagger: 0.05,
        ease: 'none',
      });
      draw.from(
        all('[data-wall="y"]', plan),
        { scaleY: 0, transformOrigin: 'center top', stagger: 0.05, ease: 'none' },
        0.1,
      );
      draw.from(all('[data-door]', plan), { drawSVG: '0%', stagger: 0.04, ease: 'none' });
    }

    // Text, notes and register entries rising into place.
    const reveals = all('[data-reveal]');
    gsap.set(reveals, { opacity: 0, y: 18 });
    ScrollTrigger.batch(reveals, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }),
    });

    for (const mark of all('[data-mark]')) {
      gsap.from(mark, {
        scale: 0,
        duration: 0.5,
        ease: 'power2.out',
        scrollTrigger: { trigger: mark, start: 'top 92%', once: true },
      });
    }

    for (const measure of all('[data-measure]')) {
      gsap.from(measure, {
        scaleY: 0,
        transformOrigin: 'center top',
        ease: 'none',
        scrollTrigger: { trigger: measure, start: 'top 75%', end: 'bottom 65%', scrub: 0.6 },
      });
    }

    // The blueprint prints from the top down as it arrives.
    for (const print of all('[data-blueprint]')) {
      gsap.fromTo(
        print,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          ease: 'none',
          scrollTrigger: { trigger: print, start: 'top 90%', end: 'top 35%', scrub: 0.5 },
        },
      );
    }

    const overlay = crosshair.current?.querySelector<HTMLElement>('[data-crosshair]');
    const stopCrosshair = finePointer && overlay ? setupCrosshair(root, overlay) : null;

    return () => {
      split?.revert();
      stopCrosshair?.();
      stopFitting();
    };
  });
}
