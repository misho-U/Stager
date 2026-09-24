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

    // `not.toBeEmpty()` alone used to pass against a hardcoded fallback string
    // that happened to match the seeded copy, so a completely dead API looked
    // like a healthy page. These two assert the content is real.
    await expect(page.getByTestId('read-failure')).toHaveCount(0);
    await expect(page.getByTestId('hero-heading')).not.toHaveText('[no hero heading set]');
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

// Emitted font file names carry a hash, and dev and production builds may join
// the words with "-" or "_".
const GEORGIAN_FILE = /noto[_-]sans[_-]georgian[_-]georgian/i;
const LATIN_FILE = /noto[_-]sans[_-]georgian[_-]latin(?![_-]ext)/i;

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

    // And that text resolves to the bundled family first, not a system stack.
    const fontFamily = await page
      .getByTestId('hero-heading')
      .evaluate((node) => getComputedStyle(node).fontFamily);

    expect(fontFamily).toMatch(/^"?Noto Sans Georgian"?,/);
  });

  test('Georgian and Latin text both render in the bundled typeface', async ({ page }) => {
    // Latin text once rendered in Arial: next/font gave every face a generated
    // "<name> Fallback" family — local(Arial) with no unicode-range — and the
    // first one in the chain matched every Latin character. The typeface is
    // now declared once, in brandbook.css, as a single family whose three
    // files are split by unicode-range, so no fallback sits ahead of it.
    const fontFiles: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.endsWith('.woff2')) fontFiles.push(url);
    });

    await page.goto('/ka');
    await expect(page.getByTestId('wordmark')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const fetched = (subset: RegExp) => fontFiles.some((url) => subset.test(url));
    expect(fetched(GEORGIAN_FILE), 'Georgian subset was not fetched').toBe(true);
    expect(fetched(LATIN_FILE), 'Latin subset was not fetched').toBe(true);

    // Loaded, not merely requested: false here means the text is on a
    // system fallback.
    const loaded = await page.evaluate(() => ({
      latin: document.fonts.check('16px "Noto Sans Georgian"', 'STAGER'),
      georgian: document.fonts.check('16px "Noto Sans Georgian"', 'ქართული'),
    }));
    expect(loaded).toEqual({ latin: true, georgian: true });

    const chain = await page
      .getByTestId('wordmark')
      .evaluate((node) => getComputedStyle(node).fontFamily);
    expect(chain, `something precedes the bundled family in: ${chain}`).toMatch(
      /^"?Noto Sans Georgian"?,/,
    );
  });

  test('the typeface files are split by script', async ({ page }) => {
    // The unicode-range split means a page downloads a file only when it
    // contains that script. The login page has no Georgian text, so fetching
    // the Georgian file there means the split has been lost and every page
    // is paying for every script.
    const fontFiles: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('.woff2')) fontFiles.push(request.url());
    });

    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    expect(fontFiles.some((url) => LATIN_FILE.test(url))).toBe(true);
    expect(fontFiles.filter((url) => GEORGIAN_FILE.test(url))).toEqual([]);
  });
});
