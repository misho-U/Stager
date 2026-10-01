'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { create } from 'zustand';

import { OK_MOTION } from '@/modules/home-page/elements/open-kitchen/open-kitchen.constants';
import { gsap } from '@/shared/lib/motion/gsap';
import { getSmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.service';

/**
 * Which video the player shows, and whether it is playing. Shared by the
 * playlist and any "Play" elsewhere on the page (the hero's board), which
 * can pick a video and send the visitor down to it.
 */
export const usePlaylistStore = create<{
  activeId: string | null;
  playing: boolean;
  /** Shows a video's poster in the player; nothing starts without a press of Play. */
  choose: (id: string) => void;
  /** Shows a video and starts it. */
  play: (id: string) => void;
}>((set) => ({
  activeId: null,
  playing: false,
  choose: (id) => set({ activeId: id, playing: false }),
  play: (id) => set({ activeId: id, playing: true }),
}));

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Plays `id` in the section's player and glides (or jumps) down to it. */
export function playInSection(id: string, sectionId: string) {
  usePlaylistStore.getState().play(id);
  const section = document.getElementById(sectionId);
  if (!section) return;
  const lenis = getSmoothScroll();
  if (lenis) lenis.scrollTo(section, { offset: -OK_MOTION.anchorOffset });
  else section.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
}

/** The player and its caption settle in each time another video is chosen. */
export function useSwapIn(activeId: string, targets: RefObject<HTMLElement | null>[]) {
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reducedMotion()) return;
    const elements = targets.map((target) => target.current).filter((element) => element !== null);
    gsap.fromTo(
      elements,
      { opacity: 0.35, y: 10 },
      {
        opacity: 1,
        y: 0,
        duration: OK_MOTION.playlist.duration,
        ease: OK_MOTION.playlist.ease,
        stagger: 0.05,
        clearProps: 'opacity,transform',
      },
    );
    // `targets` are refs; only the chosen video should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
}
