'use client';

import { introStorageKey } from '@/widgets/intro-gate/intro-gate.constants';

/**
 * Once-per-visit bookkeeping for a design's intro. Plain functions, called
 * from inside a design's motion setup. sessionStorage can throw (a private
 * window, storage switched off); every call treats that as "not played", so
 * the worst case is an intro seen twice, never a page left covered.
 */

export function hasPlayedIntro(id: string): boolean {
  try {
    return window.sessionStorage.getItem(introStorageKey(id)) !== null;
  } catch {
    return false;
  }
}

export function markIntroPlayed(id: string): void {
  try {
    window.sessionStorage.setItem(introStorageKey(id), '1');
  } catch {
    // Nothing to do: the intro simply plays again next time.
  }
}

/**
 * Finishes the intro at once on any key, click, wheel or touch: nobody should
 * have to sit through it. Returns the cleanup that removes the listeners.
 */
export function skipOnInput(finish: () => void): () => void {
  const events = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const;
  const onInput = () => {
    remove();
    finish();
  };
  const remove = () => {
    for (const type of events) window.removeEventListener(type, onInput);
  };
  for (const type of events) window.addEventListener(type, onInput, { passive: true });
  return remove;
}
