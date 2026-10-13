import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import en from '@pkg/i18n/messages/en.json';
import ka from '@pkg/i18n/messages/ka.json';

import { contrastFindings } from './contrast';
import {
  DB_WRITES_ALLOWED,
  DB_WRITES_SKIP_REASON,
  disconnectTestPrisma,
  testPrisma,
} from './db-guard';

/**
 * The privacy policy page (/ka/privacy, /en/privacy): the client's own text,
 * written in the dashboard under Page copy. Until it is written the page
 * says so, and nothing links to it: an empty legal page is never offered.
 */

const LOCALES = ['ka', 'en'] as const;

/** Whether the dashboard holds a policy text in this language. */
async function policyWritten(request: APIRequestContext, locale: 'KA' | 'EN') {
  const response = await request.get(`/api/public/pages/PRIVACY?locale=${locale}`);
  expect(response.ok(), 'the PRIVACY page exists (migration 20261011230743)').toBeTruthy();
  const page = (await response.json()) as { sections: Array<{ key: string; body: string }> };
  const body = page.sections.find((section) => section.key === 'policy')?.body ?? '';
  return body.replace(/<[^>]*>/g, '').trim() !== '';
}

async function openPrivacy(page: Page, locale: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/${locale}/privacy`);
  await expect(page.locator('[data-site]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const locale of LOCALES) {
  test.describe(`the privacy policy on /${locale}`, () => {
    test('has its title, the shared header and footer, and one main', async ({ page }) => {
      await openPrivacy(page, locale);
      await expect(page.getByTestId('privacy-title')).toBeVisible();
      await expect(page.locator('main#content')).toHaveCount(1);
      await expect(page.locator('[data-ct-header]')).toBeVisible();
      await expect(page.getByTestId('footer-wordmark')).toBeVisible();
      // Back to the site: the wordmark and the footer lead home, and the
      // call to action to the form on the home page.
      await expect(page.locator('[data-ct-header] a').first()).toHaveAttribute(
        'href',
        `/${locale}`,
      );
      await expect(page.locator(`a[href="/${locale}#inquiry"]:visible`).first()).toBeVisible();
      // On a phone the header keeps only its menu: the way back is there.
      await page.locator('[data-ct-header] button[aria-haspopup="dialog"]').click();
      const menu = page.locator('dialog[open]');
      await expect(
        menu.getByRole('link', { name: (locale === 'ka' ? ka : en).nav.home }),
      ).toHaveAttribute('href', `/${locale}`);
      // Listed with the pages, and as the menu's button, as on the home page.
      await expect(menu.locator(`a[href="/${locale}#inquiry"]`).first()).toBeVisible();
    });

    test('fits the screen and meets the contrast minimums', async ({ page }) => {
      await openPrivacy(page, locale);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0);
      expect(await contrastFindings(page)).toEqual([]);
    });

    test('the language switch keeps the visitor on the policy', async ({ page }) => {
      await openPrivacy(page, locale);
      const other = locale === 'ka' ? 'en' : 'ka';
      const link = page.locator(`[data-ct-header] a[hreflang="${other}"]`);
      await expect(link).toHaveAttribute('href', `/${other}/privacy`);
    });
  });
}

test('while no policy is written, the page says so and nothing links to it', async ({
  page,
  request,
}) => {
  test.skip(await policyWritten(request, 'EN'), 'The dashboard holds a policy.');
  await openPrivacy(page, 'en');
  await expect(page.locator('[data-pending-content]')).toBeVisible();

  await page.goto('/en');
  await expect(page.getByTestId('privacy-link')).toHaveCount(0);
  await expect(page.getByTestId('privacy-note')).toHaveCount(0);
});

test.describe('a policy written in the dashboard', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
    test.skip(
      testInfo.project.name !== 'chromium',
      'Writes the policy; runs once, under chromium.',
    );
  });

  test.afterAll(disconnectTestPrisma);

  test('shows on its page, and the footer and the form link to it', async ({ page, request }) => {
    const prisma = testPrisma();
    const section = await prisma.pageSection.findFirstOrThrow({
      where: { key: 'policy', page: { key: 'PRIVACY' } },
      select: { translations: { where: { locale: 'EN' }, select: { id: true, body: true } } },
    });
    const [translation] = section.translations;
    if (!translation) throw new Error('PRIVACY has no English policy row: run the migrations.');
    const original = translation.body;
    const revalidate = () =>
      request.post('/api/dev/revalidate-probe', {
        data: { entity: 'page', key: 'PRIVACY' },
        headers: { 'sec-fetch-site': 'same-origin' },
      });

    await prisma.pageSectionTranslation.update({
      where: { id: translation.id },
      data: { body: '<p>E2E policy text.</p><h2>E2E heading</h2><p>More.</p>' },
    });
    try {
      expect((await revalidate()).ok()).toBeTruthy();

      await openPrivacy(page, 'en');
      await expect(page.locator('main')).toContainText('E2E policy text.');
      await expect(page.locator('main h2')).toHaveText('E2E heading');
      await expect(page.locator('[data-pending-content]')).toHaveCount(0);
      expect(await contrastFindings(page)).toEqual([]);

      await page.goto('/en');
      await expect(page.getByTestId('privacy-link')).toHaveAttribute('href', '/en/privacy');
      await expect(page.getByTestId('privacy-note').getByRole('link')).toHaveAttribute(
        'href',
        '/en/privacy',
      );
    } finally {
      await prisma.pageSectionTranslation.update({
        where: { id: translation.id },
        data: { body: original },
      });
      await revalidate();
    }
  });
});
