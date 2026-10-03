'use client';

import type { RefObject } from 'react';

import { OK_MOTION } from '@/modules/home-page/elements/open-kitchen/open-kitchen.constants';
import { gsap, ScrollTrigger } from '@/shared/lib/motion/gsap';
import { magnetic } from '@/shared/lib/motion/pointer';
import { cappedStagger, splitReveal } from '@/shared/lib/motion/split';
import { useMotion } from '@/shared/lib/motion/use-motion';
import { useSmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.service';

const E = OK_MOTION.enter;
const R = OK_MOTION.reveal;

/**
 * The page's own motion, apart from what its interactive parts do: a calm
 * glide (Lenis), the hero arriving, sections rising into view once, the
 * intro's lines lifting as they are reached, the footer's wordmark rising
 * letter by letter, and buttons that lean toward a mouse.
 *
 * Every effect is behind `motion`: with reduced motion nothing here runs and
 * nothing was ever hidden.
 */
export function useOpenKitchenMotion(scope: RefObject<HTMLElement | null>) {
  useSmoothScroll({ lerp: OK_MOTION.lerp });

  useMotion(scope, ({ motion, finePointer }, root) => {
    if (!motion) return;
    const cleanups: Array<() => void> = [];

    // --- The hero: the headline's lines rise, then the rest follows. ---
    const headline = root.querySelector<HTMLElement>('[data-ok-headline]');
    const arriving = [...root.querySelectorAll<HTMLElement>('[data-enter]')].filter(
      (element) => element !== headline,
    );
    gsap.set(arriving, { opacity: 0, y: 24 });
    if (headline) {
      gsap.set(headline, { opacity: 1 });
      splitReveal(headline, {
        type: 'lines',
        mask: 'lines',
        animate: (split) =>
          gsap.from(split.lines, {
            yPercent: 105,
            duration: E.duration,
            ease: E.ease,
            delay: E.delay,
            stagger: cappedStagger(E.stagger),
          }),
      });
    }
    gsap.to(arriving, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      delay: E.delay + 0.3,
      stagger: E.stagger,
    });

    // --- Sections and cards rise into view, once. ---
    const reveals = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-reveal]'));
    gsap.set(reveals, { opacity: 0, y: R.y });
    ScrollTrigger.batch(reveals, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: R.duration,
          ease: R.ease,
          stagger: R.stagger,
          overwrite: true,
        }),
    });

    // --- Long statements lift line by line as they are reached. ---
    for (const statement of root.querySelectorAll<HTMLElement>('[data-ok-lines]')) {
      splitReveal(statement, {
        type: 'lines',
        mask: 'lines',
        animate: (split) =>
          gsap.from(split.lines, {
            yPercent: 100,
            duration: 0.9,
            ease: 'power3.out',
            stagger: cappedStagger(0.07),
            scrollTrigger: { trigger: statement, start: 'top 85%', once: true },
          }),
      });
    }

    // --- The services' journey: the line fills from stage to stage as the
    //     section is read, and each stage it reaches is marked. ---
    const journey = root.querySelector<HTMLElement>('[data-journey]');
    const steps = journey ? [...journey.querySelectorAll<HTMLElement>('[data-journey-step]')] : [];
    if (journey && steps.length > 1) {
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
        ...OK_MOTION.journey,
        onUpdate: (self) => draw(self.progress),
        onRefresh: (self) => draw(self.progress),
      });
      cleanups.push(() => {
        trigger.kill();
        for (const step of steps) {
          step.style.removeProperty('--fill');
          step.removeAttribute('data-reached');
        }
      });
    }

    // --- The footer's wordmark rises letter by letter as the page ends. ---
    const mark = root.querySelector<HTMLElement>('[data-ok-footer-mark]');
    if (mark) {
      splitReveal(mark, {
        type: 'chars',
        mask: 'chars',
        animate: (split) =>
          gsap.from(split.chars, {
            yPercent: 100,
            ease: 'none',
            stagger: OK_MOTION.footer.stagger,
            scrollTrigger: {
              trigger: mark,
              start: 'top bottom',
              end: 'bottom bottom',
              scrub: true,
            },
          }),
      });
    }

    // --- Buttons lean toward a mouse (the form's send button included). ---
    if (finePointer) {
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
