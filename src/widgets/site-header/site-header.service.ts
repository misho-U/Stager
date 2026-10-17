'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { isInPageLink, SITE_MENU_MOTION } from '@/widgets/site-header/site-header.constants';
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
 * Puts the menu just under the header's bar: centred on a phone, its right
 * edge level with the button's on a wider screen (site.css, .ct-menu).
 */
function placeMenu(menu: HTMLDialogElement | null, button: HTMLElement | null) {
  if (!menu || !button) return;
  const box = button.getBoundingClientRect();
  menu.style.setProperty('--menu-top', `${box.bottom}px`);
  menu.style.setProperty('--menu-right', `${window.innerWidth - box.right}px`);
}

/**
 * The menu: a compact panel that drops from its button, a native modal
 * <dialog> (focus held inside, Escape closes, focus returns to the button).
 * It is placed under the button as it opens (the header moves between a
 * bar and a pill, so the spot is measured, not fixed), follows it through a
 * resize, and closes on a click outside it. Its links rise in one after
 * another; a link to a section of this page closes the menu first, then
 * glides there. A link to another page closes it and is followed without a
 * reload (see the module).
 */
export function useMenu() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onResize = () => placeMenu(dialog.current, trigger.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const open = () => {
    const element = dialog.current;
    if (!element) return;
    placeMenu(element, trigger.current);
    element.showModal();
    getSmoothScroll()?.stop();
    if (!reducedMotion()) {
      const { duration, ease, stagger } = SITE_MENU_MOTION;
      gsap.fromTo(
        element.querySelectorAll('[data-menu-link]'),
        { yPercent: 110 },
        { yPercent: 0, duration, ease, stagger, delay: 0.05 },
      );
    }
  };
  const close = () => dialog.current?.close();
  const onClose = () => getSmoothScroll()?.start();

  /**
   * Any link in the menu closes it, whoever drew the link: the sections, the
   * call to action, and the Academy's next course, which once opened its
   * section with the menu left standing over it. A link to a section of this
   * page glides there; one to another page is followed as it is. A link
   * whose own handler already took the click (a section in the list, the
   * language switch's slide) is left to it.
   *
   * A click on the backdrop reaches the dialog itself, as does one on its
   * padding: only one outside the panel's box closes it.
   */
  const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    const element = dialog.current;
    if (!element) return;
    const link = (event.target as Element).closest('a[href]');
    if (link && element.contains(link)) {
      if (event.defaultPrevented) return;
      const href = link.getAttribute('href') ?? '';
      if (isInPageLink(href)) {
        event.preventDefault();
        follow(href);
      } else {
        close();
      }
      return;
    }
    if (event.target !== element) return;
    const box = element.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) close();
  };

  /** Glides to a section of this page (`#id`). */
  const follow = (href: string) => {
    close();
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    // The section's scroll-margin keeps it clear of the header. Focus goes
    // there too, once the closing menu has handed it back to its button.
    window.requestAnimationFrame(() => glideTo(target, { focus: true }));
  };

  return { dialog, trigger, open, close, onClose, onDialogClick, follow };
}
