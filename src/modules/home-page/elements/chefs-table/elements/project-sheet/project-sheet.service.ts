'use client';

import { useRef, type MouseEvent } from 'react';

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
 * does not glide on underneath (Lenis), as with the course drawer.
 */
export function useProjectSheet() {
  const dialog = useRef<HTMLDialogElement>(null);

  const open = () => {
    const element = dialog.current;
    if (!element || element.open) return;
    element.showModal();
    getSmoothScroll()?.stop();
  };

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
    open,
    onCardClick,
    onClose: () => getSmoothScroll()?.start(),
    requestClose: () => dialog.current?.close(),
  };
}
