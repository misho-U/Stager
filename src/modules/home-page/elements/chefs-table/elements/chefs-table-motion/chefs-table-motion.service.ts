'use client';

import type { RefObject } from 'react';

import { CT_MOTION as M } from '@/modules/home-page/elements/chefs-table/chefs-table.constants';
import { gsap, ScrollTrigger } from '@/shared/lib/motion/gsap';
import { magnetic } from '@/shared/lib/motion/pointer';
import { cappedStagger, splitReveal } from '@/shared/lib/motion/split';
import { useMotion } from '@/shared/lib/motion/use-motion';
import { useSmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.service';

type Cleanup = () => void;

/**
 * The site's motion. Every effect below runs only with motion allowed, and
 * none hides content for good: without them the page is the same content,
 * one section after another.
 */
export function useChefsTableMotion(scope: RefObject<HTMLElement | null>) {
  useSmoothScroll({ lerp: M.lerp });

  useMotion(scope, ({ motion, entrance, finePointer }, root) => {
    if (!motion) return;
    const cleanups: Cleanup[] = [];

    if (entrance) assembleHero(root);
    if (finePointer) cleanups.push(followLight(root));
    cleanups.push(countUp(root, entrance));
    readAlong(root);
    cleanups.push(drawJourney(root));
    reveal(root);
    openIris(root);
    riseFooter(root);
    if (finePointer) {
      cleanups.push(spotlights(root));
      const pulled = [
        ...root.querySelectorAll<HTMLElement>('[data-magnetic]'),
        ...root.querySelectorAll<HTMLElement>('[data-testid="inquiry-form"] button[type="submit"]'),
      ];
      for (const element of pulled) cleanups.push(magnetic(element, 0.25));
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  });
}

/** The hero's parts that arrive after the headline, in order. */
function arrivals(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>('[data-enter]')].filter(
    (element) => !element.hasAttribute('data-ct-headline'),
  );
}

/** The headline's lines rise into place, then the rest of the hero arrives. */
function assembleHero(root: HTMLElement) {
  const headline = root.querySelector<HTMLElement>('[data-ct-headline]');
  const arriving = arrivals(root);
  gsap.set(arriving, { opacity: 0, y: 20 });
  if (headline) {
    gsap.set(headline, { opacity: 1 });
    splitReveal(headline, {
      type: 'lines',
      mask: 'lines',
      animate: (split) =>
        gsap.from(split.lines, {
          yPercent: 105,
          duration: M.assemble.duration,
          ease: M.assemble.ease,
          delay: M.assemble.delay,
          stagger: cappedStagger(M.assemble.stagger),
        }),
    });
  }
  gsap.to(arriving, {
    opacity: 1,
    y: 0,
    duration: M.enter.duration,
    ease: M.enter.ease,
    delay: M.enter.delay,
    stagger: M.enter.stagger,
    clearProps: 'transform',
  });
}

/** The hero's pool of light drifts after the pointer. */
function followLight(root: HTMLElement): Cleanup {
  const stage = root.querySelector<HTMLElement>('[data-ct-light]');
  if (!stage) return () => {};
  const at = { x: stage.clientWidth * 0.7, y: stage.clientHeight * 0.3 };
  const paint = () => {
    stage.style.setProperty('--x', `${at.x}px`);
    stage.style.setProperty('--y', `${at.y}px`);
  };
  const toX = gsap.quickTo(at, 'x', { ...M.light, onUpdate: paint });
  const toY = gsap.quickTo(at, 'y', { ...M.light, onUpdate: paint });
  const onMove = (event: PointerEvent) => {
    const box = stage.getBoundingClientRect();
    toX(event.clientX - box.left);
    toY(event.clientY - box.top);
  };
  stage.addEventListener('pointermove', onMove);
  return () => stage.removeEventListener('pointermove', onMove);
}

/**
 * Each figure counts up to its number as it comes into view. The number is
 * in the page from the start (and the full value is what a screen reader
 * reads, see StatBand); its box keeps the final width, so nothing beside it
 * moves while the digits change. A figure already on screen when the
 * entrance was skipped (the script came late) has been read, and stays.
 * The digits change in React's own text node (its value, not the node), so
 * a re-render still finds the node it made.
 */
function countUp(root: HTMLElement, entrance: boolean): Cleanup {
  const restores: Cleanup[] = [];
  for (const figure of root.querySelectorAll<HTMLElement>('[data-count-to]')) {
    const to = Number(figure.dataset.countTo);
    const digits = figure.firstChild;
    if (!Number.isSafeInteger(to) || to <= 0 || !(digits instanceof Text)) continue;
    const box = figure.getBoundingClientRect();
    if (!entrance && box.top < window.innerHeight) continue;
    const grouped = figure.hasAttribute('data-grouped');
    const text = (value: number) =>
      grouped ? Math.round(value).toLocaleString('en-US') : String(Math.round(value));
    figure.style.minWidth = `${box.width}px`;
    digits.nodeValue = text(0);
    // Stopped half-way (the motion reverted on a resize), it shows its number.
    restores.push(() => {
      digits.nodeValue = text(to);
      figure.style.removeProperty('min-width');
    });
    const counter = { value: 0 };
    gsap.to(counter, {
      value: to,
      duration: M.count.duration,
      ease: M.count.ease,
      delay: M.count.delay,
      onUpdate: () => {
        digits.nodeValue = text(counter.value);
      },
      scrollTrigger: { trigger: figure, start: 'top 95%', once: true },
    });
  }
  return () => {
    for (const restore of restores) restore();
  };
}

/** The intro lights up word by word as it is read. */
function readAlong(root: HTMLElement) {
  for (const text of root.querySelectorAll<HTMLElement>('[data-read-along]')) {
    splitReveal(text, {
      type: 'words',
      animate: (split) =>
        gsap.fromTo(
          split.words,
          { opacity: M.readAlong.from },
          {
            opacity: 1,
            ease: 'none',
            stagger: 0.1,
            scrollTrigger: { trigger: text, start: 'top 78%', end: 'bottom 45%', scrub: true },
          },
        ),
    });
  }
}

/**
 * The services' journey: the line fills from stage to stage as the section
 * is read, and each stage it reaches is marked.
 */
function drawJourney(root: HTMLElement): Cleanup {
  const journey = root.querySelector<HTMLElement>('[data-journey]');
  const steps = journey ? [...journey.querySelectorAll<HTMLElement>('[data-journey-step]')] : [];
  if (!journey || steps.length < 2) return () => {};
  const span = steps.length - 1;
  const draw = (progress: number) => {
    const at = progress * span;
    steps.forEach((step, index) => {
      step.style.setProperty('--fill', String(gsap.utils.clamp(0, 1, at - index)));
      step.toggleAttribute('data-reached', at >= index - 0.001);
    });
  };
  const trigger = ScrollTrigger.create({
    trigger: journey,
    ...M.journey,
    onUpdate: (self) => draw(self.progress),
    onRefresh: (self) => draw(self.progress),
  });
  return () => {
    trigger.kill();
    for (const step of steps) {
      step.style.removeProperty('--fill');
      step.removeAttribute('data-reached');
    }
  };
}

/** Sections and cards rise into view, once; so do the paragraphs and list
 *  items of text written in the dashboard ([data-reveal-items]). */
function reveal(root: HTMLElement) {
  const items = gsap.utils.toArray<HTMLElement>(
    root.querySelectorAll('[data-reveal], [data-reveal-items] :is(p, li)'),
  );
  gsap.set(items, { opacity: 0, y: M.reveal.y });
  ScrollTrigger.batch(items, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: M.reveal.duration,
        ease: M.reveal.ease,
        stagger: M.reveal.stagger,
        overwrite: true,
        clearProps: 'transform',
      }),
  });
}

/** The finale opens like an iris: a circle of teal growing from the middle. */
function openIris(root: HTMLElement) {
  const finale = root.querySelector<HTMLElement>('[data-iris]');
  if (!finale) return;
  gsap.fromTo(
    finale,
    { clipPath: 'circle(8% at 50% 40%)' },
    {
      clipPath: 'circle(150% at 50% 40%)',
      ease: 'none',
      scrollTrigger: { trigger: finale, start: 'top 95%', end: 'top 20%', scrub: true },
    },
  );
}

/** The footer's wordmark rises letter by letter as the page ends. */
function riseFooter(root: HTMLElement) {
  const mark = root.querySelector<HTMLElement>('[data-ct-footer-mark]');
  if (!mark) return;
  splitReveal(mark, {
    type: 'chars',
    mask: 'chars',
    animate: (split) =>
      gsap.from(split.chars, {
        yPercent: 100,
        ease: 'none',
        stagger: 0.05,
        scrollTrigger: { trigger: mark, start: 'top bottom', end: 'bottom bottom', scrub: true },
      }),
  });
}

/** Cards light up under the pointer: a pool of light that follows it inside the card. */
function spotlights(root: HTMLElement): Cleanup {
  const onMove = (event: PointerEvent) => {
    const card = (event.target as Element | null)?.closest<HTMLElement>('.ct-spot');
    if (!card) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--x', `${event.clientX - box.left}px`);
    card.style.setProperty('--y', `${event.clientY - box.top}px`);
  };
  root.addEventListener('pointermove', onMove, { passive: true });
  return () => root.removeEventListener('pointermove', onMove);
}
