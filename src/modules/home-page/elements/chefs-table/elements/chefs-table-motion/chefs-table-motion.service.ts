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
 * Option 2's motion. Every effect below runs only with motion allowed; the
 * pinned ones (the hero's screen, the service stack, the filmstrip) only on a
 * desktop, where there is room to stage them. Without them the page is the
 * same content, one section after another.
 */
export function useChefsTableMotion(scope: RefObject<HTMLElement | null>) {
  useSmoothScroll({ lerp: M.lerp, anchorOffset: M.anchorOffset });

  useMotion(scope, ({ motion, desktop, finePointer }, root) => {
    if (!motion) return;
    const cleanups: Cleanup[] = [];

    assembleHero(root);
    if (finePointer) cleanups.push(followLight(root));
    if (desktop) cleanups.push(growScreen(root));
    cleanups.push(runTicker(root));
    readAlong(root);
    if (desktop) cleanups.push(stackServices(root));
    if (desktop) cleanups.push(runFilm(root));
    reveal(root);
    rollCredits(root);
    openIris(root);
    riseFooter(root);
    if (finePointer) {
      cleanups.push(spotlights(root));
      const pulled = [
        ...root.querySelectorAll<HTMLElement>('[data-magnetic]'),
        ...root.querySelectorAll<HTMLElement>(
          '[data-testid="inquiry-form"] button[type="submit"]',
        ),
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

/** When the `index`th arrival starts moving, in seconds after load. */
function arrivalDelay(index: number) {
  return M.enter.delay + Math.max(0, index) * M.enter.stagger;
}

/** The headline's letters rise into place, then the rest of the hero arrives. */
function assembleHero(root: HTMLElement) {
  const headline = root.querySelector<HTMLElement>('[data-ct-headline]');
  const arriving = arrivals(root);
  gsap.set(arriving, { opacity: 0, y: 28 });
  if (headline) {
    gsap.set(headline, { opacity: 1 });
    splitReveal(headline, {
      type: 'lines,chars',
      mask: 'lines',
      animate: (split) =>
        gsap.from(split.chars, {
          yPercent: 115,
          rotate: 6,
          duration: M.assemble.duration,
          ease: M.assemble.ease,
          delay: M.assemble.delay,
          stagger: cappedStagger(M.assemble.stagger, 40),
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
 * The hero's screen grows to fill the view while the hero holds still. The
 * screen on the page stays put and hides; a full-size copy of it (the
 * cinema) is clipped to exactly the same box and opened out to the edges,
 * so nothing is scaled and the poster stays sharp.
 */
function growScreen(root: HTMLElement): Cleanup {
  const hero = root.querySelector<HTMLElement>('[data-ct-hero]');
  const slot = hero?.querySelector<HTMLElement>('[data-hero-slot]');
  const cinema = hero?.querySelector<HTMLElement>('[data-hero-cinema]');
  if (!hero || !slot || !cinema) return () => {};
  const copy = hero.querySelector<HTMLElement>('[data-hero-copy]');
  const play = cinema.querySelector<HTMLElement>('[data-cinema-play]');
  const caption = cinema.querySelector<HTMLElement>('[data-cinema-caption]');

  hero.setAttribute('data-grow-on', '');

  // The screen's column arrives without moving, since the cinema is cut to
  // its box, and the cinema fades in with it.
  const column = slot.closest<HTMLElement>('[data-enter]');
  if (column) {
    gsap.set(column, { y: 0 });
    gsap.fromTo(
      cinema,
      { opacity: 0 },
      {
        opacity: 1,
        duration: M.enter.duration,
        ease: M.enter.ease,
        delay: arrivalDelay(arrivals(root).indexOf(column)),
      },
    );
  }
  const box = () => {
    const stage = hero.getBoundingClientRect();
    const frame = slot.getBoundingClientRect();
    return {
      top: frame.top - stage.top,
      right: stage.right - frame.right,
      bottom: stage.bottom - frame.bottom,
      left: frame.left - stage.left,
      dx: frame.left + frame.width / 2 - (stage.left + stage.width / 2),
      dy: frame.top + frame.height / 2 - (stage.top + stage.height / 2),
    };
  };
  const clipped = () => {
    const b = box();
    return `inset(${b.top}px ${b.right}px ${b.bottom}px ${b.left}px round 24px)`;
  };

  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: () => `+=${window.innerHeight * M.screen.length}`,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
  // One unit of timeline is the whole pinned scroll: the screen opens over
  // the first three quarters of it, the caption arrives over the last.
  const { open, copyOut, captionAt } = M.screen;
  timeline
    .fromTo(
      cinema,
      { clipPath: clipped },
      { clipPath: 'inset(0px 0px 0px 0px round 0px)', ease: 'power2.inOut', duration: open },
      0,
    )
    .to(copy, { opacity: 0, y: -80, ease: 'power1.in', duration: copyOut }, 0);
  if (play) {
    timeline.fromTo(
      play,
      { x: () => box().dx, y: () => box().dy },
      { x: 0, y: 0, ease: 'power2.inOut', duration: open },
      0,
    );
  }
  if (caption) {
    timeline.fromTo(
      caption,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 1 - captionAt },
      captionAt,
    );
  }
  return () => {
    hero.removeAttribute('data-grow-on');
    gsap.set(cinema, { clearProps: 'opacity' });
  };
}

/** The ticker of services runs on; scrolling speeds it up, and turns it the way of the scroll. */
function runTicker(root: HTMLElement): Cleanup {
  const track = root.querySelector<HTMLElement>('[data-ticker-track]');
  if (!track) return () => {};
  const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: M.ticker.duration, repeat: -1 });
  const trigger = ScrollTrigger.create({
    trigger: track,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const speed = 1 + Math.min(M.ticker.boost, Math.abs(self.getVelocity()) / 300);
      gsap.to(loop, {
        timeScale: speed * self.direction,
        duration: 0.2,
        overwrite: true,
        onComplete: () => {
          gsap.to(loop, { timeScale: self.direction, duration: M.ticker.settle });
        },
      });
    },
  });
  return () => {
    trigger.kill();
    loop.kill();
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

/** Each service card stays pinned while the next slides over it, and steps back. */
function stackServices(root: HTMLElement): Cleanup {
  const stack = root.querySelector<HTMLElement>('[data-stack]');
  if (!stack) return () => {};
  const cards = [...stack.querySelectorAll<HTMLElement>('[data-stack-card]')];
  if (cards.length < 2) return () => {};
  stack.setAttribute('data-stack-on', '');
  cards.forEach((card, index) => {
    const next = cards[index + 1];
    const face = card.querySelector<HTMLElement>('[data-stack-face]');
    if (!next || !face) return;
    // Shrinks toward its top edge, which stays in view above the next card;
    // dims late, as the next card is nearly over it, not as it appears.
    gsap.to(face, {
      scale: M.stack.scale,
      filter: `brightness(${1 - M.stack.dim})`,
      transformOrigin: '50% 0%',
      ease: 'power2.in',
      scrollTrigger: {
        trigger: next,
        start: 'top bottom',
        // Fully covered when the next card reaches the line it pins at.
        end: () => `top ${parseFloat(getComputedStyle(next).top) || 0}px`,
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  });
  return () => stack.removeAttribute('data-stack-on');
}

/** The projects run past as a filmstrip, leaning into the scroll's speed. */
function runFilm(root: HTMLElement): Cleanup {
  const film = root.querySelector<HTMLElement>('[data-film]');
  const track = film?.querySelector<HTMLElement>('[data-film-track]');
  if (!film || !track) return () => {};
  const frames = [...track.querySelectorAll<HTMLElement>('[data-film-frame]')];
  if (frames.length < 3) return () => {};
  film.setAttribute('data-film-on', '');
  // The strip is moved by the page's scroll now, so it is no longer a
  // scrolling region to stop at with Tab.
  const scroller = film.querySelector<HTMLElement>('[data-film-scroller]');
  scroller?.setAttribute('tabindex', '-1');
  const distance = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
  const lean = gsap.quickTo(frames, 'skewX', { duration: 0.3, ease: 'power3.out' });
  const straighten = gsap.delayedCall(0.15, () => lean(0)).pause();
  const pan = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: film,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        lean(gsap.utils.clamp(-M.film.skew, M.film.skew, self.getVelocity() / -350));
        straighten.restart(true);
      },
    },
  });
  return () => {
    straighten.kill();
    pan.scrollTrigger?.kill();
    pan.kill();
    film.removeAttribute('data-film-on');
    scroller?.setAttribute('tabindex', '0');
  };
}

/** Sections and cards rise into view, once. */
function reveal(root: HTMLElement) {
  const items = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-reveal]'));
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

/** The reasons roll like credits: each line sharpest as it crosses the middle. */
function rollCredits(root: HTMLElement) {
  for (const line of root.querySelectorAll<HTMLElement>('[data-credits] :is(p, li)')) {
    gsap
      .timeline({
        scrollTrigger: { trigger: line, start: 'top 90%', end: 'bottom 10%', scrub: true },
      })
      .fromTo(line, { opacity: 0.2, filter: 'blur(3px)' }, { opacity: 1, filter: 'blur(0px)', ease: 'none' })
      .to(line, { opacity: 0.2, filter: 'blur(3px)', ease: 'none' });
  }
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
