import { readdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import adminEn from '@pkg/i18n/messages/admin.en.json';
import en from '@pkg/i18n/messages/en.json';

import { ADMIN_SESSION, CREDENTIALS_PRESENT } from './admin-session';
import {
  DB_WRITES_ALLOWED,
  DB_WRITES_SKIP_REASON,
  disconnectTestPrisma,
  testPrisma,
} from './db-guard';

/**
 * What a keyboard alone must be able to do: skip past the menus, follow an
 * in-page link and carry on from where it led, delete something without being
 * thrown back to the top of the page, and never stop twice on one control.
 */

/** Whether keyboard focus is inside (or on) the element `selector` finds. */
const focusIsIn = (page: Page, selector: string) =>
  page.evaluate((target) => Boolean(document.activeElement?.closest(target)), selector);

/** Tab once from the top of the page: the skip link, on screen, then into the content. */
async function skipToContent(page: Page, label: string) {
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: label });
  await expect(skip).toBeFocused();
  // Shown while it has focus, not left clipped to a pixel.
  expect((await skip.boundingBox())?.width ?? 0).toBeGreaterThan(40);

  await page.keyboard.press('Enter');
  await expect(page.locator('main#content')).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await focusIsIn(page, 'main'), 'the next Tab stays in the content').toBe(true);
}

test.describe('the public site', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'a keyboard: the desktop browser');
  });

  for (const variant of ['1', '2']) {
    test(`design ${variant}: the first Tab offers a skip to the content`, async ({ page }) => {
      await page.goto(`/en?v=${variant}`);
      await expect(page.locator(`[data-home-variant="${variant}"]`)).toHaveAttribute(
        'data-motion',
        'on',
      );
      await skipToContent(page, en.common.skipToContent);
    });

    test(`design ${variant}: Start a Project takes the keyboard to the form`, async ({ page }) => {
      // With smooth scrolling on, which takes over the browser's own jump.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(`/en?v=${variant}`);
      await expect(page.locator(`[data-home-variant="${variant}"]`)).toHaveAttribute(
        'data-motion',
        'on',
      );

      await page.locator('main a[href="#inquiry"]').first().focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#inquiry')).toBeFocused();
      // The next Tab goes on from the form, not back up to the hero.
      await page.keyboard.press('Tab');
      expect(await focusIsIn(page, '#inquiry')).toBe(true);
    });
  }
});

/** The dashboard pages without a record in their address, found on disk. */
function dashboardPages(dir = path.join('src', 'app', 'admin', '(dashboard)')): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name.startsWith('[') ? [] : dashboardPages(full);
    if (entry.name !== 'page.tsx') return [];
    const segments = path
      .relative(path.join('src', 'app', 'admin', '(dashboard)'), dir)
      .split(path.sep)
      .filter(Boolean);
    return [['/admin', ...segments].join('/')];
  });
}

test.describe('the dashboard', () => {
  test.skip(!CREDENTIALS_PRESENT, 'Requires an authenticated admin session.');
  test.use({ storageState: ADMIN_SESSION });
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'a keyboard: the desktop browser');
  });

  test('the first Tab offers a skip past the menu', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('navigation', { name: adminEn.sidebar.label })).toBeVisible();
    await skipToContent(page, adminEn.common.skipToContent);
  });

  test('no control sits inside another, on any page', async ({ page }) => {
    // A button inside a link is two stops for one action, and invalid HTML.
    const pages = dashboardPages();
    expect(pages.length).toBeGreaterThan(10);
    for (const url of pages) {
      await page.goto(url);
      await expect(page.locator('main#content')).toBeVisible();
      await expect(page.getByText(adminEn.common.loading)).toHaveCount(0);
      const nested = await page
        .locator(':is(a[href], button) :is(a[href], button, input, select, textarea)')
        .count();
      expect(nested, url).toBe(0);
    }
  });

  test.describe('deleting', () => {
    test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
    const slug = `e2e-${Date.now()}-keyboard`;

    test.afterAll(async () => {
      await testPrisma().category.deleteMany({ where: { slug } });
      await disconnectTestPrisma();
    });

    test('focus moves with the buttons, and after the delete, to the content', async ({ page }) => {
      const name = `E2E keyboard ${slug}`;
      const created = await page.request.post('/api/admin/categories', {
        data: { slug, translations: { KA: { name }, EN: { name } } },
      });
      expect(created.status(), await created.text()).toBe(201);

      await page.goto('/admin/insights/categories');
      const row = page.locator('tr', { hasText: name });
      const remove = row.getByRole('button', { name: adminEn.common.delete });
      await remove.focus();

      // Delete hands focus to Confirm…
      await page.keyboard.press('Enter');
      await expect(row.getByRole('button', { name: adminEn.common.confirm })).toBeFocused();
      // …Cancel hands it back to Delete…
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await expect(remove).toBeFocused();
      // …and once the row is gone, the content has it, not the top of the page.
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await expect(row).toHaveCount(0);
      await expect(page.locator('main#content')).toBeFocused();
    });
  });
});
