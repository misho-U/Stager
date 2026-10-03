/**
 * A throwaway Supabase Auth for the signed-in tests, so they run without a
 * Supabase project: CI, and any machine that cannot reach supabase.co.
 *
 * Supabase Auth is GoTrue, which runs in Docker (see the CI workflow and
 * AGENTS.md § Credential-gated tests). This script supplies the three pieces
 * around it:
 *
 *   tsx scripts/test-auth.ts keys    print the anon and service-role keys for
 *                                    TEST_AUTH_JWT_SECRET, as .env lines
 *   tsx scripts/test-auth.ts proxy   serve GoTrue under /auth/v1 on
 *                                    127.0.0.1:54321, as Supabase's gateway
 *                                    does (supabase-js calls <url>/auth/v1/…)
 *   tsx scripts/test-auth.ts user    create E2E_ADMIN_EMAIL with
 *                                    E2E_ADMIN_PASSWORD, confirmed
 *
 * Every piece refuses anything that is not on this machine: the keys are only
 * good for a GoTrue started with the same secret, and `user` will not write to
 * a real Supabase project.
 */
import { createHmac } from 'node:crypto';
import http from 'node:http';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function fail(message: string): never {
  console.error(`[test-auth] ${message}`);
  process.exit(1);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) fail(`${name} is not set.`);
  return value;
}

/** An HS256 JWT, as Supabase's own keys are. */
function sign(payload: Record<string, unknown>, secret: string): string {
  const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function keys() {
  const secret = required('TEST_AUTH_JWT_SECRET');
  if (secret.length < 32) fail('TEST_AUTH_JWT_SECRET must be at least 32 characters.');
  const exp = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  console.log(
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${sign({ role: 'anon', iss: 'test-auth', exp }, secret)}`,
  );
  console.log(
    `SUPABASE_SERVICE_ROLE_KEY=${sign({ role: 'service_role', iss: 'test-auth', exp }, secret)}`,
  );
}

function proxy() {
  const port = Number(process.env.TEST_AUTH_PORT ?? 54321);
  const upstream = new URL(process.env.TEST_AUTH_UPSTREAM ?? 'http://127.0.0.1:9999');
  if (!LOCAL_HOSTS.has(upstream.hostname)) fail('TEST_AUTH_UPSTREAM must be on this machine.');

  http
    .createServer((request, response) => {
      const url = request.url ?? '/';
      if (!url.startsWith('/auth/v1')) {
        response.writeHead(404).end();
        return;
      }
      const forwarded = http.request(
        {
          host: upstream.hostname,
          port: upstream.port,
          method: request.method,
          path: url.slice('/auth/v1'.length) || '/',
          headers: { ...request.headers, host: upstream.host },
        },
        (answer) => {
          response.writeHead(answer.statusCode ?? 502, answer.headers);
          answer.pipe(response);
        },
      );
      forwarded.on('error', () => response.writeHead(502).end());
      request.pipe(forwarded);
    })
    .listen(port, '127.0.0.1', () => {
      console.log(`[test-auth] /auth/v1 on http://127.0.0.1:${port} → ${upstream.origin}`);
    });
}

async function user() {
  const base = new URL(required('NEXT_PUBLIC_SUPABASE_URL'));
  if (!LOCAL_HOSTS.has(base.hostname)) {
    fail(`NEXT_PUBLIC_SUPABASE_URL is ${base.origin}, not this machine: refusing to add a user.`);
  }
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const email = required('E2E_ADMIN_EMAIL');

  const response = await fetch(new URL('/auth/v1/admin/users', base), {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: required('E2E_ADMIN_PASSWORD'),
      email_confirm: true,
    }),
  });

  if (response.ok) {
    console.log(`[test-auth] ${email} created, confirmed.`);
    return;
  }
  const body = await response.text();
  // Run twice against the same GoTrue: the user is already there.
  if (response.status === 422 && /already|exists/i.test(body)) {
    console.log(`[test-auth] ${email} already exists.`);
    return;
  }
  fail(`creating ${email}: ${response.status} ${body}`);
}

const command = process.argv[2];
if (command === 'keys') keys();
else if (command === 'proxy') proxy();
else if (command === 'user') user().catch((error: unknown) => fail(String(error)));
else fail('usage: tsx scripts/test-auth.ts keys | proxy | user');
