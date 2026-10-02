import { expect, test } from '@playwright/test';

import { deliversInquiries } from '@pkg/config/inquiry-delivery';

/**
 * The public contact endpoint.
 *
 * This is the only write path open to anonymous visitors, so its validation and
 * abuse controls carry more weight than anything else in the API.
 */

/**
 * Whether the server under test stores and emails a valid submission. It is
 * `pnpm dev` locally and `pnpm start` in CI (playwright.config.ts), started
 * with this process's environment. A dev server delivers only with
 * INQUIRY_DELIVERY=on, so by default a local run cannot put test inquiries
 * into whatever database `.env.local` points at.
 */
const serverDelivers = deliversInquiries({
  nodeEnv: process.env.CI ? 'production' : 'development',
  vercelEnv: process.env.VERCEL_ENV,
  setting: process.env.INQUIRY_DELIVERY,
});

function validSubmission(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Test Person',
    company: 'Test Co',
    email: `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    phone: '+995 555 000000',
    interest: 'MENU_DEVELOPMENT',
    message: 'This is a test enquiry with enough characters to pass validation.',
    locale: 'KA',
    elapsedMs: 15_000,
    ...overrides,
  };
}

test.describe('validation', () => {
  test('rejects a missing name', async ({ request }) => {
    const payload = validSubmission();
    delete payload.name;

    const response = await request.post('/api/contact', { data: payload });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.fields).toHaveProperty('name');
  });

  test('rejects a malformed email', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: validSubmission({ email: 'not-an-email' }),
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.error.fields).toHaveProperty('email');
  });

  test('rejects an unknown interest', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: validSubmission({ interest: 'SOMETHING_ELSE' }),
    });

    expect(response.status()).toBe(422);
  });

  test('rejects a message that is too short', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: validSubmission({ message: 'hi' }),
    });

    expect(response.status()).toBe(422);
  });

  test('rejects a non-JSON body', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: { 'content-type': 'application/json' },
      // A Buffer is sent verbatim. Passing a plain string here would be
      // serialised INTO valid JSON, which would test the wrong thing.
      data: Buffer.from('this is not json{'),
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('spam controls', () => {
  test('a filled honeypot looks accepted but stores nothing', async ({ request }) => {
    // Answering 200 denies the bot the signal it would need to adapt.
    const response = await request.post('/api/contact', {
      data: validSubmission({ website: 'http://spam.example.com' }),
    });

    // The honeypot field is constrained to an empty string, so this is a 422 by
    // schema. Either outcome is acceptable; what matters is no 500 and no send.
    expect([200, 422]).toContain(response.status());
  });

  test('a submission faster than a human can type is silently dropped', async ({ request }) => {
    const response = await request.post('/api/contact', {
      data: validSubmission({ elapsedMs: 200 }),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('accepted');
  });

  test('cross-site submissions are rejected', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: { origin: 'https://evil.example.com', 'sec-fetch-site': 'cross-site' },
      data: validSubmission(),
    });

    expect(response.status()).toBe(403);
  });
});

test.describe('delivery policy', () => {
  // Every deployment shares the live database and inbox, so what decides
  // delivery is pinned case by case (pkg/config/inquiry-delivery.ts).

  test('only the live site delivers by default', () => {
    expect(
      deliversInquiries({ nodeEnv: 'production', vercelEnv: 'production', setting: undefined }),
    ).toBe(true);
    // design.stager.ge and every branch link.
    expect(
      deliversInquiries({ nodeEnv: 'production', vercelEnv: 'preview', setting: undefined }),
    ).toBe(false);
    // `pnpm dev`, whose .env.local may point at the live database.
    expect(
      deliversInquiries({ nodeEnv: 'development', vercelEnv: undefined, setting: undefined }),
    ).toBe(false);
  });

  test('no setting can switch the live site off', () => {
    for (const setting of ['off', 'OFF', '0', 'no']) {
      expect(deliversInquiries({ nodeEnv: 'production', vercelEnv: 'production', setting })).toBe(
        true,
      );
    }
  });

  test('a production build without Vercel system variables still delivers', () => {
    // Fails open: losing real leads is worse than a preview delivering.
    expect(
      deliversInquiries({ nodeEnv: 'production', vercelEnv: undefined, setting: undefined }),
    ).toBe(true);
  });

  test('only `on` switches a preview or the dev server on', () => {
    for (const nodeEnv of ['production', 'development']) {
      const vercelEnv = nodeEnv === 'production' ? 'preview' : undefined;
      expect(deliversInquiries({ nodeEnv, vercelEnv, setting: 'on' })).toBe(true);
      expect(deliversInquiries({ nodeEnv, vercelEnv, setting: ' On ' })).toBe(true);
      for (const setting of ['off', 'true', '1', 'yes', 'onn']) {
        expect(deliversInquiries({ nodeEnv, vercelEnv, setting })).toBe(false);
      }
    }
  });
});

test.describe('happy path and rate limiting', () => {
  // Serial: the rate limiter is shared state, so these must not race each other
  // or run beside the other describe blocks' submissions.
  test.describe.configure({ mode: 'serial' });

  test('a server that does not deliver refuses, says why, and stores nothing', async ({
    request,
  }) => {
    test.skip(serverDelivers, 'This server delivers submissions (INQUIRY_DELIVERY=on, or CI).');

    // The refusal comes before the rate limiter and the database write, so a
    // 403 here means nothing was stored and no email was sent. Run against a
    // server started with a different INQUIRY_DELIVERY, this fails with a 200.
    const response = await request.post('/api/contact', { data: validSubmission() });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.reason).toBe('DELIVERY_OFF');
  });

  test('accepts a valid submission, then throttles repeats', async ({ request }) => {
    test.skip(
      !serverDelivers,
      'This server does not deliver submissions. Set INQUIRY_DELIVERY=on, against a local database, to run this.',
    );

    // A unique synthetic client address per run. The limiter buckets by hashed
    // IP for an hour, so reusing an address an earlier run exhausted makes the
    // very first request here come back 429. This drew from 203.0.113.1–254,
    // and every run exhausts two of those (one per browser project), so a few
    // runs in an hour collided often enough to fail. The IPv6 documentation
    // range gives 2^64 addresses instead.
    const group = () => Math.floor(Math.random() * 0x10000).toString(16);
    const clientIp = `2001:db8:${group()}:${group()}:${group()}:${group()}::1`;
    const headers = { 'x-forwarded-for': clientIp };

    const first = await request.post('/api/contact', { headers, data: validSubmission() });

    expect(first.status()).toBe(200);
    const body = await first.json();
    expect(body.ok).toBe(true);
    // A real id means the inquiry was persisted, regardless of whether the
    // notification email went out.
    expect(body.id).not.toBe('accepted');
    expect(body.id.length).toBeGreaterThan(5);

    // The limit is 5 per hour per IP; keep going until it trips.
    let rateLimited = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request.post('/api/contact', { headers, data: validSubmission() });
      if (response.status() === 429) {
        rateLimited = true;
        expect(response.headers()['retry-after']).toBeTruthy();
        break;
      }
    }

    expect(rateLimited).toBe(true);
  });
});
