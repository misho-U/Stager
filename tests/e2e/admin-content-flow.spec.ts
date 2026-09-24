import { expect, test } from '@playwright/test';

/**
 * The whole point of the build: an admin edits content and the public site
 * changes, with no redeploy.
 *
 * Requires a real Supabase project and an account on the AdminUser allowlist,
 * so it is skipped unless credentials are supplied:
 *
 *   E2E_ADMIN_EMAIL=you@stager.ge E2E_ADMIN_PASSWORD=… pnpm test:e2e
 *
 * Skipping rather than failing is deliberate — a missing local credential is
 * not a broken build, and a suite that always fails is a suite nobody reads.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

const CREDENTIALS_PRESENT = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

test.describe('admin content flow', () => {
  test.skip(
    !CREDENTIALS_PRESENT,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the authenticated flow.',
  );

  // The suite creates, publishes and deletes one project in order.
  test.describe.configure({ mode: 'serial' });

  const slug = `e2e-${Date.now()}`;
  const titleKa = `E2E ქეისი ${slug}`;
  const titleEn = `E2E case study ${slug}`;

  test('signs in', async ({ page }) => {
    await page.goto('/admin/login');

    await page.getByLabel('Email').fill(ADMIN_EMAIL!);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('navigation', { name: 'Dashboard' })).toBeVisible();

    await page.context().storageState({ path: 'tests/e2e/.auth/admin.json' });
  });

  test('creates and publishes a project', async ({ page }) => {
    await page.goto('/admin/projects/new');

    // Georgian tab is open by default.
    await page.getByLabel('Title').fill(titleKa);
    await page.getByLabel('Summary').fill('Created by the end-to-end test.');

    await page.getByRole('tab', { name: 'English' }).click();
    await page.getByLabel('Title').nth(1).fill(titleEn);

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

  test('a disallowed file type is refused', async ({ page, request }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL!);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');

    // Registering a Media row for a PDF must be refused even with a valid
    // session — the upload token's own allowlist is not the only control.
    const response = await request.post('/api/admin/media', {
      headers: { cookie: cookieHeader },
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

  test('a media URL outside the blob store is refused', async ({ page, request }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL!);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');

    const response = await request.post('/api/admin/media', {
      headers: { cookie: cookieHeader },
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

  // admin-theme.spec.ts covers the wiring without credentials, by presetting
  // the cookie. This covers the one part it cannot reach: the switch itself,
  // which only renders inside the dashboard.
  test('a choice applies at once and survives a reload', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL!);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    const colorScheme = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    const dark = page.getByRole('button', { name: 'Dark', exact: true });

    await dark.click();
    expect(await colorScheme()).toBe('dark');

    await page.reload();
    await expect(dark).toHaveAttribute('aria-pressed', 'true');
    expect(await colorScheme()).toBe('dark');

    await page.getByRole('button', { name: 'Light', exact: true }).click();
    expect(await colorScheme()).toBe('normal');
  });
});
