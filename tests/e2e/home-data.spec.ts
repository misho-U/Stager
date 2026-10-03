import { expect, test } from '@playwright/test';

import { orSamples } from '@/modules/home-page/home-page.samples';

import {
  DB_WRITES_ALLOWED,
  DB_WRITES_SKIP_REASON,
  disconnectTestPrisma,
  testPrisma,
} from './db-guard';

/**
 * The Academy and the videos read the dashboard. While a section has nothing
 * of its own the designs show samples, marked as such; the first real entry
 * replaces them; a failed read must never be dressed up as samples.
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

  test('replaces the samples on both designs, and the badge goes', async ({ page, request }) => {
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

      for (const variant of ['1', '2']) {
        await page.goto(`/en?v=${variant}`);
        const section = page.locator('#videos');
        await expect(section).toContainText(title);
        await expect(section.locator('[data-testid="sample-badge"]')).toHaveCount(0);
        // Its poster loads straight from YouTube, not through the image
        // optimizer, which would resize any video id anyone asked for.
        await expect(
          section.locator('img[src="https://i.ytimg.com/vi/e2eE2Ee2E2e/hqdefault.jpg"]').first(),
        ).toBeAttached();
        await expect(section.locator('img[src*="/_next/image"][src*="ytimg"]')).toHaveCount(0);
      }
    } finally {
      await prisma.video.delete({ where: { id: video.id } });
      await revalidate();
    }
  });
});
