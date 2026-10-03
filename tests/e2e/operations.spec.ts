import { expect, test } from '@playwright/test';
import {
  AuthApiError,
  AuthInvalidTokenResponseError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthUnknownError,
} from '@supabase/supabase-js';

import { isAuthOutage } from '@pkg/supabase/outage';

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

test.describe('a Supabase outage is told apart from a signed-out visitor', () => {
  // An outage keeps the admin where they are, with Try again; the login page
  // could not sign them in either.
  test('no answer, a failing gateway, a failure of its own, or an error page', () => {
    expect(isAuthOutage(new AuthRetryableFetchError('fetch failed', 0))).toBe(true);
    expect(isAuthOutage(new AuthRetryableFetchError('Bad gateway', 503))).toBe(true);
    expect(isAuthOutage(new AuthApiError('Database error', 500, 'unexpected_failure'))).toBe(true);
    expect(isAuthOutage(new AuthUnknownError('Unexpected token <', new Error()))).toBe(true);
  });

  // These must still reach the login page: one taken for an outage would keep
  // a person from signing in at all.
  test('no session, a rejected token, or a session error that says 500', () => {
    expect(isAuthOutage(new AuthSessionMissingError())).toBe(false);
    expect(isAuthOutage(new AuthApiError('invalid JWT', 403, 'bad_jwt'))).toBe(false);
    expect(isAuthOutage(new AuthApiError('User not found', 404, 'user_not_found'))).toBe(false);
    expect(isAuthOutage(new AuthInvalidTokenResponseError())).toBe(false);
  });
});
