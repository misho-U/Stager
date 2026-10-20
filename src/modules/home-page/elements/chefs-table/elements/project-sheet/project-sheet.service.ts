'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { getSmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.service';

/** A mouse: the summary shows on the photo under the pointer (site.css). */
const POINTER_SHOWS_SUMMARY = '(hover: hover) and (pointer: fine)';

/**
 * A project card on a touch screen shows its photo and title only; a tap
 * opens what the project was about in a sheet. With a mouse nothing changes:
 * the summary still rises over the photo under the pointer, and no tap opens
 * anything.
 *
 * The sheet is a native <dialog>: `showModal()` makes the page inert, holds
 * focus, closes on Escape and hands focus back. While it is open the page
 * does not glide on underneath (Lenis), as with the course drawer. Its
 * contents exist only while it is open: closed, the page would hold every
 * project's title twice, for search engines and for anyone finding it.
 */
export function useProjectSheet() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!isOpen || !element || element.open) return;
    element.showModal();
    getSmoothScroll()?.stop();
  }, [isOpen]);

  const open = () => setIsOpen(true);

  /**
   * A tap anywhere on the card opens it, except on a control of its own (a
   * photo arrow): a swipe through the photos scrolls and never taps.
   */
  const onCardClick = (event: MouseEvent<HTMLElement>) => {
    if (window.matchMedia(POINTER_SHOWS_SUMMARY).matches) return;
    const target = event.target as Element;
    if (target.closest('button, a, dialog')) return;
    open();
  };

  return {
    dialog,
    isOpen,
    open,
    onCardClick,
    // Escape, the close button and a tap outside all end here.
    onClose: () => {
      setIsOpen(false);
      getSmoothScroll()?.start();
    },
    requestClose: () => dialog.current?.close(),
  };
}
