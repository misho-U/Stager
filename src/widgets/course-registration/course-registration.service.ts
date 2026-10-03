'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';

import { getSmoothScroll } from '@/widgets/smooth-scroll/smooth-scroll.service';

/** What the drawer needs to know about the course a visitor chose. */
export type RegistrationCourse = {
  id: string;
  title: string;
  /** Already formatted for the page's language ("14 October"); null while not set. */
  date: string | null;
  /** No seats left: the visitor joins the waiting list instead. */
  full: boolean;
};

/**
 * Which course's registration is open, shared by every "Register" button on
 * the page and the one drawer. A button can sit inside a card, a timetable
 * row or the hero; none of them needs to know where the drawer is.
 */
export const useRegistrationStore = create<{
  course: RegistrationCourse | null;
  open: (course: RegistrationCourse) => void;
  close: () => void;
}>((set) => ({
  course: null,
  open: (course) => set({ course }),
  close: () => set({ course: null }),
}));

/**
 * Drives the native <dialog>: `showModal()` makes the rest of the page inert,
 * holds focus inside, closes on Escape and hands focus back to the button
 * that opened it, so none of that is reimplemented here. While it is open the
 * page underneath must not glide on (Lenis) or scroll (globals.css).
 */
export function useRegistrationDialog() {
  const course = useRegistrationStore((state) => state.course);
  const close = useRegistrationStore((state) => state.close);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (course && !element.open) {
      element.showModal();
      getSmoothScroll()?.stop();
    } else if (!course && element.open) {
      element.close();
    }
  }, [course]);

  // Escape, the close button and a click on the backdrop all end here.
  const onClose = () => {
    getSmoothScroll()?.start();
    close();
  };

  return { course, dialog, onClose, requestClose: () => dialog.current?.close() };
}
