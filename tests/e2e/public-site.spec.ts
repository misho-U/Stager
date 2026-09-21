import { expect, test } from '@playwright/test';

/**
 * The public shell.
 *
 * The page itself is a scaffold awaiting design, so these assert the things
 * that will still be true afterwards: locale routing, security headers, and
 * that the page renders content coming from the database.
 */

test.describe('locale routing', () => {
  test('the root redirects to Georgian', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/ka$/);
  });

  test('both locales render', async ({ page }) => {
    await page.goto('/ka');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ka');

    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('the language switcher keeps the visitor on the same page', async ({ page }) => {
    await page.goto('/ka');
    await page.getByRole('link', { name: 'ENG' }).click();
    await expect(page).toHaveURL(/\/en$/);
  });

  test('an unknown locale 404s rather than silently falling back', async ({ page }) => {
    const response = await page.goto('/de');
    expect(response?.status()).toBe(404);
  });
});

test.describe('content comes from the database', () => {
  test('the homepage renders seeded content', async ({ page }) => {
    await page.goto('/ka');

    // Seeded by prisma/seed.ts via the HOME page's hero section.
    await expect(page.getByTestId('hero-heading')).toBeVisible();
    await expect(page.getByTestId('hero-heading')).not.toBeEmpty();
  });

  test('published projects are listed', async ({ page }) => {
    await page.goto('/ka');

    const list = page.getByTestId('project-list');
    await expect(list).toBeVisible();
    await expect(page.getByTestId('project-title').first()).not.toBeEmpty();
  });
});

test.describe('security headers', () => {
  test('the public site sends a locked-down CSP and the standard headers', async ({ page }) => {
    const response = await page.goto('/ka');
    const headers = response?.headers() ?? {};

    const csp = headers['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    // Next.js advertises its presence by default; we turn that off.
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('the admin login page sends a nonce-based CSP', async ({ page }) => {
    const response = await page.goto('/admin/login');
    const csp = response?.headers()['content-security-policy'] ?? '';

    expect(csp).toContain("'nonce-");
    expect(csp).toContain("'strict-dynamic'");
  });

  test('the dashboard is excluded from search engines', async ({ page }) => {
    await page.goto('/admin/login');
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute('content', /noindex/);
  });
});

test.describe('typography', () => {
  test('the Georgian typeface is self-hosted, not fetched from Google', async ({ page }) => {
    const externalFontRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
        externalFontRequests.push(url);
      }
    });

    await page.goto('/ka');
    await expect(page.getByTestId('hero-heading')).toBeVisible();

    // A build on a machine that cannot reach Google silently falls back to a
    // system font, which wrecks Georgian text. Self-hosting is what prevents
    // that, so this asserts the site never reaches for Google at all.
    expect(externalFontRequests).toEqual([]);

    // And that the face actually resolves to the bundled family rather than a
    // bare system stack.
    const fontFamily = await page
      .getByTestId('hero-heading')
      .evaluate((node) => getComputedStyle(node).fontFamily);

    expect(fontFamily).toMatch(/notoGeorgian|noto/i);
  });
});
