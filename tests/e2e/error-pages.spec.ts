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

test('a missing page never draws the other language, even while its stylesheet is slow', async ({
  page,
}) => {
  // app/global-not-found.tsx holds both languages and hides one with a
  // script. Count every frame the browser draws with the Georgian copy
  // showing: a frame is drawn only once the page may render, so this sees
  // what a visitor would.
  await page.addInitScript(() => {
    const probe = window as unknown as { kaFrames: number };
    probe.kaFrames = 0;
    const frame = () => {
      const georgian = document.querySelector<HTMLElement>('[data-copy][lang="ka"]');
      if (georgian?.checkVisibility()) probe.kaFrames += 1;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page.route('**/*.css', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.continue();
  });
  const kaFrames = () => page.evaluate(() => (window as unknown as { kaFrames: number }).kaFrames);

  // Under neither language both stay, so the probe must see Georgian here;
  // otherwise it is not counting anything.
  expect((await page.goto('/api/no-such-route'))?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(2);
  expect(await kaFrames()).toBeGreaterThan(0);

  // Several loads: the frame that slipped through came in about one in three,
  // when the browser painted between the stylesheet's arrival and the script.
  for (let load = 0; load < 3; load += 1) {
    expect((await page.goto('/en/no-such-page-anywhere'))?.status()).toBe(404);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.common.notFound);
    await expect(page.locator('[data-copy][lang="ka"]')).toHaveAttribute('hidden', '');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await kaFrames()).toBe(0);
  }
});

test.describe('without scripts', () => {
  test.use({ javaScriptEnabled: false });

  test('a missing page says it in both languages', async ({ page }) => {
    expect((await page.goto('/en/no-such-page-anywhere'))?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(2);
  });
});
