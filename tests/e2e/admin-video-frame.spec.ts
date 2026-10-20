import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page, type Request } from '@playwright/test';

import adminEn from '@pkg/i18n/messages/admin.en.json';

import { ADMIN_SESSION, CREDENTIALS_PRESENT } from './admin-session';
import {
  DB_WRITES_ALLOWED,
  DB_WRITES_SKIP_REASON,
  disconnectTestPrisma,
  testPrisma,
} from './db-guard';

/**
 * An uploaded video showed a plain placeholder until someone picked a cover
 * image, and the owner had none ("this is boring"). The dashboard now takes
 * the cover from a frame of the video itself: the owner pauses on a moment,
 * and that picture goes to the media library like any upload.
 *
 * The upload itself is the media library's, tested on its own
 * (admin-media-upload.spec.ts, against the real store when allowed). Here it
 * is stopped at its first request, the upload token: reaching it with an
 * image named for the cover proves a frame was read out of the video.
 */

const frame = adminEn.videos.form.frame;
const fixture = readFileSync(path.join(__dirname, 'fixtures', 'video.webm'));

/** Waits for a picture to show, then moves a little into the film. */
async function pauseOnAFrame(page: Page) {
  const video = page.getByTestId('video-frame').locator('video');
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThanOrEqual(1);
  await video.evaluate(
    (element: HTMLVideoElement) =>
      new Promise<void>((resolve) => {
        element.addEventListener('seeked', () => resolve(), { once: true });
        element.currentTime = Math.min(0.5, element.duration / 2 || 0);
      }),
  );
}

test.describe('a video cover taken from the video', () => {
  test.skip(
    !CREDENTIALS_PRESENT,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the authenticated flow.',
  );
  test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
  test.use({ storageState: ADMIN_SESSION });
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Writes a shared row; once is enough.');
  });
  test.afterAll(disconnectTestPrisma);

  /** A video played from a file at `fileUrl`, deleted again after `run`. */
  async function withFileVideo(run: (id: string, fileUrl: string) => Promise<void>) {
    const prisma = testPrisma();
    const slug = `e2e-frame-${Date.now()}`;
    const fileUrl = `https://e2e.public.blob.vercel-storage.com/media/videos/${slug}.webm`;
    const video = await prisma.video.create({
      data: {
        slug,
        status: 'DRAFT',
        publishedAt: new Date(),
        fileUrl,
        filePathname: `media/videos/${slug}.webm`,
        fileContentType: 'video/webm',
        fileSize: fixture.length,
        translations: {
          create: [
            { locale: 'EN', title: `E2E ${slug}`, summary: '' },
            { locale: 'KA', title: `E2E ${slug}`, summary: '' },
          ],
        },
      },
    });
    try {
      await run(video.id, fileUrl);
    } finally {
      await prisma.video.delete({ where: { id: video.id } });
    }
  }

  /** Records the upload-token requests, and answers none of them. */
  async function stopUploads(page: Page) {
    const requests: Request[] = [];
    await page.route('**/api/admin/media/upload', (route) => {
      requests.push(route.request());
      return route.fulfill({ status: 503, body: '{}' });
    });
    return requests;
  }

  const pathnameOf = (request: Request) =>
    String((request.postDataJSON() as { payload?: { pathname?: string } }).payload?.pathname);

  test('a paused frame of the stored file becomes an upload', async ({ page }) => {
    await withFileVideo(async (id, fileUrl) => {
      // The store, answering as it must for a frame to be readable.
      await page.route(`${fileUrl}*`, (route) =>
        route.fulfill({
          status: 200,
          body: fixture,
          headers: { 'content-type': 'video/webm', 'access-control-allow-origin': '*' },
        }),
      );
      const uploads = await stopUploads(page);

      await page.goto(`/admin/videos/${id}`);
      await page.getByRole('button', { name: frame.open }).click();
      await pauseOnAFrame(page);
      await page.getByRole('button', { name: frame.use }).click();

      await expect.poll(() => uploads.length).toBe(1);
      expect(pathnameOf(uploads[0]!)).toMatch(/^media\/.*video-cover.*\.(jpe?g|webp)$/);
      await expect(page.getByText(frame.unreadable)).toHaveCount(0);
    });
  });

  test('a stored file the browser may not read points to the local copy, which works', async ({
    page,
  }) => {
    await withFileVideo(async (id, fileUrl) => {
      // No permission to read its pictures: the browser refuses the video.
      // Said as another site's permission, since Playwright gives a fulfilled
      // response a permissive one of its own when none is set.
      await page.route(`${fileUrl}*`, (route) =>
        route.fulfill({
          status: 200,
          body: fixture,
          headers: {
            'content-type': 'video/webm',
            'access-control-allow-origin': 'https://elsewhere.example',
          },
        }),
      );
      const uploads = await stopUploads(page);

      await page.goto(`/admin/videos/${id}`);
      await page.getByRole('button', { name: frame.open }).click();
      await expect(page.getByText(frame.unreadable)).toBeVisible();
      expect(uploads).toHaveLength(0);

      // The same file from the owner's computer: always readable.
      await page
        .getByTestId('video-frame-file')
        .setInputFiles({ name: 'film.webm', mimeType: 'video/webm', buffer: fixture });
      await expect(page.getByTestId('video-frame').locator('video')).toHaveAttribute(
        'src',
        /^blob:/,
      );
      await pauseOnAFrame(page);
      await page.getByRole('button', { name: frame.use }).click();
      await expect.poll(() => uploads.length).toBe(1);
      expect(pathnameOf(uploads[0]!)).toMatch(/video-cover/);
    });
  });
});
