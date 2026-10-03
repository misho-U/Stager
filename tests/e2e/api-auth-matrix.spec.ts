import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * Every route handler and every dashboard page, found on disk, against someone
 * who is not signed in. A route added later is checked the moment it exists,
 * without anyone remembering to list it: this is what would catch a handler
 * written without `withAdmin`.
 *
 * auth-guards.spec.ts walks through the same boundary by hand, with readable
 * names; this one makes sure nothing is missed.
 */

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type Method = (typeof METHODS)[number];
const MUTATING = new Set<Method>(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * The routes outside /api/admin, each a deliberate decision. A new one fails
 * the test below until it is added here, as public, or moved under admin/.
 * Everything under /api/public/ is public by its place and may only read.
 */
const OUTSIDE_ADMIN: Record<string, Method[]> = {
  '/api/auth/login': ['POST'],
  '/api/auth/logout': ['POST'],
  '/api/auth/session': ['GET'],
  '/api/contact': ['POST'],
  '/api/cron/daily': ['GET'],
  '/api/dev/revalidate-probe': ['POST'],
  '/api/health': ['GET'],
};

function filesNamed(dir: string, name: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesNamed(full, name);
    return entry.name === name ? [full] : [];
  });
}

/** The URL a file under `root` answers at: route groups dropped, dynamic segments filled in. */
function urlFor(file: string, root: string, prefix: string): string {
  const segments = path
    .relative(root, path.dirname(file))
    .split(path.sep)
    .filter((segment) => segment && !/^\(.+\)$/.test(segment))
    .map((segment) => {
      if (segment === '[key]') return 'HOME';
      return /^\[.+\]$/.test(segment) ? 'e2e-missing' : segment;
    });
  return [prefix, ...segments].join('/');
}

/** The HTTP methods a route file exports, however it exports them. */
function exportedMethods(file: string): Method[] {
  const source = readFileSync(file, 'utf8');
  const names = new Set([
    ...[...source.matchAll(/export\s+(?:const|async\s+function|function)\s+(\w+)/g)].map(
      (match) => match[1],
    ),
    ...[...source.matchAll(/export\s+const\s*\{([^}]+)\}/g)].flatMap((match) =>
      (match[1] ?? '').split(',').map((name) => name.trim()),
    ),
  ]);
  return METHODS.filter((method) => names.has(method));
}

const API_ROOT = path.join('src', 'app', 'api');
const ADMIN_API_ROOT = path.join(API_ROOT, 'admin');
const DASHBOARD_ROOT = path.join('src', 'app', 'admin', '(dashboard)');

const adminRoutes = filesNamed(ADMIN_API_ROOT, 'route.ts').map((file) => ({
  url: urlFor(file, ADMIN_API_ROOT, '/api/admin'),
  methods: exportedMethods(file),
}));

const otherRoutes = filesNamed(API_ROOT, 'route.ts')
  .filter((file) => !file.startsWith(ADMIN_API_ROOT + path.sep))
  .map((file) => ({ url: urlFor(file, API_ROOT, '/api'), methods: exportedMethods(file) }));

const dashboardPages = filesNamed(DASHBOARD_ROOT, 'page.tsx').map((file) =>
  urlFor(file, DASHBOARD_ROOT, '/admin'),
);

const CROSS_SITE = { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' };

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Server behaviour; once is enough.');
});

test('the walk finds the routes and pages it is meant to', () => {
  // A broken walk would pass every test below by finding nothing.
  expect(adminRoutes.length).toBeGreaterThan(20);
  expect(adminRoutes).toContainEqual({ url: '/api/admin/media/upload', methods: ['POST'] });
  expect(adminRoutes).toContainEqual({
    url: '/api/admin/projects/e2e-missing',
    methods: ['GET', 'PATCH', 'DELETE'],
  });
  expect(dashboardPages.length).toBeGreaterThan(20);
  expect(dashboardPages).toContain('/admin/pages/HOME');
  for (const route of adminRoutes) expect(route.methods, route.url).not.toHaveLength(0);
});

test('every route outside /api/admin is public on purpose, and public ones only read', () => {
  for (const { url, methods } of otherRoutes) {
    if (url.startsWith('/api/public/')) {
      expect(methods, `${url} is public: GET only`).toEqual(['GET']);
    } else {
      expect(
        OUTSIDE_ADMIN[url],
        `${url} is outside /api/admin: list it in OUTSIDE_ADMIN if it is meant to be public`,
      ).toEqual(methods);
    }
  }
});

for (const { url, methods } of adminRoutes) {
  for (const method of methods) {
    test(`${method} ${url}: 401 for anyone not signed in`, async ({ request }) => {
      const response = await request.fetch(url, {
        method,
        ...(MUTATING.has(method) ? { data: {} } : {}),
      });
      expect(response.status()).toBe(401);
      expect((await response.json()).error.code).toBe('UNAUTHENTICATED');
    });

    if (MUTATING.has(method)) {
      test(`${method} ${url}: 403 from another site, before anything else`, async ({ request }) => {
        const response = await request.fetch(url, { method, headers: CROSS_SITE, data: {} });
        expect(response.status()).toBe(403);
      });
    }
  }
}

for (const url of ['/api/auth/login', '/api/auth/logout', '/api/contact']) {
  test(`POST ${url}: 403 from another site`, async ({ request }) => {
    const response = await request.post(url, { headers: CROSS_SITE, data: {} });
    expect(response.status()).toBe(403);
  });
}

for (const url of dashboardPages) {
  test(`${url}: sends anyone not signed in to the login page`, async ({ request }) => {
    const response = await request.get(url, { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(response.status());
    const location = new URL(response.headers()['location'] ?? '', 'http://site.invalid');
    expect(location.pathname).toBe('/admin/login');
    expect(location.searchParams.get('next')).toBe(url);
  });
}
