import { expect, test } from '@playwright/test';

import { DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON } from './db-guard';

/**
 * What keeps the site running unattended: the health check an uptime monitor
 * polls, the daily job only Vercel may start, and what search engines are
 * told. See AGENTS.md § Running on Vercel.
 */

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Server behaviour; once is enough.');
});

test('the health check reaches the database and is never cached', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
  expect(response.headers()['cache-control']).toBe('no-store');
});

test.describe('the daily job runs only for the scheduler', () => {
  for (const [label, authorization] of [
    ['without a secret', undefined],
    ['with a wrong secret', 'Bearer not-the-secret'],
    ['with the secret in another form', `Basic ${process.env.CRON_SECRET ?? 'x'}`],
  ] as const) {
    test(`refused ${label}`, async ({ request }) => {
      const response = await request.get('/api/cron/daily', {
        headers: authorization ? { authorization } : {},
      });
      expect(response.status()).toBe(401);
    });
  }

  test('runs with the secret, and says what it did', async ({ request }) => {
    test.skip(!process.env.CRON_SECRET, 'Needs CRON_SECRET, shared by this run and the server.');
    test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);

    const response = await request.get('/api/cron/daily', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(response.status()).toBe(200);
    expect(Object.keys(await response.json()).sort()).toEqual([
      'auditPruned',
      'mail',
      'notified',
      'rateLimitsPruned',
      'retried',
    ]);
  });
});

test('outside production, robots.txt keeps every crawler out', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toMatch(/User-Agent: \*\nDisallow: \/\n/);
  expect(body).not.toMatch(/^Allow:/m);
});

test('the sitemap lists the home page in both languages, each naming the other', async ({
  request,
}) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml.match(/<loc>[^<]+\/(ka|en)<\/loc>/g)).toHaveLength(2);
  for (const lang of ['ka', 'en', 'x-default']) {
    expect(xml).toContain(`hreflang="${lang}"`);
  }
});
