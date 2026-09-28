import type { FieldErrors } from 'react-hook-form';

import { DB_LOCALES, type DbLocale } from '@/shared/types/enums';

/** A react-hook-form error leaf: `{ type, message, ref }`. */
function isErrorLeaf(node: object): boolean {
  return typeof (node as { type?: unknown }).type === 'string';
}

function containsError(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  if (isErrorLeaf(node)) return true;
  return Object.entries(node).some(([key, child]) => key !== 'ref' && containsError(child));
}

/**
 * The content languages with a failing field anywhere in the form.
 *
 * Translated values always sit under a `KA` or `EN` key, at any depth (a
 * project's `translations.EN.title`, a page's `sections.2.translations.KA.body`),
 * so finding those keys in the error tree is enough. `ref` holds the DOM
 * element and is never walked.
 */
export function localesWithErrors(errors: FieldErrors): DbLocale[] {
  const found = new Set<DbLocale>();

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object' || isErrorLeaf(node)) return;
    for (const [key, child] of Object.entries(node)) {
      if (key === 'ref') continue;
      if ((key === 'KA' || key === 'EN') && containsError(child)) found.add(key);
      else visit(child);
    }
  };

  visit(errors);
  return DB_LOCALES.filter((locale) => found.has(locale));
}
