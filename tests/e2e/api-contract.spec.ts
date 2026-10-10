import { randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import type { z } from 'zod';

import { publicCategoryListResponseSchema } from '@/entity/category/model/category.model';
import { publicCourseListResponseSchema } from '@/entity/course/model/course.model';
import {
  publicInsightDetailSchema,
  publicInsightListResponseSchema,
} from '@/entity/insight/model/insight.model';
import { publicPageSchema } from '@/entity/page/model/page.model';
import {
  publicProjectDetailSchema,
  publicProjectListResponseSchema,
} from '@/entity/project/model/project.model';
import {
  publicServiceListResponseSchema,
  publicServiceSchema,
} from '@/entity/service/model/service.model';
import { publicLayoutDataSchema } from '@/entity/site-setting/model/site-setting.model';
import { publicTeamMemberListResponseSchema } from '@/entity/team-member/model/team-member.model';
import { publicStatListResponseSchema } from '@/entity/stat/model/stat.model';
import { publicVideoListResponseSchema } from '@/entity/video/model/video.model';

import {
  DB_WRITES_ALLOWED,
  DB_WRITES_SKIP_REASON,
  disconnectTestPrisma,
  testPrisma,
} from './db-guard';

/**
 * The public API, as the site and any future client read it: every endpoint
 * answers in the shape its entity schema describes, in both languages; bad
 * input is a 422 and a missing thing a 404, never a 500; drafts stay out; and
 * sign-in checks what it can before asking Supabase anything.
 */

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Server behaviour; once is enough.');
});

test.afterAll(disconnectTestPrisma);

const LOCALES = ['KA', 'EN'] as const;

const READS: [string, z.ZodType][] = [
  ['/api/public/layout', publicLayoutDataSchema],
  ['/api/public/pages/HOME', publicPageSchema],
  ['/api/public/projects', publicProjectListResponseSchema],
  ['/api/public/services', publicServiceListResponseSchema],
  ['/api/public/insights', publicInsightListResponseSchema],
  ['/api/public/team', publicTeamMemberListResponseSchema],
  ['/api/public/categories', publicCategoryListResponseSchema],
  ['/api/public/courses', publicCourseListResponseSchema],
  ['/api/public/videos', publicVideoListResponseSchema],
  ['/api/public/company-stats', publicStatListResponseSchema],
];

const DETAILS: [string, z.ZodType][] = [
  ['/api/public/projects', publicProjectDetailSchema],
  ['/api/public/services', publicServiceSchema],
  ['/api/public/insights', publicInsightDetailSchema],
];

/** Fields that exist in the database and must never reach a visitor. */
const PRIVATE_KEYS = ['ipHash', 'userAgent', 'supabaseUserId', 'uploadedById', 'actorEmail'];

function keysIn(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) keysIn(item, found);
  } else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      found.add(key);
      keysIn(inner, found);
    }
  }
  return found;
}

function expectShape(schema: z.ZodType, body: unknown, label: string) {
  const parsed = schema.safeParse(body);
  expect(parsed.success, `${label}: ${parsed.error?.message ?? ''}`).toBe(true);
  const keys = keysIn(body);
  for (const key of PRIVATE_KEYS) expect(keys.has(key), `${label} carries ${key}`).toBe(false);
}

test.describe('every public read answers in the shape the site expects', () => {
  for (const [path, schema] of READS) {
    test(path, async ({ request }) => {
      for (const locale of LOCALES) {
        const response = await request.get(`${path}?locale=${locale}`);
        expect(response.status(), `${path} ${locale}`).toBe(200);
        expectShape(schema, await response.json(), `${path} ${locale}`);
      }
    });
  }

  for (const [path, schema] of DETAILS) {
    test(`${path}/<slug>`, async ({ request }) => {
      const list = (await (await request.get(`${path}?locale=EN&limit=1`)).json()) as {
        items: { slug: string }[];
      };
      test.skip(list.items.length === 0, 'Nothing published to read.');
      for (const locale of LOCALES) {
        const response = await request.get(`${path}/${list.items[0]!.slug}?locale=${locale}`);
        expect(response.status()).toBe(200);
        expectShape(schema, await response.json(), `${path}/<slug> ${locale}`);
      }
    });
  }
});

test.describe('bad input is a 422, a missing thing a 404', () => {
  for (const [path] of READS) {
    test(`${path} refuses a language it does not have`, async ({ request }) => {
      const response = await request.get(`${path}?locale=XX`);
      expect(response.status()).toBe(422);
      const { error } = await response.json();
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(Object.keys(error.fields)).toEqual(['locale']);
    });
  }

  for (const query of ['limit=0', 'limit=101', 'limit=ten', 'offset=-1']) {
    test(`a list refuses ${query}`, async ({ request }) => {
      const response = await request.get(`/api/public/projects?locale=KA&${query}`);
      expect(response.status()).toBe(422);
    });
  }

  for (const path of [
    '/api/public/projects/e2e-missing',
    '/api/public/services/e2e-missing',
    '/api/public/insights/e2e-missing',
    '/api/public/pages/NOT-A-PAGE',
  ]) {
    test(`${path} is a 404`, async ({ request }) => {
      const response = await request.get(`${path}?locale=KA`);
      expect(response.status()).toBe(404);
      expect((await response.json()).error.code).toBe('NOT_FOUND');
    });
  }
});

test.describe('drafts stay off the public API', () => {
  test.beforeEach(() => {
    test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
  });

  test('a draft is in no list, and its own address is a 404', async ({ request }) => {
    const prisma = testPrisma();
    const slug = `e2e-${Date.now()}-draft`;
    const titled = { create: LOCALES.map((locale) => ({ locale, title: `Draft ${slug}` })) };

    await prisma.project.create({ data: { slug, status: 'DRAFT', translations: titled } });
    await prisma.service.create({ data: { slug, status: 'DRAFT', translations: titled } });
    await prisma.insight.create({ data: { slug, status: 'DRAFT', translations: titled } });
    await prisma.course.create({ data: { slug, status: 'DRAFT', translations: titled } });
    await prisma.video.create({
      data: { slug, status: 'DRAFT', publishedAt: new Date(), translations: titled },
    });

    try {
      for (const path of [
        '/api/public/projects',
        '/api/public/services',
        '/api/public/insights',
        '/api/public/courses',
        '/api/public/videos',
      ]) {
        const body = await (await request.get(`${path}?locale=EN&limit=100`)).text();
        expect(body, path).not.toContain(slug);
      }
      for (const path of ['projects', 'services', 'insights']) {
        const response = await request.get(`/api/public/${path}/${slug}?locale=EN`);
        expect(response.status(), path).toBe(404);
      }
    } finally {
      await prisma.project.deleteMany({ where: { slug } });
      await prisma.service.deleteMany({ where: { slug } });
      await prisma.insight.deleteMany({ where: { slug } });
      await prisma.course.deleteMany({ where: { slug } });
      await prisma.video.deleteMany({ where: { slug } });
    }
  });
});

test.describe('sign-in', () => {
  /**
   * Each test signs in from its own documentation-range address, so its
   * attempts never count against the address the rest of the suite uses.
   */
  const fromTestAddress = () => ({
    'x-forwarded-for': `2001:db8::${randomBytes(6).toString('hex').match(/.{4}/g)!.join(':')}`,
  });

  test('checks the form before asking Supabase anything', async ({ request }) => {
    const headers = fromTestAddress();
    for (const data of [
      {},
      { email: 'not-an-address', password: 'long enough' },
      { email: 'admin@example.com', password: 'short' },
      { email: 'admin@example.com', password: 'x'.repeat(257) },
    ]) {
      const response = await request.post('/api/auth/login', { headers, data });
      expect(response.status(), JSON.stringify(data).slice(0, 60)).toBe(422);
    }
  });

  test('stops an address after ten attempts in a quarter of an hour', async ({ request }) => {
    test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
    const headers = fromTestAddress();
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await request.post('/api/auth/login', { headers, data: {} });
      expect(response.status(), `attempt ${attempt}`).toBe(422);
    }

    const blocked = await request.post('/api/auth/login', { headers, data: {} });
    expect(blocked.status()).toBe(429);
    expect(Number(blocked.headers()['retry-after'])).toBeGreaterThan(0);
    expect((await blocked.json()).error.reason).toBe('RATE_LIMITED');

    // Someone else is not affected.
    const other = await request.post('/api/auth/login', { headers: fromTestAddress(), data: {} });
    expect(other.status()).toBe(422);
  });
});
