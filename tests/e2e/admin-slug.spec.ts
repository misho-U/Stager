import { expect, test, type Locator, type Page } from '@playwright/test';

import { slugify } from '@/shared/constants/content';
import { SLUG_PATTERN } from '@/shared/types/api';
import adminEn from '@pkg/i18n/messages/admin.en.json';

import { ADMIN_SESSION, CREDENTIALS_PRESENT } from './admin-session';

/**
 * The slug fills in from the English title (or name) while an item is being
 * created, stops once someone edits it by hand, and is never changed for an
 * item that is already saved: links to a published page may be out there.
 */

test.describe('slugify', () => {
  test('makes a web-address ending from an English title', () => {
    expect(slugify('Kitchen Renovation')).toBe('kitchen-renovation');
    expect(slugify("Chef's Table — Tbilisi")).toBe('chefs-table-tbilisi');
    expect(slugify('Café Crème Brûlée')).toBe('cafe-creme-brulee');
    expect(slugify('  HACCP / Food Safety 2026 ')).toBe('haccp-food-safety-2026');
  });

  test('drops Georgian, which is why it follows the English title', () => {
    expect(slugify('სამზარეულოს განახლება')).toBe('');
  });

  test('stays within the slug rules at the length limit', () => {
    const slug = slugify(`${'x'.repeat(119)} yz`);
    expect(slug).toBe('x'.repeat(119));
    expect(slug).toMatch(SLUG_PATTERN);
  });
});

/** A field by its whole label, required mark allowed. */
const labelled = (text: string) =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*?$`);

/**
 * Types at the end of a field, the way a person clicks there first. Playwright
 * refocuses a field with the caret at the start, so appended text would land
 * in front.
 */
async function append(field: Locator, text: string) {
  await field.press('End');
  await field.pressSequentially(text);
}

async function editEnglish(page: Page) {
  await page
    .getByRole('group', { name: adminEn.contentLocale.label })
    .getByRole('button', { name: 'English' })
    .click();
}

test.describe('slug auto-fill', () => {
  test.skip(!CREDENTIALS_PRESENT, 'Requires an authenticated admin session.');
  // The shared session is in English (admin-session.setup.ts). Nothing here
  // saves: every check happens in the form.
  test.use({ storageState: ADMIN_SESSION });

  const FORMS = [
    { item: 'project', path: '/admin/projects/new', source: adminEn.fields.title },
    { item: 'article', path: '/admin/insights/new', source: adminEn.fields.title },
    { item: 'service', path: '/admin/services/new', source: adminEn.fields.title },
    { item: 'team member', path: '/admin/team/new', source: adminEn.team.form.name },
  ];

  for (const { item, path, source } of FORMS) {
    test(`a new ${item}: follows the English ${source.toLowerCase()} until edited by hand`, async ({
      page,
    }) => {
      await page.goto(path);
      const slug = page.getByLabel(labelled(adminEn.fields.slug.label));
      const english = page.locator('[data-content-locale="EN"]').getByLabel(labelled(source));
      const georgian = page.locator('[data-content-locale="KA"]').getByLabel(labelled(source));

      // Georgian alone gives it nothing.
      await georgian.fill('სამზარეულოს განახლება');
      await expect(slug).toHaveValue('');

      await editEnglish(page);
      await english.fill('Kitchen Renovation');
      await expect(slug).toHaveValue('kitchen-renovation');
      await append(english, ' in Tbilisi');
      await expect(slug).toHaveValue('kitchen-renovation-in-tbilisi');

      // A hand edit wins from then on.
      await slug.fill('kitchen-refit');
      await append(english, ' 2026');
      await expect(slug).toHaveValue('kitchen-refit');

      // Emptying it hands it back to the title.
      await slug.fill('');
      await append(english, ' again');
      await expect(slug).toHaveValue('kitchen-renovation-in-tbilisi-2026-again');
    });
  }

  test('a published item: editing its English title never changes its slug', async ({ page }) => {
    await page.goto('/admin/services');
    await page
      .locator('tr', { hasText: adminEn.status.PUBLISHED })
      .first()
      .getByRole('link')
      .first()
      .click();

    const slug = page.getByLabel(labelled(adminEn.fields.slug.label));
    const english = page
      .locator('[data-content-locale="EN"]')
      .getByLabel(labelled(adminEn.fields.title));
    // The form fills itself once the record loads. Under `pnpm dev` the first
    // visit compiles the page and its API route, which can take longer than
    // the default five seconds.
    await expect(slug).not.toHaveValue('', { timeout: 20_000 });
    const saved = await slug.inputValue();

    await editEnglish(page);
    await english.fill('A completely different title');
    await expect(slug).toHaveValue(saved);
    // And the help text does not promise otherwise.
    await expect(page.getByText(adminEn.fields.slug.autoFromTitle)).toHaveCount(0);
  });

  test('categories: follows the English name while adding, never while editing', async ({
    page,
  }) => {
    await page.goto('/admin/categories');
    const slug = page.getByLabel(labelled(adminEn.fields.slug.label));
    const english = page.getByLabel(labelled(adminEn.categories.nameEn));

    await english.fill('Food Safety');
    await expect(slug).toHaveValue('food-safety');

    // Editing a saved category leaves its slug alone.
    await page.getByRole('button', { name: adminEn.common.edit }).first().click();
    await expect(slug).not.toHaveValue('food-safety');
    const saved = await slug.inputValue();
    await english.fill('Renamed in English');
    await expect(slug).toHaveValue(saved);

    // Back to adding: it follows the name again.
    await page.getByRole('button', { name: adminEn.common.cancelEdit }).click();
    await english.fill('Menu Engineering');
    await expect(slug).toHaveValue('menu-engineering');
  });
});
