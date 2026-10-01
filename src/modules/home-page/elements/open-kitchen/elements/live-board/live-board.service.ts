'use client';

import { Draggable } from 'gsap/Draggable';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { OK_MOTION } from '@/modules/home-page/elements/open-kitchen/open-kitchen.constants';
import { gsap, registerMotion } from '@/shared/lib/motion/gsap';
import { useReducedMotion } from '@/shared/lib/motion/use-reduced-motion';

const M = OK_MOTION.board;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Where a card rests at `depth` in the deck (0 is the front). */
const resting = (depth: number) => ({
  x: 0,
  xPercent: 0,
  yPercent: 0,
  rotation: 0,
  y: -depth * M.peek,
  scale: 1 - depth * M.shrink,
  opacity: 1,
});

/**
 * The hero's deck of cards: the next Academy course, the newest video, a
 * project. The front card changes by itself every few seconds; a visitor can
 * also swipe it away, or step with the buttons.
 *
 * Moving on by itself pauses while the pointer or the keyboard is on the
 * board, while it is off screen or the tab is hidden, and for good when the
 * visitor presses Pause (WCAG 2.2.2). Under reduced motion it never moves on
 * by itself, and changing card is instant.
 */
export function useLiveBoard(count: number) {
  const root = useRef<HTMLDivElement>(null);
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  // Moving on by itself (and the swipe animation) only where motion is welcome.
  const auto = !useReducedMotion();
  const direction = useRef<1 | -1 | 0>(0);
  /** Set when the change came from a swipe: which way the card was thrown. */
  const thrown = useRef<1 | -1 | null>(null);
  const timer = useRef<gsap.core.Tween | null>(null);
  const holds = useRef(new Set<string>());

  const cards = useCallback(
    () => [...(root.current?.querySelectorAll<HTMLElement>('[data-deck-card]') ?? [])],
    [],
  );

  const go = useCallback(
    (to: number, step: 1 | -1, throwTo: 1 | -1 | null = null) => {
      direction.current = step;
      thrown.current = throwTo;
      setFront(((to % count) + count) % count);
    },
    [count],
  );

  // Lay the deck out, animating the change when there was one.
  useLayoutEffect(() => {
    registerMotion();
    const all = cards();
    const step = direction.current;
    const throwTo = thrown.current;
    direction.current = 0;
    thrown.current = null;
    const animate = step !== 0 && !reducedMotion();
    const leaving = (front - step + count) % count;

    all.forEach((card, index) => {
      const depth = (index - front + count) % count;
      gsap.killTweensOf(card);
      gsap.set(card, { zIndex: count - depth });
      if (!animate) {
        gsap.set(card, resting(depth));
        return;
      }
      if (step === 1 && index === leaving && throwTo !== null) {
        // Swiped: the card flies off the way it was thrown, then waits at the back.
        gsap.set(card, { zIndex: count + 1 });
        gsap
          .timeline()
          .to(card, { xPercent: throwTo * 112, rotation: throwTo * 9, opacity: 0, ...M.out })
          .set(card, { ...resting(depth), opacity: 0, zIndex: count - depth })
          .to(card, { opacity: 1, duration: 0.3 });
      } else if (step === 1 && index === leaving) {
        // Shuffled: the front card lifts, then slides in behind the others.
        gsap.set(card, { zIndex: count + 1 });
        gsap
          .timeline()
          .to(card, { yPercent: -10, rotation: -3, ...M.lift })
          .set(card, { zIndex: count - depth })
          .to(card, { ...resting(depth), yPercent: 0, ...M.settle });
      } else if (step === -1 && index === front) {
        // Back one: the last card lifts from behind the deck and settles in front.
        gsap
          .timeline()
          .to(card, { yPercent: -10, rotation: 3, ...M.lift })
          .set(card, { zIndex: count + 1 })
          .to(card, { ...resting(depth), yPercent: 0, ...M.settle })
          .set(card, { zIndex: count - depth });
      } else {
        // The others move up or back a place, once the moving card is clear.
        gsap.to(card, { ...resting(depth), ...M.settle, delay: M.lift.duration * 0.6 });
      }
    });
  }, [front, count, cards]);

  // The timer: the front card's progress line fills, then the next card comes.
  const sync = useCallback(() => {
    const tween = timer.current;
    if (!tween) return;
    if (paused || holds.current.size > 0) tween.pause();
    else tween.resume();
  }, [paused]);

  useEffect(() => {
    if (!auto) return;
    const bar = root.current?.querySelectorAll<HTMLElement>('[data-progress]')[front];
    if (!bar) return;
    const tween = gsap.fromTo(
      bar,
      { scaleX: 0 },
      { scaleX: 1, duration: M.interval, ease: 'none', onComplete: () => go(front + 1, 1) },
    );
    timer.current = tween;
    sync();
    return () => {
      tween.kill();
      gsap.set(bar, { scaleX: 0 });
      timer.current = null;
    };
  }, [auto, front, go, sync]);

  useEffect(sync, [sync]);

  // Pausing for attention: pointer, focus, off screen, hidden tab.
  useEffect(() => {
    const element = root.current;
    if (!element || !auto) return;
    const hold = (reason: string, on: boolean) => {
      if (on) holds.current.add(reason);
      else holds.current.delete(reason);
      sync();
    };
    const onEnter = () => hold('pointer', true);
    const onLeave = () => hold('pointer', false);
    const onFocusIn = () => hold('focus', true);
    const onFocusOut = (event: FocusEvent) => {
      if (!element.contains(event.relatedTarget as Node | null)) hold('focus', false);
    };
    const onVisibility = () => hold('hidden', document.hidden);
    const observer = new IntersectionObserver(([entry]) =>
      hold('offscreen', !entry?.isIntersecting),
    );
    element.addEventListener('pointerenter', onEnter);
    element.addEventListener('pointerleave', onLeave);
    element.addEventListener('focusin', onFocusIn);
    element.addEventListener('focusout', onFocusOut);
    document.addEventListener('visibilitychange', onVisibility);
    observer.observe(element);
    return () => {
      element.removeEventListener('pointerenter', onEnter);
      element.removeEventListener('pointerleave', onLeave);
      element.removeEventListener('focusin', onFocusIn);
      element.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
    };
  }, [auto, sync]);

  // A swipe on the front card: far enough left for the next, right for the previous.
  useEffect(() => {
    if (!auto) return;
    gsap.registerPlugin(Draggable);
    const card = cards()[front];
    if (!card) return;
    const [drag] = Draggable.create(card, {
      type: 'x',
      minimumMovement: 8,
      onDragEnd() {
        // Either way: the top card is thrown off and the next one comes up.
        if (Math.abs(this.x) > M.swipe) go(front + 1, 1, this.x < 0 ? -1 : 1);
        else gsap.to(card, { x: 0, ...M.settle });
      },
    });
    return () => {
      drag?.kill();
    };
  }, [auto, front, go, cards]);

  return {
    root,
    front,
    auto,
    paused,
    togglePause: () => setPaused((value) => !value),
    next: () => go(front + 1, 1),
    previous: () => go(front - 1, -1),
    show: (index: number) => {
      if (index !== front) go(index, index > front ? 1 : -1);
    },
  };
}
