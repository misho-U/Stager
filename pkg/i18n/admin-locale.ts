import { z } from 'zod';

import { LOCALES, type AppLocale } from '@pkg/i18n/routing';

/**
 * The dashboard's interface language: the words on its own buttons, labels and
 * messages. Separate from the KA/EN content an admin edits, which every form
 * offers in both languages regardless of this setting.
 *
 * A per-browser choice, kept in a cookie rather than localStorage so the
 * server renders the chosen language in the first byte, the same way as the
 * theme (src/shared/lib/admin-theme.ts). It lives in pkg because
 * pkg/i18n/request.ts reads it, and pkg never imports from src.
 */
export const ADMIN_LOCALE_COOKIE = 'stager-admin-locale';

/** Georgian until someone picks: the client runs the dashboard herself. */
export const DEFAULT_ADMIN_LOCALE: AppLocale = 'ka';

/** A cookie is user input: anything unrecognised means the default. */
const adminLocaleSchema = z.enum(LOCALES).catch(DEFAULT_ADMIN_LOCALE);

export function parseAdminLocale(value: string | undefined): AppLocale {
  return adminLocaleSchema.parse(value);
}

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * The `document.cookie` string the language switch writes. Scoped to /admin,
 * so public pages never carry it.
 */
export function adminLocaleCookie(locale: AppLocale, secure: boolean): string {
  return [
    `${ADMIN_LOCALE_COOKIE}=${locale}`,
    'Path=/admin',
    `Max-Age=${ONE_YEAR_IN_SECONDS}`,
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
