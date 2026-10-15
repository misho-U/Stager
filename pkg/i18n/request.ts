import { cookies } from 'next/headers';
import { locale as rootLocale } from 'next/root-params';
import { getRequestConfig } from 'next-intl/server';

import { ADMIN_LOCALE_COOKIE, parseAdminLocale } from '@pkg/i18n/admin-locale';
import { isAppLocale } from '@pkg/i18n/routing';

/**
 * Per-render i18n configuration, wired up by the next-intl plugin in
 * next.config.ts.
 *
 * These messages cover UI chrome only — button labels, nav items, form errors.
 * All editorial copy lives in the database translation tables and is fetched
 * per locale, so the admin can change it without a deploy.
 */

/**
 * The language in the URL (/ka, /en): the public site's root parameter, read
 * without touching the request, so its pages are built ahead of time. The
 * dashboard has no such segment, and gets undefined.
 */
async function siteLocale(): Promise<string | undefined> {
  try {
    return await rootLocale();
  } catch {
    return undefined;
  }
}

export default getRequestConfig(async ({ locale: explicit }) => {
  const requested = explicit ?? (await siteLocale());

  if (requested !== undefined && isAppLocale(requested)) {
    return {
      locale: requested,
      messages: (await import(`./messages/${requested}.json`)).default,
      timeZone: 'Asia/Tbilisi',
    };
  }

  // The dashboard (or a URL under neither root): its interface language is the
  // admin's own choice (pkg/i18n/admin-locale.ts), Georgian until they pick
  // English. Its messages add the `admin` namespace to the site's, so the
  // dashboard can reuse labels the site already has, such as the inquiry
  // interests.
  const locale = parseAdminLocale((await cookies()).get(ADMIN_LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: {
      ...(await import(`./messages/${locale}.json`)).default,
      admin: (await import(`./messages/admin.${locale}.json`)).default,
    },
    timeZone: 'Asia/Tbilisi',
  };
});
