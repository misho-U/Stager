import type { DbLocale } from '@/shared/types/enums';

/**
 * Each content language, named in itself, so it reads the same whatever
 * language the dashboard is in.
 */
export const LOCALE_NAMES: Record<DbLocale, string> = { KA: 'ქართული', EN: 'English' };

/**
 * Turns an English title into a URL-safe slug: "Chef's Table — Tbilisi" →
 * "chefs-table-tbilisi". Latin letters and digits only, so Georgian drops out
 * entirely, which is why slugs follow the English title (use-slug-autofill.ts).
 */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      // Accents: café → cafe.
      .replace(/[\u0300-\u036f]/g, '')
      // An apostrophe joins the word: chef's → chefs, not chef-s.
      .replace(/['\u2019]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      // The slug schema's limit; cutting can leave a hyphen at the end.
      .slice(0, 120)
      .replace(/-+$/, '')
  );
}
