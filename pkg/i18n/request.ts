import { getRequestConfig } from 'next-intl/server';

import { DEFAULT_LOCALE, isAppLocale } from '@pkg/i18n/routing';

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
  const locale = requested && isAppLocale(requested) ? requested : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'Asia/Tbilisi',
  };
});
