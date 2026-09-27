import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

import { expect, test, type Page } from '@playwright/test';

/**
 * Admin image uploads.
 *
 * The browser sends the file straight to Vercel Blob with a token scoped by
 * /api/admin/media/upload, so the dashboard's Content-Security-Policy must let
 * it connect there. It once did not: @vercel/blob 2.x moved uploads to
 * vercel.com/api/blob and every upload was refused by the policy, with nothing
 * failing until someone tried to add a photo.
 */

/** Where the installed @vercel/blob sends uploads — read from the library, not assumed. */
function blobApiUrl(): string {
  const dist = path.dirname(require.resolve('@vercel/blob'));
  const source = readdirSync(dist)
    .filter((file) => file.endsWith('.cjs') || file.endsWith('.js'))
    .map((file) => readFileSync(path.join(dist, file), 'utf8'))
    .join('\n');
  const match = /defaultVercelBlobApiUrl\s*=\s*["']([^"']+)["']/.exec(source);
  if (!match?.[1]) {
    throw new Error(
      'Could not find the Blob API URL in @vercel/blob; the library changed. Update this test.',
    );
  }
  return match[1];
}

test.describe('upload permissions', () => {
  test('the dashboard may connect to the Blob API the uploader uses', async ({ page }) => {
    const apiUrl = blobApiUrl();
    const reached: string[] = [];

    // Answer in place of Vercel: only a request the page's CSP allowed gets here.
    await page.route(
      (url) => url.href.startsWith(apiUrl),
      (route) => {
        reached.push(route.request().url());
        return route.fulfill({
          status: 200,
          headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
          body: '{}',
        });
      },
    );

    // The login page carries the same strict, nonce-based policy as the dashboard.
    await page.goto('/admin/login');
    const outcome = await page.evaluate(async (target) => {
      try {
        await fetch(target, { method: 'POST', body: 'probe' });
        return 'reached';
      } catch (error) {
        return String(error);
      }
    }, `${apiUrl}/?pathname=media%2Fcsp-probe.png`);

    expect(outcome, `the admin CSP blocks uploads to ${apiUrl}`).toBe('reached');
    expect(reached).toHaveLength(1);
  });
});

/**
 * The real thing: sign in, upload a generated image to Vercel Blob, see it in
 * the library, edit its alt text, delete it.
 *
 * It writes to the Blob store and the database configured in .env.local — on a
 * machine pointed at production, that is production — so it needs an explicit
 * opt-in on top of the admin credentials, and it deletes what it uploaded even
 * when an assertion fails or the test runs out of time. It never attaches the
 * image to site content.
 *
 *   E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… E2E_ALLOW_UPLOADS=1 pnpm test:e2e admin-media-upload
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const ALLOW_UPLOADS = process.env.E2E_ALLOW_UPLOADS === '1';

/** A solid-colour PNG, built by hand so the test needs no image library. */
function solidPng(width: number, height: number, [r, g, b]: [number, number, number]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // truecolour RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(width).fill([r, g, b]).flat())]);
  const pixels = Buffer.concat(Array<Buffer>(height).fill(row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function signIn(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL!);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

type MediaItem = { id: string; url: string; translations: { KA: { alt: string } } };

test.describe('media upload against the real services', () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD || !ALLOW_UPLOADS,
    'Uploads a real file to Vercel Blob. Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD and E2E_ALLOW_UPLOADS=1; it deletes what it uploads.',
  );

  /** Alt text of the upload the test has started. The cleanup deletes nothing else. */
  let uploadAlt: string | undefined;

  // Deletes what the test uploaded, however the test ended. It is a hook, not a
  // `finally` in the test, because a hook gets time of its own: once the test is
  // over — failed, or out of time — Playwright runs afterEach on a fresh
  // allowance, and only then closes the browser context. A `finally` shares the
  // test's time, and a test that timed out had its context closed under it: the
  // cleanup died on its first request and the upload stayed behind.
  test.afterEach(async ({ page }) => {
    const alt = uploadAlt;
    uploadAlt = undefined;
    if (!alt) return;

    // Closed first, so an upload still in flight cannot register the image
    // after the check below has looked for it.
    await page.close();
    const api = page.context().request;
    const leftovers = async () => {
      const response = await api.get('/api/admin/media');
      await expect(response, 'could not list the media library to clean up').toBeOK();
      const { items } = (await response.json()) as { items: MediaItem[] };
      return items.filter((entry) => entry.translations.KA.alt === alt);
    };

    for (const leftover of await leftovers()) {
      await api.delete(`/api/admin/media/${leftover.id}`);
    }
    expect(
      (await leftovers()).map((entry) => entry.url),
      `this test's upload is still in the media library; delete "${alt}" by hand`,
    ).toEqual([]);
  });

  test('uploads, lists, edits and deletes an image', async ({ page }) => {
    // Room for the 30 s wait for the upload to run out and report itself. Under
    // the default 30 s test timeout it never could: the test ran out first.
    test.setTimeout(90_000);
    // The project name keeps the parallel desktop and mobile runs apart.
    const alt = `E2E upload ${test.info().project.name} ${Date.now()}`;
    const png = solidPng(320, 200, [29, 70, 74]);

    await signIn(page);
    await page.goto('/admin/media');
    await page.getByLabel('Describe the image (alt text)').fill(alt);
    uploadAlt = alt;
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'e2e-upload.png', mimeType: 'image/png', buffer: png });

    const item = page.locator('li', { hasText: alt });
    await expect(item).toBeVisible({ timeout: 30_000 });
    await expect(item.getByText('320×200')).toBeVisible();

    // The thumbnail comes from the Blob CDN through next/image.
    await expect
      .poll(() => item.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);

    // The stored URL is public and serves exactly the uploaded bytes.
    const media = (await (await page.request.get('/api/admin/media')).json()) as {
      items: MediaItem[];
    };
    const uploaded = media.items.find((entry) => entry.translations.KA.alt === alt);
    expect(uploaded?.url).toMatch(
      /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/media\//,
    );
    const file = await page.request.get(uploaded!.url);
    expect(file.status()).toBe(200);
    expect(Buffer.compare(await file.body(), png)).toBe(0);

    await item.getByRole('button', { name: 'Edit alt text' }).click();
    await page.getByPlaceholder('Alt text (English)').fill(`${alt} (EN)`);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(
      page.locator('li', { hasText: alt }).getByRole('button', { name: 'Edit alt text' }),
    ).toBeVisible();

    await item.getByRole('button', { name: 'Delete' }).click();
    await item.getByRole('button', { name: 'Confirm' }).click();
    await expect(item).toHaveCount(0);
  });
});
