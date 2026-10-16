'use client';

import { Fragment, type ReactNode } from 'react';
import { create } from 'zustand';

/**
 * How many items each "new" form has saved, by form: its React key.
 *
 * Next keeps the last pages visited mounted but hidden (React's
 * `<Activity>`), with all their state, so a "New article" form that had just
 * saved one came back, on the next "New article", still holding that
 * article's text. A save bumps the count, and the form is built again from
 * nothing: its fields, the language being edited, the slug that follows the
 * title. Leaving without saving bumps nothing, so a half-written item is
 * still there on the way back, as on the rest of the site.
 */
const useSavedCount = create<{
  saved: Record<string, number>;
  bump: (form: string) => void;
}>((set) => ({
  saved: {},
  bump: (form) =>
    set((state) => ({ saved: { ...state.saved, [form]: (state.saved[form] ?? 0) + 1 } })),
}));

/** After a "new" form has saved its item: the next visit starts empty. */
export function startFresh(form: string) {
  useSavedCount.getState().bump(form);
}

/** Wraps a "new" form so that `startFresh(form)` rebuilds it from nothing. */
export function FreshForm({ form, children }: { form: string; children: ReactNode }) {
  const saved = useSavedCount((state) => state.saved[form] ?? 0);
  return <Fragment key={saved}>{children}</Fragment>;
}
