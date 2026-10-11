'use client';

import { useEffect, useRef, useState } from 'react';

import { SITE_MENU_MOTION } from '@/widgets/site-header/site-header.constants';
import { gsap } from '@/shared/lib/motion/gsap';
import { getSmoothScroll, glideTo } from '@/widgets/smooth-scroll/smooth-scroll.service';

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
 * a link to a section of this page closes the menu first, then glides there.
 * A link to another page is simply followed (see the module).
 */
export function useMenu() {
  const dialog = useRef<HTMLDialogElement>(null);

  const open = () => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    getSmoothScroll()?.stop();
    if (!reducedMotion()) {
      const { duration, ease, stagger } = SITE_MENU_MOTION;
      gsap.fromTo(
        element.querySelectorAll('[data-menu-link]'),
        { yPercent: 110 },
        { yPercent: 0, duration, ease, stagger, delay: 0.1 },
      );
    }
  };
  const close = () => dialog.current?.close();
  const onClose = () => getSmoothScroll()?.start();

  /** Glides to a section of this page (`#id`). */
  const follow = (href: string) => {
    close();
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    // The section's scroll-margin keeps it clear of the header. Focus goes
    // there too, once the closing menu has handed it back to its button.
    window.requestAnimationFrame(() => glideTo(target, { focus: true }));
  };

  return { dialog, open, close, onClose, follow };
}
