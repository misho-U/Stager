'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { create } from 'zustand';

import { CT_MOTION } from '@/modules/home-page/elements/chefs-table/chefs-table.constants';
import { gsap } from '@/shared/lib/motion/gsap';
import { useReducedMotion } from '@/shared/lib/motion/use-reduced-motion';
import { getSmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.service';

type Origin = { left: number; top: number; width: number; height: number };

/**
 * Which video is open in the full-screen player, and where on the screen the
 * poster that opened it was: the player grows out of that spot. Any "Play"
 * on the page (a video card, the hero's screen, its Watch button) opens it.
 */
export const useScreeningStore = create<{
  openId: string | null;
  origin: Origin | null;
  open: (id: string, origin: Origin | null) => void;
  close: () => void;
}>((set) => ({
  openId: null,
  origin: null,
  open: (id, origin) => set({ openId: id, origin }),
  close: () => set({ openId: null, origin: null }),
}));

/** Opens `id` in the player, growing it out of `from` (the pressed poster). */
export function openFrom(id: string, from: Element | null) {
  const box = from?.getBoundingClientRect();
  useScreeningStore
    .getState()
    .open(
      id,
      box ? { left: box.left, top: box.top, width: box.width, height: box.height } : null,
    );
}

/**
 * Drives the native <dialog> (focus held inside, Escape closes, focus goes
 * back to the Play that opened it) and the frame's growth: it is laid out
 * where it ends, then animated from the poster's box to there. The YouTube
 * player is only mounted once it has arrived, so the animation never carries
 * an iframe.
 */
export function useScreeningPlayer() {
  const openId = useScreeningStore((state) => state.openId);
  const origin = useScreeningStore((state) => state.origin);
  const close = useScreeningStore((state) => state.close);
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [arrived, setArrived] = useState<string | null>(null);
  // With nothing to grow from, or no motion wanted, the player is there at once.
  const instant = useReducedMotion() || origin === null;

  useLayoutEffect(() => {
    const element = dialog.current;
    const box = frame.current;
    if (!element || !openId) return;
    if (!element.open) {
      element.showModal();
      getSmoothScroll()?.stop();
    }
    if (!box || !origin || instant) return;
    const end = box.getBoundingClientRect();
    const { duration, ease } = CT_MOTION.player;
    const tween = gsap.from(box, {
      x: origin.left - end.left,
      y: origin.top - end.top,
      scaleX: origin.width / end.width,
      scaleY: origin.height / end.height,
      transformOrigin: '0 0',
      duration,
      ease,
      onComplete: () => setArrived(openId),
    });
    return () => {
      tween.kill();
    };
  }, [openId, origin, instant]);

  // Closed from outside (another Play) is not a case; closing always comes
  // through the dialog, which ends here.
  const onClose = () => {
    getSmoothScroll()?.start();
    setArrived(null);
    close();
  };

  // Leaving the page with the player open must not leave scrolling stopped.
  useEffect(() => () => getSmoothScroll()?.start(), []);

  return {
    openId,
    playing: openId !== null && (instant || arrived === openId),
    dialog,
    frame,
    onClose,
    requestClose: () => dialog.current?.close(),
  };
}
