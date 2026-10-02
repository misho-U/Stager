'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { OK_MOTION } from '@/modules/home-page/elements/open-kitchen/open-kitchen.constants';
import { gsap } from '@/shared/lib/motion/gsap';

const M = OK_MOTION.explorer;

const wide = () => window.matchMedia('(min-width: 1024px)').matches;
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Which service is open. On a wide screen one always is (its panel fills the
 * right-hand column), and resting the pointer on another opens that one. On a
 * phone the list is an accordion: tapping the open service closes it.
 */
export function useServiceExplorer(firstId: string | null) {
  const [open, setOpen] = useState<string | null>(firstId);
  const root = useRef<HTMLDivElement>(null);
  const intent = useRef<number | undefined>(undefined);
  const changed = useRef(false);

  const toggle = useCallback((id: string) => {
    changed.current = true;
    setOpen((current) => (current === id && !wide() ? null : id));
  }, []);

  /** The pointer rests on a service for a moment: open it (wide screens, mouse only). */
  const hover = useCallback((id: string) => {
    if (!wide() || !finePointer()) return;
    window.clearTimeout(intent.current);
    intent.current = window.setTimeout(() => {
      changed.current = true;
      setOpen(id);
    }, M.hoverIntent);
  }, []);

  const leave = useCallback(() => window.clearTimeout(intent.current), []);

  // The newly opened panel's content settles in.
  useLayoutEffect(() => {
    if (!changed.current || !open || reducedMotion()) return;
    const panel = root.current?.querySelector<HTMLElement>(
      `[data-explorer-panel="${CSS.escape(open)}"]`,
    );
    if (!panel) return;
    const tween = gsap.fromTo(
      panel.querySelectorAll('[data-panel-part]'),
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: M.duration, ease: M.ease, stagger: 0.06 },
    );
    return () => {
      tween.revert();
    };
  }, [open]);

  return { root, open, toggle, hover, leave };
}
