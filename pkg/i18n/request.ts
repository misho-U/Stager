import { getRequestConfig } from 'next-intl/server';

import { ADMIN_UI_LOCALE, DEFAULT_LOCALE, isAppLocale } from '@pkg/i18n/routing';

/**
 * Per-request i18n configuration, wired up by the next-intl plugin in
 * next.config.ts.
 *
 * These messages cover UI chrome only — button labels, nav items, form errors.
 * All editorial copy lives in the database translation tables and is fetched
 * per locale, so the admin can change it without a deploy.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  // Every public route carries a locale (/ka, /en). A request without one is
  // the dashboard or the root 404, and both have an English interface. They
  // used to fall back to DEFAULT_LOCALE, which served English text as
  // <html lang="ka"> — so screen readers read it with Georgian pronunciation.
  const locale =
    requested === undefined ? ADMIN_UI_LOCALE : isAppLocale(requested) ? requested : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'Asia/Tbilisi',
  };
});
