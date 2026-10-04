import { expect, test } from '@playwright/test';

import { describeDbError, isUniqueViolationOn } from '@pkg/db/errors';

import {
  DB_WRITES_ALLOWED,
  DB_WRITES_SKIP_REASON,
  disconnectTestPrisma,
  testPrisma,
} from './db-guard';

/**
 * What the database refuses is answered as what it is, and what is not
 * published never reaches the site through something that is.
 */

/** As Prisma 7 reports them behind the pg adapter (captured from a real run). */
const UNIQUE_SLUG = {
  code: 'P2002',
  meta: {
    modelName: 'Category',
    driverAdapterError: {
      cause: { kind: 'UniqueConstraintViolation', constraint: { index: 'categories_slug_key' } },
    },
  },
};
const UNIQUE_GALLERY = {
  code: 'P2002',
  meta: {
    driverAdapterError: {
      cause: { constraint: { index: 'project_gallery_items_projectId_mediaId_key' } },
    },
  },
};
const MISSING_LINK = {
  code: 'P2003',
  meta: { driverAdapterError: { cause: { constraint: { index: 'insights_categoryId_fkey' } } } },
};

test.describe('database errors', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Pure logic; once is enough.');
  });

  test('are read from where Prisma 7 reports them', () => {
    expect(describeDbError(UNIQUE_SLUG)).toEqual({
      code: 'P2002',
      constraint: 'categories_slug_key',
    });
    expect(describeDbError(MISSING_LINK)).toEqual({
      code: 'P2003',
      constraint: 'insights_categoryId_fkey',
    });
    expect(describeDbError({ code: 'P2002', meta: { target: ['slug'] } })).toEqual({
      code: 'P2002',
      constraint: 'slug',
    });
    expect(describeDbError(new Error('not a database error'))).toBeNull();
  });

  test('only a clash on the slug reads as "this link is taken"', () => {
    expect(isUniqueViolationOn(UNIQUE_SLUG, 'slug')).toBe(true);
    expect(isUniqueViolationOn(UNIQUE_GALLERY, 'slug')).toBe(false);
    expect(isUniqueViolationOn(MISSING_LINK, 'slug')).toBe(false);
  });
});

test.describe('drafts stay off the site', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
    test.skip(
      testInfo.project.name !== 'chromium',
      'Writes shared rows; runs once, under chromium.',
    );
  });

  test.afterAll(disconnectTestPrisma);

  test('a published project does not list a draft service, nor an article a draft author', async ({
    request,
  }) => {
    const prisma = testPrisma();
    const run = `e2e-${Date.now()}`;
    const both = (title: string) => [
      { locale: 'EN' as const, title },
      { locale: 'KA' as const, title },
    ];

    const service = await prisma.service.create({
      data: {
        slug: `${run}-draft-service`,
        status: 'DRAFT',
        translations: {
          create: both('Draft service').map((t) => ({ ...t, shortDescription: '' })),
        },
      },
    });
    const author = await prisma.teamMember.create({
      data: {
        slug: `${run}-draft-author`,
        status: 'DRAFT',
        translations: {
          create: [
            { locale: 'EN', name: 'Draft Author', position: '' },
            { locale: 'KA', name: 'Draft Author', position: '' },
          ],
        },
      },
    });
    const project = await prisma.project.create({
      data: {
        slug: `${run}-project`,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        translations: { create: both('E2E project') },
        services: { create: [{ serviceId: service.id }] },
      },
    });
    const insight = await prisma.insight.create({
      data: {
        slug: `${run}-insight`,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        showAuthor: true,
        authorId: author.id,
        translations: { create: both('E2E insight') },
      },
    });

    try {
      const projectResponse = await request.get(`/api/public/projects/${project.slug}?locale=EN`);
      expect(projectResponse.ok()).toBeTruthy();
      expect((await projectResponse.json()).services).toEqual([]);

      const insightResponse = await request.get(`/api/public/insights/${insight.slug}?locale=EN`);
      expect(insightResponse.ok()).toBeTruthy();
      expect((await insightResponse.json()).author).toBeNull();
    } finally {
      await prisma.insight.delete({ where: { id: insight.id } });
      await prisma.project.delete({ where: { id: project.id } });
      await prisma.teamMember.delete({ where: { id: author.id } });
      await prisma.service.delete({ where: { id: service.id } });
    }
  });
});
