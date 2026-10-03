import { defineRouting } from 'next-intl/routing';

export const LOCALES = ['ka', 'en'] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'ka';

/**
 * KA/EN with an always-on prefix: `/ka/...` and `/en/...`, with `/` redirecting
 * to `/ka`. Every page therefore has exactly one canonical URL per language,
 * which keeps hreflang unambiguous and avoids a rewrite layer.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  // `/` always lands on Georgian rather than following Accept-Language.
  //
  // Detection sounds friendlier but makes the entry point non-deterministic: a
  // link to stager.ge shown in a meeting opens in a different language
  // depending on whose laptop it is, and crawlers see inconsistent redirects
  // from the same URL. This is a Georgian company with a prominent KA|EN
  // switcher, so the switch is the visitor's to make.
  localeDetection: false,
});

export function isAppLocale(value: string): value is AppLocale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Maps a URL locale to the `Locale` enum stored in the database. */
export function toDbLocale(locale: AppLocale): 'KA' | 'EN' {
  return locale === 'ka' ? 'KA' : 'EN';
}

/** Maps a database `Locale` back to its URL segment. */
export function toAppLocale(locale: 'KA' | 'EN'): AppLocale {
  return locale === 'KA' ? 'ka' : 'en';
}
