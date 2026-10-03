import { expect, test, type Page } from '@playwright/test';

import adminEn from '@pkg/i18n/messages/admin.en.json';

import { ADMIN_SESSION, CREDENTIALS_PRESENT } from './admin-session';

/**
 * When the dashboard cannot load something it says so, with Try again, and
 * never offers what would do harm instead: an empty list that reads "nothing
 * yet", or a blank form whose Save would overwrite the real record. A save the
 * form's own checks stop says so, and leaving unsaved changes asks first.
 *
 * Failures are made in the browser (`page.route`), so nothing real breaks.
 */

test.skip(!CREDENTIALS_PRESENT, 'Requires an authenticated admin session.');
test.use({ storageState: ADMIN_SESSION });

/** Answers the browser's GETs to one admin endpoint with a server error. */
async function failGets(page: Page, pattern: string | RegExp) {
  await page.route(pattern, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'INTERNAL', message: 'Something went wrong' } }),
        })
      : route.fallback(),
  );
}

test('a list that failed to load says so, not "nothing yet", and Try again recovers', async ({
  page,
}) => {
  await failGets(page, /\/api\/admin\/projects$/);
  await page.goto('/admin/projects');

  const failed = page.getByTestId('load-failed');
  // The client retries a server error twice before giving up.
  await expect(failed).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(adminEn.projects.emptyTitle)).toHaveCount(0);

  await page.unroute(/\/api\/admin\/projects$/);
  await failed.getByRole('button', { name: adminEn.common.retry }).click();
  await expect(failed).toBeHidden();
});

test('an edit form whose record failed to load offers no form to save', async ({ page }) => {
  const list = await page.request.get('/api/admin/projects');
  const [first] = ((await list.json()) as { items: Array<{ id: string }> }).items;
  test.skip(!first, 'Needs one project to open.');

  await failGets(page, new RegExp(`/api/admin/projects/${first!.id}$`));
  await page.goto(`/admin/projects/${first!.id}`);

  await expect(page.getByTestId('load-failed')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: adminEn.common.save })).toHaveCount(0);
  await expect(page.locator('form')).toHaveCount(0);
});

test('a save the form refuses says so above the form', async ({ page }) => {
  await page.goto('/admin/projects/new');
  await page.getByRole('button', { name: adminEn.common.save }).first().click();
  await expect(page.getByText(adminEn.errors.validationFailed)).toBeVisible();
});

test('leaving unsaved changes asks first, and staying keeps them', async ({ page }) => {
  await page.goto('/admin/projects/new');
  const title = page.getByLabel(adminEn.fields.title).first();
  await title.fill('Unsaved work');

  const asked = page.waitForEvent('dialog');
  await page
    .getByRole('navigation', { name: adminEn.sidebar.label })
    .getByRole('link', { name: adminEn.sidebar.nav.services })
    .click();
  const dialog = await asked;
  expect(dialog.message()).toBe(adminEn.common.unsavedChanges);
  await dialog.dismiss();

  await expect(page).toHaveURL(/\/admin\/projects\/new$/);
  await expect(title).toHaveValue('Unsaved work');
});
