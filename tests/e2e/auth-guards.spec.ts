import { expect, test } from '@playwright/test';

/**
 * The authentication boundary.
 *
 * These run without any Supabase credentials on purpose: they assert what
 * happens to someone who is NOT signed in, which is the case that matters most
 * and the one easiest to break by accident.
 */

const ADMIN_ROUTES = [
  '/admin',
  '/admin/projects',
  '/admin/projects/new',
  '/admin/insights',
  '/admin/media',
  '/admin/settings',
  '/admin/inquiries',
];

test.describe('admin routes are closed to anonymous visitors', () => {
  for (const route of ADMIN_ROUTES) {
    test(`${route} redirects to the login page`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/admin\/login/);
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    });
  }

  test('the login page keeps the intended destination', async ({ page }) => {
    await page.goto('/admin/settings');
    // So the admin lands where they were going once signed in.
    await expect(page).toHaveURL(/next=%2Fadmin%2Fsettings/);
  });
});

test.describe('admin API rejects unauthenticated callers', () => {
  const ADMIN_ENDPOINTS = [
    '/api/admin/projects',
    '/api/admin/services',
    '/api/admin/team',
    '/api/admin/insights',
    '/api/admin/categories',
    '/api/admin/social-links',
    '/api/admin/media',
    '/api/admin/settings',
    '/api/admin/inquiries',
    '/api/admin/stats',
    '/api/auth/session',
  ];

  for (const endpoint of ADMIN_ENDPOINTS) {
    test(`GET ${endpoint} returns 401`, async ({ request }) => {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error.code).toBe('UNAUTHENTICATED');
    });
  }

  test('POST to a write endpoint returns 401, not a validation error', async ({ request }) => {
    // Order matters: authentication must be checked before the body is parsed,
    // otherwise the error message tells an anonymous caller the payload shape.
    const response = await request.post('/api/admin/projects', {
      data: { slug: 'should-not-be-created' },
    });

    expect(response.status()).toBe(401);
  });

  test('DELETE is refused', async ({ request }) => {
    const response = await request.delete('/api/admin/projects/any-id');
    expect(response.status()).toBe(401);
  });
});

test.describe('cross-site protection', () => {
  test('a mutation from another origin is rejected', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      headers: { origin: 'https://evil.example.com', 'sec-fetch-site': 'cross-site' },
      data: { email: 'someone@example.com', password: 'password123' },
    });

    expect(response.status()).toBe(403);
  });
});
