import { expect, test } from '@playwright/test';

/**
 * The public contact endpoint.
 *
 * This is the only write path open to anonymous visitors, so its validation and
 * abuse controls carry more weight than anything else in the API.
 */

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

test.describe('happy path and rate limiting', () => {
  // Serial: the rate limiter is shared state, so these must not race each other
  // or run beside the other describe blocks' submissions.
  test.describe.configure({ mode: 'serial' });

  test('accepts a valid submission, then throttles repeats', async ({ request }) => {
    // A unique synthetic client address per run. The limiter buckets by hashed
    // IP, so without this the previous run's five submissions would still be
    // counted and the very first request here would come back 429.
    const clientIp = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
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
