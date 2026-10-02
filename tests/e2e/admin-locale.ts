import type { BrowserContext } from '@playwright/test';

import { ADMIN_LOCALE_COOKIE } from '@pkg/i18n/admin-locale';
import type { AppLocale } from '@pkg/i18n/routing';

/**
 * The dashboard is in Georgian until the admin picks English. A test that
 * finds things by their English wording picks English first, the way the
 * switch does: the cookie, on /admin only.
 *
 * Tests that expect Georgian read the wording from admin.ka.json rather than
 * repeating it, so correcting a translation never breaks a test.
 */
export async function setDashboardLanguage(
  context: BrowserContext,
  baseURL: string | undefined,
  locale: AppLocale,
) {
  const { hostname } = new URL(baseURL ?? 'http://localhost:3000');
  await context.addCookies([
    { name: ADMIN_LOCALE_COOKIE, value: locale, domain: hostname, path: '/admin' },
  ]);
}
