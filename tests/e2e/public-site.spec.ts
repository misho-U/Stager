import { expect, test } from '@playwright/test';

import adminKa from '@pkg/i18n/messages/admin.ka.json';

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

  test('the dashboard declares the language of its own interface', async ({ page }) => {
    // Admin routes have no locale segment, so the page must say which language
    // its interface is in: English text once went out as lang="ka", and screen
    // readers pronounced it as Georgian. Georgian until the admin picks
    // English; admin-i18n.spec.ts covers the choice.
    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { name: adminKa.signIn.title })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  });

  test('a missing page answers in the language of its URL', async ({ page }) => {
    // The 404 copy was English everywhere, so /ka served it under lang="ka".
    const ka = await page.goto('/ka/no-such-page');
    expect(ka?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'გვერდი ვერ მოიძებნა' })).toBeVisible();

    const en = await page.goto('/en/no-such-page');
    expect(en?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
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
const MTAVRULI_FILE = /bpg[_-]nino[_-]mtavruli(?![_-]bold)/i;
const NOTO_GEORGIAN_FILE = /noto[_-]sans[_-]georgian[_-]georgian/i;
const LATIN_FILE = /noto[_-]sans[_-]georgian[_-]latin(?![_-]ext)/i;
const LATIN_EXT_FILE = /noto[_-]sans[_-]georgian[_-]latin[_-]ext/i;

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

    // And that text resolves to the bundled families first, not a system
    // stack: on a Georgian page, the Georgian letters' face, Noto's Latin
    // raised onto its line ('Stager Latin'), then Noto for the rest.
    const fontFamily = await page
      .getByTestId('hero-heading')
      .evaluate((node) => getComputedStyle(node).fontFamily);

    expect(fontFamily).toMatch(/^"?BPG Nino Mtavruli"?, "?Stager Latin"?, "?Noto Sans Georgian"?,/);
  });

  test('an English page keeps Noto as it is, and never loads the raised copy', async ({ page }) => {
    // The raised Latin is for Georgian pages only (brandbook.css,
    // 'Stager Latin'); English text is the original Noto files.
    const raised: string[] = [];
    page.on('request', (request) => {
      if (/stager[_-]latin/i.test(request.url())) raised.push(request.url());
    });
    await page.goto('/en');
    await expect(page.getByTestId('hero-heading')).toBeVisible();
    const english = await page
      .getByTestId('hero-heading')
      .evaluate((node) => getComputedStyle(node).fontFamily);
    expect(english).toMatch(/^"?BPG Nino Mtavruli"?, "?Noto Sans Georgian"?,/);
    await page.evaluate(() => document.fonts.ready);
    expect(raised).toEqual([]);
  });

  test('a Latin word in a Georgian line sits on the line with it', async ({ page }) => {
    // BPG Nino Mtavruli draws its letters a little above the baseline; Noto's
    // Latin sits on it, so "რატომ STAGER" read as two lines out of step. On
    // a Georgian page Latin is Noto raised onto BPG's line, and both
    // scripts' letters end within a pixel of each other at 48px.
    await page.goto('/ka');
    await page.evaluate(() => document.fonts.ready);
    const gap = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.fontSize = '48px';
      document.querySelector('[data-site] main')?.append(probe);
      const bottom = (text: string) => {
        const canvas = document.createElement('canvas').getContext('2d')!;
        canvas.font = `48px ${getComputedStyle(probe).fontFamily}`;
        return canvas.measureText(text).actualBoundingBoxDescent;
      };
      const result = Math.abs(bottom('ა') - bottom('H'));
      probe.remove();
      return result;
    });
    expect(gap).toBeLessThan(1.5);
  });

  test('Georgian and Latin text both render in the bundled typefaces', async ({ page }) => {
    // Latin text once rendered in Arial: next/font gave every face a generated
    // "<name> Fallback" family — local(Arial) with no unicode-range — and the
    // first one in the chain matched every Latin character. The typefaces are
    // now declared in brandbook.css, split by unicode-range: Georgian letters
    // in BPG Nino Mtavruli, everything else in Noto Sans Georgian, with
    // nothing ahead of them.
    const fontFiles: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.endsWith('.woff2')) fontFiles.push(url);
    });

    await page.goto('/ka');
    await expect(page.getByTestId('wordmark')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const fetched = (subset: RegExp) => fontFiles.some((url) => subset.test(url));
    expect(fetched(MTAVRULI_FILE), 'the Georgian letters were not fetched').toBe(true);
    expect(fetched(LATIN_FILE), 'Latin subset was not fetched').toBe(true);

    // Loaded, not merely requested: false here means the text is on a
    // system fallback.
    const loaded = await page.evaluate(() => ({
      latin: document.fonts.check('16px "Noto Sans Georgian"', 'STAGER'),
      georgian: document.fonts.check('16px "BPG Nino Mtavruli"', 'ქართული'),
    }));
    expect(loaded).toEqual({ latin: true, georgian: true });

    // The wordmark is the brand face on every page, Georgian ones included.
    const chain = await page
      .getByTestId('wordmark')
      .evaluate((node) => getComputedStyle(node).fontFamily);
    expect(chain, `something precedes the brand face in: ${chain}`).toMatch(
      /^"?Noto Sans Georgian"?,/,
    );
  });

  test('the typeface files are split by script', async ({ page }) => {
    // The unicode-range split means a page downloads a file only when it
    // contains that script. The sign-in page has Georgian letters and basic
    // Latin but no extended Latin and no Georgian beyond the Mtavruli
    // face's letters, so fetching either of those files there means the
    // split has been lost and every page is paying for every script. (No
    // page is Latin-only any more: every language switch shows ქა or ქარ.)
    const fontFiles: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('.woff2')) fontFiles.push(request.url());
    });

    await page.goto('/admin/login');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    expect(fontFiles.some((url) => MTAVRULI_FILE.test(url))).toBe(true);
    expect(fontFiles.some((url) => LATIN_FILE.test(url))).toBe(true);
    expect(fontFiles.filter((url) => LATIN_EXT_FILE.test(url))).toEqual([]);
    expect(fontFiles.filter((url) => NOTO_GEORGIAN_FILE.test(url))).toEqual([]);
  });
});
