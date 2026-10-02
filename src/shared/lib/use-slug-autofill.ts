'use client';

import { useMemo, useRef, type ChangeEvent } from 'react';

import { slugify } from '@/shared/constants/content';

type SlugAutofillOptions = {
  /**
   * Only while creating. A saved item's slug is never changed for it: links to
   * a published page may already be out there, and a draft may have been
   * published before.
   */
  enabled: boolean;
  /** Writes a generated slug into the form. */
  setSlug: (slug: string) => void;
};

/**
 * Fills the slug from the English title (or name) as it is typed, and stops
 * for good once the slug is edited by hand. Emptying the slug hands it back to
 * the title.
 *
 * English, because a slug is Latin only: slugify() drops Georgian letters, so
 * a Georgian title gives it nothing to work with.
 */
export function useSlugAutofill({ enabled, setSlug }: SlugAutofillOptions) {
  const editedByHand = useRef(false);

  return useMemo(
    () => ({
      /** The English title or name field's onChange. */
      followTitle: (event: ChangeEvent<HTMLInputElement>) => {
        if (enabled && !editedByHand.current) setSlug(slugify(event.target.value));
      },
      /** The slug field's onChange: only a person typing reaches it, never setSlug. */
      slugEdited: (event: ChangeEvent<HTMLInputElement>) => {
        editedByHand.current = event.target.value.trim() !== '';
      },
      /** Forget a hand edit when the form is cleared for the next item. */
      restart: () => {
        editedByHand.current = false;
      },
    }),
    [enabled, setSlug],
  );
}
