'use client';

import { useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';

import { gsap } from '@/shared/lib/motion/gsap';
import { getSmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.service';

/** The menu panel's id: the button names it in aria-controls. */
export const MENU_PANEL_ID = 'stages-menu';

const FOCUSABLE = 'a[href], button:not([disabled])';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Whether the menu is open, shared by the button in the header and the panel
 * outside it. The panel cannot live inside the header: the header is moved by
 * a transform, and a transformed element becomes the box a `fixed` child is
 * positioned in, so a full-screen panel there covered only the header.
 */
const useMenuStore = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export function useMenuButton() {
  const open = useMenuStore((state) => state.open);
  const setOpen = useMenuStore((state) => state.setOpen);
  return { open, show: () => setOpen(true) };
}

/**
 * The full-screen menu: opens over the page, holds focus inside itself while
 * open (Tab cycles, Escape closes), stops the page scrolling underneath, and
 * hands focus back to the button that opened it.
 */
export function useMenuPanel() {
  const open = useMenuStore((state) => state.open);
  const setOpen = useMenuStore((state) => state.setOpen);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    const element = panel.current;
    if (!open || !element) return;

    getSmoothScroll()?.stop();
    const focusable = [...element.querySelectorAll<HTMLElement>(FOCUSABLE)];
    focusable[0]?.focus();

    if (!reducedMotion()) {
      gsap.fromTo(
        element,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'expo.inOut' },
      );
      gsap.from(element.querySelectorAll('[data-menu-link]'), {
        yPercent: 110,
        duration: 0.8,
        ease: 'expo.out',
        stagger: 0.06,
        delay: 0.3,
      });
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      getSmoothScroll()?.start();
      document.querySelector<HTMLElement>(`[aria-controls="${MENU_PANEL_ID}"]`)?.focus();
    };
  }, [open, setOpen]);

  /** A menu link: closes the menu, then glides (or jumps) to its section. */
  const follow = useCallback(
    (href: string) => {
      setOpen(false);
      const target = document.querySelector(href);
      if (!target) return;
      // After the menu has handed scrolling back to the page.
      window.requestAnimationFrame(() => {
        const lenis = getSmoothScroll();
        if (lenis) lenis.scrollTo(target as HTMLElement);
        else target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
      });
    },
    [setOpen],
  );

  return { open, close, follow, panel };
}
