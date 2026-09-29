'use client';

import type { RefObject } from 'react';

import { PLATE_MOTION as M } from '@/modules/home-page/elements/variant-c/variant-c.constants';
import { gsap, ScrollTrigger } from '@/shared/lib/motion/gsap';
import { magnetic } from '@/shared/lib/motion/pointer';
import { cappedStagger, splitReveal } from '@/shared/lib/motion/split';
import { useMotion } from '@/shared/lib/motion/use-motion';

type Cleanup = () => void;

/**
 * The round cursor: a teal dot that trails the pointer, opens into a ring
 * over anything that can be pressed, and turns cream over the teal band.
 */
function setupCursor(root: HTMLElement, dot: HTMLElement): Cleanup {
  gsap.set(dot, { display: 'block', xPercent: -50, yPercent: -50, opacity: 0 });
  const toX = gsap.quickTo(dot, 'x', { duration: 0.35, ease: 'power3.out' });
  const toY = gsap.quickTo(dot, 'y', { duration: 0.35, ease: 'power3.out' });
  let shown = false;

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    if (!shown) {
      shown = true;
      gsap.to(dot, { opacity: 1, duration: 0.3 });
    }
    toX(event.clientX);
    toY(event.clientY);
  };
  const onOver = (event: PointerEvent) => {
    const target = event.target as Element | null;
    const pressable = target?.closest('a, button, select, input, textarea, label');
    const onTeal = target?.closest('[data-surface="inverse"]') !== null;
    dot.dataset.tone = onTeal ? 'cream' : 'teal';
    dot.dataset.state = pressable ? 'ring' : 'dot';
  };
  const onLeave = () => {
    shown = false;
    gsap.to(dot, { opacity: 0, duration: 0.3 });
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  root.addEventListener('pointerover', onOver);
  document.documentElement.addEventListener('pointerleave', onLeave);
  return () => {
    window.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerover', onOver);
    document.documentElement.removeEventListener('pointerleave', onLeave);
  };
}

/**
 * The text ring turns slowly on its own and spins up with the speed of the
 * scroll (backwards when scrolling back up), then eases back to its pace.
 */
function spinRing(ring: Element): Cleanup {
  const spin = gsap.to(ring, {
    rotation: 360,
    duration: M.ringTurn,
    ease: 'none',
    repeat: -1,
    transformOrigin: '50% 50%',
  });
  let boost = 0;
  let speed = 1;
  const watch = ScrollTrigger.create({
    onUpdate: (self) => {
      const velocity = self.getVelocity();
      const push = Math.min(M.ringBoost.max, Math.abs(velocity) / M.ringBoost.divisor);
      boost = Math.sign(velocity || 1) * Math.max(Math.abs(boost), push);
    },
  });
  const tick = () => {
    boost *= 0.94;
    speed += (1 + boost - speed) * 0.12;
    spin.timeScale(speed);
  };
  gsap.ticker.add(tick);
  return () => {
    gsap.ticker.remove(tick);
    watch.kill();
    spin.kill();
  };
}

/**
 * The lazy Susan: the services section pins, and the scroll turns the wheel
 * one dish at a time, settling on each like a detent, while the text beside
 * it changes to the dish that faces it.
 */
function turnSusan(section: HTMLElement): Cleanup {
  const wheel = section.querySelector<HTMLElement>('[data-wheel]');
  const dishes = [...section.querySelectorAll<HTMLElement>('[data-dish]')];
  const items = [...section.querySelectorAll<HTMLElement>('[data-susan-item]')];
  const count = items.length;
  if (!wheel || count < 2) return () => {};

  section.setAttribute('data-susan-on', '');
  const step = 360 / count;
  let active = -1;
  const show = (index: number) => {
    if (index === active) return;
    const previous = active;
    active = index;
    items.forEach((item, position) => {
      const isActive = position === index;
      gsap.to(item, {
        opacity: isActive ? 1 : 0,
        y: isActive ? 0 : position < index ? -24 : 24,
        duration: previous === -1 ? 0 : 0.5,
        ease: 'power3.out',
        overwrite: 'auto',
      });
      item.inert = !isActive;
    });
    dishes.forEach((dish, position) => {
      dish.toggleAttribute('data-active', position === index);
      gsap.to(dish, { scale: position === index ? 1.18 : 1, duration: 0.5, overwrite: 'auto' });
    });
  };
  show(0);

  gsap.set(wheel, { '--wheel': '0deg' });
  const turn = gsap.to(wheel, {
    '--wheel': `${-step * (count - 1)}deg`,
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      pin: true,
      start: 'top top',
      end: () => `+=${window.innerHeight * M.susanStep * (count - 1)}`,
      scrub: 0.8,
      snap: {
        snapTo: 1 / (count - 1),
        duration: M.susanSnap.duration,
        ease: M.susanSnap.ease,
      },
      onUpdate: (self) => show(Math.round(self.progress * (count - 1))),
    },
  });

  return () => {
    turn.scrollTrigger?.kill();
    turn.kill();
    section.removeAttribute('data-susan-on');
    for (const item of items) item.inert = false;
    gsap.set([...items, ...dishes], { clearProps: 'all' });
  };
}

/**
 * Plate's motion:
 *
 * - On load the plate rolls in on its rim and settles, its rims set down one
 *   after another, the headline's words rise with a slight turn, and the
 *   call to action's ring starts turning.
 * - The header tucks away while reading down and returns on the way up.
 * - The intro's plates fan out across the table; the lazy Susan turns the
 *   services round; project plates are set down one by one; an iris opens
 *   onto the inquiry form.
 * - With a mouse: a round cursor, and round buttons that lean toward it.
 */
export function usePlateMotion(
  scope: RefObject<HTMLElement | null>,
  cursor: RefObject<HTMLElement | null>,
) {
  useMotion(scope, ({ motion, desktop, finePointer }, root) => {
    if (!motion) return;
    const all = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];
    const cleanups: Cleanup[] = [];

    const load = gsap.timeline({ delay: 0.1 });
    load.from(all('[data-plate-header]'), { yPercent: -120, duration: 0.8, ease: 'power3.out' }, 0);
    load.from(
      all('[data-plate]'),
      {
        xPercent: 70,
        rotation: 360 * M.roll.turns,
        duration: M.roll.duration,
        ease: M.roll.ease,
      },
      0.1,
    );
    load.from(
      all('[data-rim]'),
      { scale: 0.7, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 },
      0.7,
    );
    load.from(
      all('[data-cta-ring]'),
      { scale: 0, rotation: -90, duration: 0.9, ease: 'back.out(1.8)' },
      1.1,
    );
    load.from(
      all('main p[data-enter]'),
      { opacity: 0, y: 16, duration: 0.8, ease: 'power3.out' },
      0.9,
    );

    const headline = root.querySelector<HTMLElement>('[data-words]');
    const split = headline
      ? splitReveal(headline, {
          type: 'words,lines',
          mask: 'lines',
          animate: (self) =>
            gsap.from(self.words, {
              yPercent: 110,
              rotation: M.words.turn,
              transformOrigin: '0% 100%',
              duration: M.words.duration,
              ease: M.words.ease,
              stagger: cappedStagger(M.words.step),
              delay: 0.3,
            }),
        })
      : null;
    if (headline) gsap.set(headline, { opacity: 1 });

    const ring = root.querySelector('[data-ring]');
    if (ring) cleanups.push(spinRing(ring));

    // The header: away on the way down, back on the way up.
    const header = root.querySelector('[data-plate-header]');
    if (header) {
      const watch = ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) =>
          gsap.to(header, {
            yPercent: self.direction === 1 && self.scroll() > 160 ? -130 : 0,
            duration: 0.4,
            ease: 'power2.out',
            overwrite: 'auto',
          }),
      });
      cleanups.push(() => watch.kill());
    }

    // The intro's plates, fanning out from one stack as they arrive.
    const fan = root.querySelector('[data-fan]');
    // Their resting places are set in CSS (`translate`, `rotate`); GSAP's own
    // transform starts each one exactly back over the middle plate.
    if (fan) {
      const spread = { trigger: fan, start: 'top 90%', end: 'top 45%', scrub: 0.6 };
      gsap.from(fan.querySelector('[data-fan-plate="0"]'), {
        xPercent: 62,
        rotation: 12,
        ease: 'none',
        scrollTrigger: spread,
      });
      gsap.from(fan.querySelector('[data-fan-plate="2"]'), {
        xPercent: -62,
        rotation: -12,
        ease: 'none',
        scrollTrigger: spread,
      });
    }

    const reveals = all('[data-reveal]');
    gsap.set(reveals, { opacity: 0, y: 24 });
    ScrollTrigger.batch(reveals, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }),
    });

    // Project plates set down one by one, with a quarter turn.
    const plates = all('[data-plate-project]');
    gsap.set(plates, { opacity: 0, scale: 0.85, rotation: -25 });
    ScrollTrigger.batch(plates, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          scale: 1,
          rotation: 0,
          duration: 1.1,
          ease: 'power3.out',
          stagger: 0.12,
        }),
    });

    // The iris opening onto the inquiry form.
    for (const iris of all('[data-iris]')) {
      gsap.fromTo(
        iris,
        { clipPath: 'circle(0% at 50% 40vh)' },
        {
          clipPath: 'circle(150% at 50% 40vh)',
          ease: 'none',
          scrollTrigger: { trigger: iris, start: 'top 95%', end: 'top 5%', scrub: 0.5 },
        },
      );
    }

    if (desktop) {
      const susan = root.querySelector<HTMLElement>('[data-susan]');
      if (susan) cleanups.push(turnSusan(susan));
    }

    if (finePointer) {
      if (cursor.current) cleanups.push(setupCursor(root, cursor.current));
      for (const element of all('[data-magnet]')) cleanups.push(magnetic(element, M.magnet));
    }

    return () => {
      split?.revert();
      for (const cleanup of cleanups) cleanup();
    };
  });
}
