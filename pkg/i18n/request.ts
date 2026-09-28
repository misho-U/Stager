import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { ADMIN_LOCALE_COOKIE, parseAdminLocale } from '@pkg/i18n/admin-locale';
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

  // Every public route carries a locale (/ka, /en). A request without one is
  // the dashboard (or the root 404), whose interface language is the admin's
  // own choice (pkg/i18n/admin-locale.ts): Georgian until they pick English.
  // Its messages add the `admin` namespace to the site's, so the dashboard can
  // reuse labels the site already has, such as the inquiry interests.
  if (requested === undefined) {
    const locale = parseAdminLocale((await cookies()).get(ADMIN_LOCALE_COOKIE)?.value);

    return {
      locale,
      messages: {
        ...(await import(`./messages/${locale}.json`)).default,
        admin: (await import(`./messages/admin.${locale}.json`)).default,
      },
      timeZone: 'Asia/Tbilisi',
    };
  }

  const locale = isAppLocale(requested) ? requested : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'Asia/Tbilisi',
  };
});
