import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';

/**
 * The edit→live loop — the promise the whole CMS rests on.
 *
 * WHY THIS EXISTS SEPARATELY FROM admin-content-flow.spec.ts:
 * that spec drives the real dashboard, so it needs a Supabase account and is
 * `test.skip()`-ed unless E2E_ADMIN_EMAIL/PASSWORD are set. In practice they
 * never were, so the single test covering the core promise had never once run.
 * This spec needs no credentials, so it runs everywhere, every time.
 *
 * It deliberately splits the loop in two halves and asserts BOTH, because each
 * has failed independently before:
 *
 *   1. without revalidation the page must stay stale — otherwise the cache is
 *      not doing its job and every visit hits the database;
 *   2. after revalidation the page must show the new value on the very next
 *      request — `{ expire: 0 }`, not stale-while-revalidate.
 *
 * A test that only checked (2) would pass against a site with no caching at
 * all, which is the failure this pairing is designed to exclude.
 *
 * SAFETY: .env.local may point at the same database production uses, so this
 * captures the original heading first and restores it in `finally`, including
 * on failure. The write happens here in test code rather than in an app
 * endpoint, so nothing that ships to a server can write without authentication.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function heroTranslation() {
  const section = await prisma.pageSection.findFirst({
    where: { key: 'hero', page: { key: 'HOME' } },
    select: { id: true },
  });

  if (!section) throw new Error('No HOME/hero section — run `pnpm db:seed` first.');

  const translation = await prisma.pageSectionTranslation.findUnique({
    where: { sectionId_locale: { sectionId: section.id, locale: 'KA' } },
    select: { heading: true },
  });

  if (!translation) throw new Error('No KA translation for HOME/hero — run `pnpm db:seed` first.');

  return { sectionId: section.id, original: translation.heading };
}

async function setHeading(sectionId: string, heading: string) {
  await prisma.pageSectionTranslation.update({
    where: { sectionId_locale: { sectionId, locale: 'KA' } },
    data: { heading },
  });
}

test.describe('the edit→live loop', () => {
  // One project only. This test mutates a shared database row, and the suite
  // runs projects in parallel — two of them racing to set and restore the same
  // heading would flake, and would eventually restore the wrong value. Nothing
  // here is viewport-dependent: it asserts server cache behaviour.
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Mutates shared database state; runs once, under chromium.',
    );
  });

  test('a published edit reaches /ka on the next request, and not before', async ({
    page,
    request,
  }) => {
    const { sectionId, original } = await heroTranslation();
    const sentinel = `cache-probe-${Date.now()}`;

    const revalidate = () =>
      request.post('/api/dev/revalidate-probe', {
        data: { entity: 'page', key: 'HOME' },
        headers: { 'sec-fetch-site': 'same-origin' },
      });

    try {
      // Start from a known-cached state so "stale" below means the cache held,
      // rather than the page never having been rendered.
      await revalidate();
      await page.goto('/ka');
      await expect(page.getByTestId('hero-heading')).toHaveText(original);

      await setHeading(sectionId, sentinel);

      // 1. Cached: the write alone must not reach the page.
      await page.goto('/ka');
      await expect(page.getByTestId('hero-heading')).toHaveText(original);

      // 2. Invalidated: the very next request must show it.
      const response = await revalidate();
      expect(response.ok()).toBeTruthy();
      expect(await response.json()).toMatchObject({
        tags: ['collection:page', 'detail:page:HOME'],
      });

      await page.goto('/ka');
      await expect(page.getByTestId('hero-heading')).toHaveText(sentinel);

      // The read never silently degraded to placeholder copy.
      await expect(page.getByTestId('read-failure')).toHaveCount(0);
    } finally {
      await setHeading(sectionId, original);
      await revalidate();
    }
  });
});
