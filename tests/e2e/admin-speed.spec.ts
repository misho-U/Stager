import { readdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page, type Request } from '@playwright/test';

import adminEn from '@pkg/i18n/messages/admin.en.json';

import { ADMIN_SESSION, CREDENTIALS_PRESENT } from './admin-session';

/**
 * The dashboard moves instantly: after sign-in it loads every list in the
 * background, a page opened from the menu draws from memory, and anything
 * still loading shows the shape of what is coming. Signing out leaves by a
 * full page load, so none of what was kept survives it.
 *
 * Prefetching runs only in a production build (`next start`), as in CI.
 */

const DASHBOARD_ROOT = path.join('src', 'app', 'admin', '(dashboard)');

/** Every folder under the dashboard that holds a page. */
function pageFolders(dir = DASHBOARD_ROOT): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const here = entries.some((entry) => entry.isFile() && entry.name === 'page.tsx') ? [dir] : [];
  return [
    ...here,
    ...entries
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => pageFolders(path.join(dir, entry.name))),
  ];
}

test('every dashboard page has a loading state of its own', () => {
  // Beside its page, not above it: a section's loading.tsx also covers the
  // pages nested in it, so the list's skeleton would stand in for an edit form.
  // List pages sit in a (list) group for that reason.
  const folders = pageFolders();
  expect(folders.length).toBeGreaterThan(20);
  for (const folder of folders) {
    const files = readdirSync(folder);
    expect(files, folder).toContain('loading.tsx');
  }
});

/** Every admin GET the browser makes, by path (and query, for the inbox). */
function recordAdminReads(page: Page): Set<string> {
  const seen = new Set<string>();
  page.on('request', (request: Request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname.startsWith('/api/admin/')) {
      seen.add(url.pathname + url.search);
    }
  });
  return seen;
}

/** The list each menu page shows first, and the ones its forms read beside it. */
const FIRST_READS = [
  '/api/admin/stats',
  '/api/admin/projects',
  '/api/admin/insights',
  '/api/admin/services',
  '/api/admin/courses',
  '/api/admin/videos',
  '/api/admin/team',
  '/api/admin/media',
  '/api/admin/pages',
  '/api/admin/social-links',
  '/api/admin/settings',
  '/api/admin/inquiries?view=inbox',
  '/api/admin/categories',
  '/api/admin/course-categories',
  '/api/admin/company-stats',
];

test.describe('signed in', () => {
  test.skip(!CREDENTIALS_PRESENT, 'Requires an authenticated admin session.');
  test.use({ storageState: ADMIN_SESSION });

  test('after sign-in, every list loads before its page is opened', async ({ page }) => {
    const reads = recordAdminReads(page);
    await page.goto('/admin');

    await expect
      .poll(() => FIRST_READS.filter((read) => !reads.has(read)), { timeout: 15_000 })
      .toEqual([]);
  });

  test('a page opened from the menu appears at once, its list from memory', async ({ page }) => {
    const isPageRequest = (request: Request, pathname: string) =>
      new URL(request.url()).pathname === pathname &&
      Boolean(request.headers()['rsc']) &&
      !request.headers()['next-router-prefetch'];
    // The menu's link fetches the whole page ahead (`prefetch` on the Link).
    const pagePrefetched = page.waitForResponse((response) =>
      isPageRequest(response.request(), '/admin/projects'),
    );
    const reads = recordAdminReads(page);
    await page.goto('/admin');
    await pagePrefetched;
    await expect.poll(() => reads.has('/api/admin/projects'), { timeout: 15_000 }).toBe(true);

    // From here the server is slow: a click that waited for it would take
    // three seconds. Opening the page may refresh it in the background.
    await page.route('**/admin/projects', async (route) => {
      if (isPageRequest(route.request(), '/admin/projects')) {
        await new Promise((resolve) => setTimeout(resolve, 3_000));
      }
      await route.fallback();
    });
    let projectReadsAfterClick = 0;
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (request.method() === 'GET' && url.pathname === '/api/admin/projects') {
        projectReadsAfterClick += 1;
      }
    });

    await page
      .getByRole('navigation', { name: adminEn.sidebar.label })
      .getByRole('link', { name: adminEn.sidebar.nav.projects })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: adminEn.projects.title })).toBeVisible(
      { timeout: 1_500 },
    );
    await expect(page).toHaveURL('/admin/projects');
    await expect(page.getByTestId('skeleton')).toHaveCount(0);
    // Current for five minutes, so opening it asked the API for nothing.
    expect(projectReadsAfterClick).toBe(0);
  });

  test('a list still loading shows the shape of its rows, then the rows', async ({ page }) => {
    await page.route('**/api/admin/projects', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await route.fallback();
    });
    await page.goto('/admin/projects');

    // The visible one: while the page streams in, the section's skeleton and
    // the list's own can both be in the document for a moment, one hidden.
    const skeleton = page.getByTestId('skeleton').filter({ visible: true });
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute('aria-busy', 'true');
    // Said once, to a screen reader; the bars themselves are hidden from it.
    await expect(page.getByRole('status').filter({ hasText: adminEn.common.loading })).toHaveCount(
      1,
    );

    await expect(skeleton).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText(adminEn.common.loading)).toHaveCount(0);
  });

  test('the overview loads its counts in the browser, and says so when it cannot', async ({
    page,
  }) => {
    const counts = {
      projects: 7,
      insights: 0,
      services: 0,
      courses: 0,
      videos: 0,
      teamMembers: 0,
      newInquiries: 0,
    };
    await page.route('**/api/admin/stats', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(counts) }),
    );
    await page.goto('/admin');
    const projects = page.getByRole('link', {
      name: new RegExp(`7\\s*${adminEn.sidebar.nav.projects}`),
    });
    await expect(projects).toBeVisible();

    await page.unroute('**/api/admin/stats');
    await page.route('**/api/admin/stats', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INTERNAL', message: 'Something went wrong' } }),
      }),
    );
    await page.reload();
    await expect(page.getByText(adminEn.dashboard.countsFailed)).toBeVisible({ timeout: 15_000 });
  });

  test('signing out leaves by a full page load', async ({ page }) => {
    // The sign-out itself is answered here: a real one would end the session
    // every other test shares (admin-session.ts).
    await page.route('**/api/auth/logout', (route) => route.fulfill({ status: 204 }));
    await page.goto('/admin');

    const documentLoad = page.waitForRequest(
      (request) =>
        request.resourceType() === 'document' && new URL(request.url()).pathname === '/admin/login',
    );
    await page
      .getByRole('navigation', { name: adminEn.sidebar.label })
      .getByRole('button', { name: adminEn.sidebar.signOut })
      .click();
    // A client navigation would fetch the login page as data, not as a document.
    await documentLoad;
  });
});
