import { expect, test } from '@playwright/test';

import en from '@pkg/i18n/messages/en.json';
import ka from '@pkg/i18n/messages/ka.json';

/**
 * When something goes wrong, the visitor is told in their own language and
 * can try again, instead of meeting Next's bare error screen.
 */

for (const [locale, messages] of [
  ['ka', ka],
  ['en', en],
] as const) {
  test(`/${locale}: a missing page says so in ${locale}`, async ({ page }) => {
    const response = await page.goto(`/${locale}/no-such-page-anywhere`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.common.notFound);
    await expect(page.getByRole('link', { name: messages.common.backHome })).toHaveAttribute(
      'href',
      `/${locale}`,
    );
  });

  test(`/${locale}: a page that fails says so in ${locale}, with Try again`, async ({ page }) => {
    // app/[locale]/test/error throws on purpose; it exists only where the
    // cache probe does (development and CI).
    await page.goto(`/${locale}/test/error`);
    const error = page.getByTestId('page-error');
    await expect(error).toBeVisible();
    await expect(error.getByRole('heading', { level: 1 })).toHaveText(messages.common.error);
    await expect(error).toContainText(messages.common.errorBody);
    await expect(error.getByRole('button', { name: messages.common.retry })).toBeVisible();
  });
}
