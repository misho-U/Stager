'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { OK_MOTION } from '@/modules/home-page/elements/open-kitchen/open-kitchen.constants';
import { getSmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.service';

/**
 * Which section is in view: the one crossing a band just above the middle of
 * the screen. The header highlights its link, so the visitor always knows
 * where they are on a long page.
 */
export function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(' ');

  useEffect(() => {
    const sections = key
      .split(' ')
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // The first one in page order wins when two overlap the band.
        setActive(sections.find((section) => visible.has(section.id))?.id ?? null);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [key]);

  return active;
}

/**
 * The pill that sits behind the current section's link and slides to the
 * next one. Measured from the link itself, so it fits Georgian and English
 * labels alike; hidden while no section link is current (the hero).
 */
export function useSpyIndicator(active: string | null) {
  const list = useRef<HTMLUListElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);

  const place = useCallback(() => {
    const marker = indicator.current;
    const link = active
      ? list.current?.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`)
      : null;
    if (!marker) return;
    if (!link) {
      marker.style.opacity = '0';
      return;
    }
    marker.style.opacity = '1';
    marker.style.width = `${link.offsetWidth}px`;
    marker.style.translate = `${link.offsetLeft}px 0`;
  }, [active]);

  useLayoutEffect(place, [place]);

  useEffect(() => {
    // Labels change width once the web font arrives, and with the window.
    const observer = new ResizeObserver(place);
    if (list.current) observer.observe(list.current);
    return () => observer.disconnect();
  }, [place]);

  return { list, indicator };
}

/**
 * The phone menu: a native modal <dialog> (focus held inside, Escape closes,
 * focus returns to the button). A link inside it closes the menu first, then
 * glides to its section.
 */
export function useMenuDialog() {
  const dialog = useRef<HTMLDialogElement>(null);

  const open = () => {
    dialog.current?.showModal();
    getSmoothScroll()?.stop();
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
      if (lenis) lenis.scrollTo(target, { offset: -OK_MOTION.anchorOffset });
      else target.scrollIntoView({ block: 'start' });
    });
  };

  return { dialog, open, close, onClose, follow };
}
