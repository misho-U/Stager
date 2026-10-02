'use client';

import { useEffect, useRef, useState } from 'react';

import { CT_MOTION } from '@/modules/home-page/elements/chefs-table/chefs-table.constants';
import { gsap } from '@/shared/lib/motion/gsap';
import { getSmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.service';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Whether the page has moved off its top: the header is a clear bar over the
 * hero, then gathers into a pill. Watched with an IntersectionObserver on a
 * marker at the top of the page, so nothing runs per scroll frame.
 */
export function useScrolled() {
  const marker = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const element = marker.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry?.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { marker, scrolled };
}

/**
 * The full-screen menu: a native modal <dialog> (focus held inside, Escape
 * closes, focus returns to the button). Its links rise in one after another;
 * a link closes the menu first, then glides to its section.
 */
export function useMenu() {
  const dialog = useRef<HTMLDialogElement>(null);

  const open = () => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    getSmoothScroll()?.stop();
    if (!reducedMotion()) {
      const { duration, ease, stagger } = CT_MOTION.menu;
      gsap.fromTo(
        element.querySelectorAll('[data-menu-link]'),
        { yPercent: 110 },
        { yPercent: 0, duration, ease, stagger, delay: 0.1 },
      );
    }
  };
  const close = () => dialog.current?.close();
  const onClose = () => getSmoothScroll()?.start();

  const follow = (href: string) => {
    close();
    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;
    window.requestAnimationFrame(() => {
      const lenis = getSmoothScroll();
      // Without Lenis, the section's scroll-margin keeps it clear of the header.
      if (lenis) lenis.scrollTo(target, { offset: -CT_MOTION.anchorOffset });
      else target.scrollIntoView({ block: 'start' });
    });
  };

  return { dialog, open, close, onClose, follow };
}
