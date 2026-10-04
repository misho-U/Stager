import { expect, test } from '@playwright/test';

import { ADMIN_SESSION, CREDENTIALS_PRESENT } from './admin-session';
import { DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON } from './db-guard';

/**
 * The whole point of the build: an admin edits content and the public site
 * changes, with no redeploy.
 *
 * Requires a real Supabase project and an account on the AdminUser allowlist,
 * so it is skipped unless credentials are supplied:
 *
 *   E2E_ADMIN_EMAIL=you@stager.ge E2E_ADMIN_PASSWORD=… pnpm test:e2e
 *
 * It writes to the database, so it runs only against a local one
 * (db-guard.ts). Every test starts signed in, from the session
 * admin-session.setup.ts saved.
 */

test.describe('admin content flow', () => {
  test.skip(
    !CREDENTIALS_PRESENT,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the authenticated flow.',
  );
  test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
  test.use({ storageState: ADMIN_SESSION });

  // The suite creates, publishes and deletes one project in order.
  test.describe.configure({ mode: 'serial' });

  const slug = `e2e-${Date.now()}`;
  const titleKa = `E2E ქეისი ${slug}`;
  const titleEn = `E2E case study ${slug}`;

  test('creates and publishes a project', async ({ page }) => {
    await page.goto('/admin/projects/new');

    // Both languages' fields stay mounted, the other one hidden, so each is
    // found in its own language's container — and by /^Title/, because "Meta
    // title" contains the word too.
    const georgian = page.locator('[data-content-locale="KA"]');
    const english = page.locator('[data-content-locale="EN"]');
    const editing = page.getByRole('group', { name: 'Editing:' });

    // A form opens on Georgian.
    await expect(editing.getByRole('button', { name: 'ქართული' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await georgian.getByLabel(/^Title/).fill(titleKa);
    await georgian.getByLabel('Summary').fill('Created by the end-to-end test.');

    await editing.getByRole('button', { name: 'English' }).click();
    await english.getByLabel(/^Title/).fill(titleEn);

    await page.getByLabel('Slug').fill(slug);
    await page.getByLabel('Status').selectOption('PUBLISHED');

    await page.getByRole('button', { name: 'Save project' }).click();

    await expect(page).toHaveURL(/\/admin\/projects$/);
    await expect(page.getByRole('link', { name: titleKa })).toBeVisible();
  });

  test('the new project appears on the public site without a redeploy', async ({ page }) => {
    // This is the assertion the whole caching design exists to satisfy: the
    // admin write called revalidateTag, so this first request must already be
    // fresh rather than serving the previously cached list.
    await page.goto('/ka');
    await expect(page.getByText(titleKa)).toBeVisible();

    await page.goto('/en');
    await expect(page.getByText(titleEn)).toBeVisible();
  });

  test('unpublishing removes it from the public site', async ({ page }) => {
    await page.goto('/admin/projects');
    await page.getByRole('link', { name: titleKa }).click();

    // The form mounts empty and fills itself once the record loads; a change
    // made before that would be overwritten.
    await expect(page.locator('[data-content-locale="KA"]').getByLabel(/^Title/)).toHaveValue(
      titleKa,
    );
    await page.getByLabel('Status').selectOption('DRAFT');
    await page.getByRole('button', { name: 'Save project' }).click();
    await expect(page).toHaveURL(/\/admin\/projects$/);

    await page.goto('/ka');
    await expect(page.getByText(titleKa)).toHaveCount(0);
  });

  test('deletes the project', async ({ page }) => {
    await page.goto('/admin/projects');

    const row = page.locator('tr', { hasText: titleKa });
    await row.getByRole('button', { name: 'Delete' }).click();
    await row.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByRole('link', { name: titleKa })).toHaveCount(0);
  });
});

test.describe('upload constraints', () => {
  test.skip(!CREDENTIALS_PRESENT, 'Requires an authenticated admin session.');
  test.use({ storageState: ADMIN_SESSION });

  // page.request sends the browser context's cookies, so these calls carry
  // the saved admin session.
  test('a disallowed file type is refused', async ({ page }) => {
    // Registering a Media row for a PDF must be refused even with a valid
    // session — the upload token's own allowlist is not the only control.
    const response = await page.request.post('/api/admin/media', {
      data: {
        url: 'https://example.public.blob.vercel-storage.com/media/evil.pdf',
        pathname: 'media/evil.pdf',
        contentType: 'application/pdf',
        size: 1024,
        alt: 'test',
      },
    });

    expect(response.status()).toBe(415);
  });

  test('a media URL outside the blob store is refused', async ({ page }) => {
    const response = await page.request.post('/api/admin/media', {
      data: {
        url: 'https://attacker.example.com/tracking-pixel.png',
        pathname: 'media/tracking-pixel.png',
        contentType: 'image/png',
        size: 1024,
        alt: 'test',
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('dashboard theme switch', () => {
  test.skip(!CREDENTIALS_PRESENT, 'Requires an authenticated admin session.');
  test.use({ storageState: ADMIN_SESSION });

  // admin-theme.spec.ts covers the wiring without credentials, by presetting
  // the cookie. This covers the one part it cannot reach: the switch itself,
  // which only renders inside the dashboard.
  test('offers light and dark, and a choice survives a reload', async ({ page }) => {
    // Nothing chosen yet, so the dashboard follows the operating system.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/admin');

    const colorScheme = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    const themeSwitch = page.getByRole('group', { name: 'Colour theme' });
    const light = themeSwitch.getByRole('button', { name: 'Light', exact: true });
    const dark = themeSwitch.getByRole('button', { name: 'Dark', exact: true });

    await expect(themeSwitch.getByRole('button')).toHaveCount(2);
    await expect(dark, 'shows the mode the OS picked').toHaveAttribute('aria-pressed', 'true');

    await light.click();
    await expect.poll(colorScheme).toBe('normal');

    // Saved: after a reload it still beats the operating system.
    await page.reload();
    await expect(light).toHaveAttribute('aria-pressed', 'true');
    expect(await colorScheme()).toBe('normal');

    await dark.click();
    await expect.poll(colorScheme).toBe('dark');
  });
});

test.describe('dashboard sidebar', () => {
  test.skip(!CREDENTIALS_PRESENT, 'Requires an authenticated admin session.');
  test.use({ storageState: ADMIN_SESSION });

  test('fits a small laptop screen and stays in view', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'desktop browser widths only');

    // A 1366×768 laptop, less the taskbar and the browser's tabs, toolbar and
    // bookmarks bar.
    await page.setViewportSize({ width: 1366, height: 600 });
    await page.goto('/admin');

    const sidebar = page.getByRole('navigation', { name: 'Dashboard' });
    const overflow = await sidebar.evaluate((nav) => nav.scrollHeight - nav.clientHeight);
    expect(overflow, 'the sidebar would need its own scrollbar').toBeLessThanOrEqual(0);

    // Pinned while a long page scrolls under it.
    await page.goto('/admin/settings');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(sidebar.getByRole('link', { name: 'Inquiries' })).toBeInViewport();
  });
});
