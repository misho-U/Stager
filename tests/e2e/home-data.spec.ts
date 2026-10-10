import { expect, test } from '@playwright/test';

import { splitStatValue } from '@/entity/stat/model/stat.model';
import { orSamples } from '@/modules/home-page/home-page.samples';
import { storeHostFromToken } from '@pkg/blob/store-host';

import {
  DB_WRITES_ALLOWED,
  DB_WRITES_SKIP_REASON,
  disconnectTestPrisma,
  testPrisma,
} from './db-guard';

/**
 * The figures, the Academy and the videos read the dashboard. While a section
 * has nothing of its own the page shows samples, marked as such; the first
 * real entry replaces them; a failed read must never be dressed up as samples.
 */

test.describe('samples stand in only for an empty section', () => {
  const samples = () => ['sample'];

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Pure logic; once is enough.');
  });

  test('an empty section shows the samples, marked as such', () => {
    expect(orSamples({ data: { items: [] }, failed: false }, samples)).toEqual({
      items: ['sample'],
      sample: true,
    });
  });

  test('the first real entry replaces them all', () => {
    expect(orSamples({ data: { items: ['real'] }, failed: false }, samples)).toEqual({
      items: ['real'],
      sample: false,
    });
  });

  test('a failed read shows nothing, never samples', () => {
    expect(orSamples({ data: { items: [] }, failed: true }, samples)).toEqual({
      items: [],
      sample: false,
    });
  });
});

test.describe('a video added in the dashboard', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
    test.skip(
      testInfo.project.name !== 'chromium',
      'Writes a shared row; runs once, under chromium.',
    );
  });

  test.afterAll(disconnectTestPrisma);

  test('replaces the samples, and the badge goes', async ({ page, request }) => {
    const prisma = testPrisma();
    const slug = `e2e-video-${Date.now()}`;
    const title = `E2E video ${slug}`;
    const revalidate = () =>
      request.post('/api/dev/revalidate-probe', {
        data: { entity: 'video' },
        headers: { 'sec-fetch-site': 'same-origin' },
      });

    const video = await prisma.video.create({
      data: {
        slug,
        status: 'PUBLISHED',
        kind: 'EPISODE',
        publishedAt: new Date(),
        durationMinutes: 12,
        youtubeUrl: 'https://www.youtube.com/watch?v=e2eE2Ee2E2e',
        translations: {
          create: [
            { locale: 'EN', title, summary: 'An entry made by an end-to-end test.' },
            { locale: 'KA', title, summary: '' },
          ],
        },
      },
    });

    try {
      expect((await revalidate()).ok()).toBeTruthy();

      await page.goto('/en');
      const section = page.locator('#videos');
      await expect(section).toContainText(title);
      await expect(section.locator('[data-testid="sample-badge"]')).toHaveCount(0);
      // Its poster loads straight from YouTube, not through the image
      // optimizer, which would resize any video id anyone asked for.
      await expect(
        section.locator('img[src="https://i.ytimg.com/vi/e2eE2Ee2E2e/hqdefault.jpg"]').first(),
      ).toBeAttached();
      await expect(section.locator('img[src*="/_next/image"][src*="ytimg"]')).toHaveCount(0);
    } finally {
      await prisma.video.delete({ where: { id: video.id } });
      await revalidate();
    }
  });
});

test.describe('services added in the dashboard', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
    test.skip(
      testInfo.project.name !== 'chromium',
      'Writes shared rows; runs once, under chromium.',
    );
  });

  test.afterAll(disconnectTestPrisma);

  test('every published one is on the home page, past twelve', async ({ page, request }) => {
    const prisma = testPrisma();
    const run = `e2e-services-${Date.now()}`;
    const revalidate = () =>
      request.post('/api/dev/revalidate-probe', {
        data: { entity: 'service' },
        headers: { 'sec-fetch-site': 'same-origin' },
      });

    // Enough to make thirteen, ordered after every real one.
    const published = await prisma.service.count({ where: { status: 'PUBLISHED' } });
    const titles = Array.from(
      { length: Math.max(1, 13 - published) },
      (_, index) => `E2E service ${run}-${index}`,
    );
    await prisma.$transaction(
      titles.map((title, index) =>
        prisma.service.create({
          data: {
            slug: `${run}-${index}`,
            status: 'PUBLISHED',
            order: 10_000 + index,
            translations: {
              create: [
                { locale: 'EN', title },
                { locale: 'KA', title },
              ],
            },
          },
        }),
      ),
    );

    try {
      expect((await revalidate()).ok()).toBeTruthy();
      await page.goto('/en');
      // The last of them, the thirteenth or later, is there too.
      await expect(page.locator('#services')).toContainText(titles.at(-1) ?? '');
    } finally {
      await prisma.service.deleteMany({ where: { slug: { startsWith: run } } });
      await revalidate();
    }
  });
});

test.describe('a figure', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Pure logic; once is enough.');
  });

  test('counts up to the number it starts with, and keeps what is around it', () => {
    expect(splitStatValue('20+')).toEqual({ before: '', number: 20, after: '+', grouped: false });
    expect(splitStatValue('1,200 m²')).toEqual({
      before: '',
      number: 1200,
      after: ' m²',
      grouped: true,
    });
    expect(splitStatValue('№ 1')).toEqual({ before: '№ ', number: 1, after: '', grouped: false });
    // A comma that is not a thousands separator is text.
    expect(splitStatValue('3,5 years')).toEqual({
      before: '',
      number: 3,
      after: ',5 years',
      grouped: false,
    });
    // No number: shown as written, nothing counts.
    expect(splitStatValue('Since forever')).toBeNull();
  });
});

test.describe('figures added in the dashboard', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
    test.skip(
      testInfo.project.name !== 'chromium',
      'Writes shared rows; runs once, under chromium.',
    );
  });

  test.afterAll(disconnectTestPrisma);

  test('replace the samples in their order; one switched off is not shown', async ({
    page,
    request,
  }) => {
    const prisma = testPrisma();
    const run = `e2e-stat-${Date.now()}`;
    const revalidate = () =>
      request.post('/api/dev/revalidate-probe', {
        data: { entity: 'stat' },
        headers: { 'sec-fetch-site': 'same-origin' },
      });
    const figure = (value: string, label: string, order: number, isActive = true) =>
      prisma.stat.create({
        data: {
          value,
          order,
          isActive,
          translations: {
            create: [
              { locale: 'EN', label: `${label} ${run}` },
              { locale: 'KA', label: `${label} ${run}` },
            ],
          },
        },
      });
    const created = [
      await figure('7', 'Second', 20),
      await figure('1,250+', 'First', 10),
      await figure('99', 'Hidden', 30, false),
    ];

    try {
      expect((await revalidate()).ok()).toBeTruthy();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/en');
      const band = page.getByTestId('stat-band');
      const ours = band.locator('div', { hasText: run });
      await expect(ours).toHaveCount(2);
      await expect(ours.nth(0)).toContainText(`First ${run}`);
      await expect(ours.nth(0).locator('.sr-only')).toHaveText('1,250+');
      await expect(ours.nth(1)).toContainText(`Second ${run}`);
      await expect(band).not.toContainText(`Hidden ${run}`);
      await expect(
        page.locator('section:has([data-testid="stat-band"]) [data-testid="sample-badge"]'),
      ).toHaveCount(0);
    } finally {
      await prisma.stat.deleteMany({ where: { id: { in: created.map((stat) => stat.id) } } });
      await revalidate();
    }
  });
});

test.describe("a project's photos", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
    test.skip(
      testInfo.project.name !== 'chromium',
      'Writes shared rows; runs once, under chromium.',
    );
  });

  test.afterAll(disconnectTestPrisma);

  test('show the cover, then the gallery, one at a time, and the arrows move through them', async ({
    page,
    request,
  }) => {
    // Media must sit in this project's own store for the image optimizer to
    // take it (next.config.ts); the files themselves are served below.
    const host = storeHostFromToken(process.env.BLOB_READ_WRITE_TOKEN);
    test.skip(!host, 'BLOB_READ_WRITE_TOKEN is not shaped like a store token.');
    const prisma = testPrisma();
    const run = `e2e-photos-${Date.now()}`;
    const revalidate = () =>
      request.post('/api/dev/revalidate-probe', {
        data: { entity: 'project' },
        headers: { 'sec-fetch-site': 'same-origin' },
      });
    const photo = (index: number) =>
      prisma.media.create({
        data: {
          url: `https://${host}/media/${run}-${index}.png`,
          pathname: `media/${run}-${index}.png`,
          contentType: 'image/png',
          size: 68,
          width: 4,
          height: 3,
          translations: {
            create: [
              { locale: 'EN', alt: `Photo ${index} ${run}` },
              { locale: 'KA', alt: `Photo ${index} ${run}` },
            ],
          },
        },
      });
    const media = [await photo(1), await photo(2), await photo(3)];
    const title = `E2E project ${run}`;
    const project = await prisma.project.create({
      data: {
        slug: run,
        status: 'PUBLISHED',
        featured: true,
        order: 0,
        coverMediaId: media[0]?.id ?? null,
        translations: {
          create: [
            { locale: 'EN', title, summary: 'What the project was about.' },
            { locale: 'KA', title, summary: '' },
          ],
        },
        gallery: {
          create: [
            { mediaId: media[1]?.id ?? '', order: 0 },
            { mediaId: media[2]?.id ?? '', order: 1 },
          ],
        },
      },
    });

    // A 1x1 PNG for every photo: the store itself is not reachable from a test.
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64',
    );
    await page.route('**/_next/image**', (route) =>
      route.request().url().includes(run)
        ? route.fulfill({ contentType: 'image/png', body: pixel })
        : route.continue(),
    );

    try {
      expect((await revalidate()).ok()).toBeTruthy();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/en');
      const card = page.locator('.ct-project', { hasText: title });
      await card.scrollIntoViewIfNeeded();
      const slides = card.locator('[aria-roledescription="photo"]');
      await expect(slides).toHaveCount(3);
      // The cover first, then the gallery in its order.
      for (const [index, slide] of (await slides.all()).entries()) {
        await expect(slide.locator('img')).toHaveAttribute('alt', `Photo ${index + 1} ${run}`);
      }

      const status = card.locator('[aria-live="polite"]');
      await expect(status).toHaveText('1 of 3');
      const next = card.getByRole('button', { name: 'Next photo' });
      await card.hover();
      await next.click();
      await expect(status).toHaveText('2 of 3');
      await next.click();
      await expect(status).toHaveText('3 of 3');
      // From the last, on to the first: an arrow never goes dead.
      await next.click();
      await expect(status).toHaveText('1 of 3');
      await card.getByRole('button', { name: 'Previous photo' }).click();
      await expect(status).toHaveText('3 of 3');
    } finally {
      await prisma.project.delete({ where: { id: project.id } });
      await prisma.media.deleteMany({ where: { id: { in: media.map((item) => item.id) } } });
      await revalidate();
    }
  });
});
