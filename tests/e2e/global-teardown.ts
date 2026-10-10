import { DB_WRITES_ALLOWED, disconnectTestPrisma, testPrisma } from './db-guard';

/**
 * After every run, removes what a test stopped half-way left behind.
 *
 * Each test deletes what it creates, in a `finally`, but a run killed between
 * the two leaves rows on the site. Everything tests create is named for this:
 * slugs start `e2e-` (the dashboard derives them from "E2E …" titles),
 * figures carry an `e2e-` run in their label, and contact-form senders are
 * `e2e-…@example.com`. Only where tests may write at all (db-guard.ts). Media
 * is left alone, its files live in Blob, which this cannot reach, and the
 * upload test cleans up after itself; except the photo test's rows, which
 * stand for no file at all (`media/e2e-photos-…`).
 */
export default async function globalTeardown(): Promise<void> {
  if (!DB_WRITES_ALLOWED) return;

  const prisma = testPrisma();
  const slug = { startsWith: 'e2e-' };
  const removed: Record<string, number> = {};

  // Each table on its own, so one failure does not keep the rest. Every link
  // between them is cascade or set-null, so the order does not matter.
  const sweep = async (table: string, run: () => Promise<{ count: number }>) => {
    try {
      const { count } = await run();
      if (count > 0) removed[table] = count;
    } catch (error) {
      console.warn(`[e2e teardown] ${table}:`, error instanceof Error ? error.message : error);
    }
  };

  try {
    await sweep('insights', () => prisma.insight.deleteMany({ where: { slug } }));
    await sweep('projects', () => prisma.project.deleteMany({ where: { slug } }));
    await sweep('courses', () => prisma.course.deleteMany({ where: { slug } }));
    await sweep('videos', () => prisma.video.deleteMany({ where: { slug } }));
    await sweep('services', () => prisma.service.deleteMany({ where: { slug } }));
    await sweep('team', () => prisma.teamMember.deleteMany({ where: { slug } }));
    await sweep('categories', () => prisma.category.deleteMany({ where: { slug } }));
    await sweep('course categories', () => prisma.courseCategory.deleteMany({ where: { slug } }));
    await sweep('figures', () =>
      prisma.stat.deleteMany({
        where: { translations: { some: { label: { contains: 'e2e-' } } } },
      }),
    );
    await sweep('test photos', () =>
      prisma.media.deleteMany({ where: { pathname: { startsWith: 'media/e2e-photos-' } } }),
    );
    await sweep('inquiries', () =>
      prisma.contactInquiry.deleteMany({
        where: { email: { startsWith: 'e2e-', endsWith: '@example.com' } },
      }),
    );
    if (Object.keys(removed).length > 0) {
      console.warn('[e2e teardown] removed leftovers:', removed);
    }
  } finally {
    await disconnectTestPrisma();
  }
}
