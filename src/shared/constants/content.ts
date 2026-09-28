import type { DbLocale } from '@/shared/types/enums';

/**
 * Each content language, named in itself, so it reads the same whatever
 * language the dashboard is in.
 */
export const LOCALE_NAMES: Record<DbLocale, string> = { KA: 'ქართული', EN: 'English' };

/** Turns a title into a URL-safe slug. Latin only — Georgian transliterates away. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
