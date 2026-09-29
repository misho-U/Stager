'use client';

import type { RefObject } from 'react';

import {
  PASS_INTRO_ID,
  PASS_MOTION as M,
} from '@/modules/home-page/elements/variant-d/variant-d.constants';
import { gsap, ScrollTrigger } from '@/shared/lib/motion/gsap';
import { useMotion } from '@/shared/lib/motion/use-motion';
import {
  hasPlayedIntro,
  markIntroPlayed,
  skipOnInput,
} from '@/widgets/intro-gate/intro-gate.service';

type Cleanup = () => void;

/**
 * The first ticket printing: on the first visit it feeds out of the rail in
 * stepped jerks, the way a kitchen printer pushes paper, then swings on its
 * clip as if just torn off. Any key or click finishes it at once. Later
 * visits in the same tab only see it settle.
 */
function printHeroTicket(ticket: HTMLElement): Cleanup {
  if (hasPlayedIntro(PASS_INTRO_ID)) {
    gsap.from(ticket, { opacity: 0, y: -10, duration: 0.6, ease: 'power2.out' });
    return () => {};
  }
  const print = gsap.timeline({ onComplete: () => markIntroPlayed(PASS_INTRO_ID) });
  print
    .fromTo(
      ticket,
      { clipPath: 'inset(0% -10% 100% -10%)' },
      {
        clipPath: 'inset(0% -10% -10% -10%)',
        duration: M.print.duration,
        ease: `steps(${M.print.feeds})`,
        delay: 0.35,
      },
    )
    .set(ticket, { clearProps: 'clipPath' })
    .fromTo(
      ticket,
      { rotation: 4 },
      { rotation: 0, duration: M.settle.duration, ease: M.settle.ease },
    );
  const stopSkipping = skipOnInput(() => print.progress(1));
  return () => {
    stopSkipping();
    print.kill();
  };
}

/**
 * Tickets hanging over the page flutter a little with the scroll's speed,
 * neighbours in opposite directions, and settle when it stops.
 */
function swayWithScroll(tickets: HTMLElement[]): Cleanup {
  const swayTo = tickets.map((ticket) =>
    gsap.quickTo(ticket, 'rotation', { duration: 0.6, ease: 'power3.out' }),
  );
  let settle = 0;
  const watch = ScrollTrigger.create({
    onUpdate: (self) => {
      const angle = gsap.utils.clamp(-M.sway.max, M.sway.max, self.getVelocity() / M.sway.divisor);
      swayTo.forEach((sway, index) => sway(index % 2 === 0 ? angle : -angle));
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        gsap.to(tickets, { rotation: 0, duration: M.settle.duration, ease: M.settle.ease });
      }, 120);
    },
  });
  return () => {
    watch.kill();
    window.clearTimeout(settle);
  };
}

/** The ticker runs on its own and speeds up with the scroll. */
function runTicker(track: HTMLElement): Cleanup {
  const loop = gsap.to(track, { xPercent: -50, duration: M.ticker.loop, ease: 'none', repeat: -1 });
  let boost = 0;
  const watch = ScrollTrigger.create({
    onUpdate: (self) => {
      boost = Math.max(
        boost,
        Math.min(M.ticker.boostMax, Math.abs(self.getVelocity()) / M.ticker.boostDivisor),
      );
    },
  });
  const tick = () => {
    boost *= 0.93;
    loop.timeScale(1 + boost);
  };
  gsap.ticker.add(tick);
  return () => {
    gsap.ticker.remove(tick);
    watch.kill();
    loop.kill();
  };
}

/** A stamp on the order ticket once the inquiry form reports it was sent. */
function stampOnSend(order: HTMLElement): Cleanup {
  const stamp = order.querySelector<SVGElement>('[data-order-stamp]');
  if (!stamp) return () => {};
  const observer = new MutationObserver(() => {
    if (!order.querySelector('[data-testid="inquiry-sent"]')) return;
    observer.disconnect();
    gsap.set(stamp, { display: 'block' });
    gsap
      .timeline()
      .fromTo(
        stamp,
        { scale: 2.4, opacity: 0, rotation: -35 },
        { scale: 1, opacity: 1, rotation: -12, duration: 0.45, ease: 'back.out(2.4)' },
      )
      .fromTo(order, { x: -4 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }, 0.3);
  });
  observer.observe(order, { childList: true, subtree: true });
  return () => observer.disconnect();
}

/**
 * Pass's motion: the printed first ticket, tickets swaying with the scroll,
 * the ticker, the receipt feeding out of the printer, orders dropping onto
 * the board, and the stamp on a sent order. The rail's own drag and swing
 * live in ticket-rail.
 */
export function usePassMotion(scope: RefObject<HTMLElement | null>) {
  useMotion(scope, ({ motion }, root) => {
    if (!motion) return;
    const all = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];
    const cleanups: Cleanup[] = [];

    gsap.from(all('header[data-enter]'), { opacity: 0, y: -10, duration: 0.6, delay: 0.1 });

    const hero = root.querySelector<HTMLElement>('[data-print]');
    if (hero) cleanups.push(printHeroTicket(hero));

    // The tickets hanging over the first screen, not those on the rail (which swing with it).
    const hanging = all('[data-hang]').filter((ticket) => !ticket.closest('[role="region"]'));
    cleanups.push(swayWithScroll(hanging));

    const ticker = root.querySelector<HTMLElement>('[data-ticker]');
    if (ticker) cleanups.push(runTicker(ticker));

    const reveals = all('[data-reveal]');
    gsap.set(reveals, { opacity: 0, y: 20 });
    ScrollTrigger.batch(reveals, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }),
    });

    // Finished orders dropping onto the board and swinging onto their pins.
    const drops = all('[data-drop]');
    gsap.set(drops, { opacity: 0, y: -48, rotation: (index) => (index % 2 ? 10 : -10) });
    ScrollTrigger.batch(drops, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          rotation: 0,
          duration: 1.2,
          ease: 'elastic.out(1, 0.45)',
          stagger: 0.12,
        }),
    });

    // The receipt feeds out of the printer, in jerks, as the page scrolls.
    for (const receipt of all('[data-receipt]')) {
      gsap.fromTo(
        receipt,
        { clipPath: 'inset(0% -10% 100% -10%)' },
        {
          clipPath: 'inset(0% -10% -10% -10%)',
          ease: 'steps(16)',
          scrollTrigger: { trigger: receipt, start: 'top 85%', end: 'bottom 75%', scrub: 0.3 },
        },
      );
    }

    const order = root.querySelector<HTMLElement>('[data-order]');
    if (order) cleanups.push(stampOnSend(order));

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  });
}
