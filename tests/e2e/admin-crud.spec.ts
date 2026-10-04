import { expect, test, type APIRequestContext } from '@playwright/test';
import type { z } from 'zod';

import { categoryInputSchema } from '@/entity/category/model/category.model';
import { insightInputSchema } from '@/entity/insight/model/insight.model';
import { serviceInputSchema } from '@/entity/service/model/service.model';
import { socialLinkInputSchema } from '@/entity/social-link/model/social-link.model';
import { teamMemberInputSchema } from '@/entity/team-member/model/team-member.model';
import adminEn from '@pkg/i18n/messages/admin.en.json';

import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION, CREDENTIALS_PRESENT } from './admin-session';
import {
  DB_WRITES_ALLOWED,
  DB_WRITES_SKIP_REASON,
  disconnectTestPrisma,
  testPrisma,
} from './db-guard';

/**
 * The dashboard's API, signed in, for the content no UI test walks through:
 * categories, team members, services, articles and social links are created,
 * changed and deleted, and on the way:
 *
 *  - rich text is cleaned before it is stored, whatever the browser sent;
 *  - a slug that is taken is a 409 on the slug, on create and on rename;
 *  - an optional field emptied in the dashboard is stored as none;
 *  - a one-field change leaves every other field alone;
 *  - only an owner may change the settings.
 *
 * Projects, courses and videos have UI tests of their own
 * (admin-content-flow.spec.ts, admin-academy.spec.ts).
 */

test.describe('content through the dashboard API', () => {
  test.skip(
    !CREDENTIALS_PRESENT,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the authenticated flow.',
  );
  test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
  test.use({ storageState: ADMIN_SESSION });
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Writes shared rows; runs once, under chromium.',
    );
  });

  const run = `e2e-${Date.now()}`;
  const ids: Record<string, string> = {};

  test.afterAll(async () => {
    // Whatever a failed test left behind.
    const prisma = testPrisma();
    const slug = { startsWith: run };
    await prisma.insight.deleteMany({ where: { slug } });
    await prisma.service.deleteMany({ where: { slug } });
    await prisma.teamMember.deleteMany({ where: { slug } });
    await prisma.category.deleteMany({ where: { slug } });
    if (ids.socialLink) await prisma.socialLink.deleteMany({ where: { id: ids.socialLink } });
    await disconnectTestPrisma();
  });

  const both = <T>(value: T) => ({ KA: value, EN: value });

  /** POSTs a payload that has first passed the schema the API applies, so a mistake here fails here. */
  async function create<S extends z.ZodType>(
    api: APIRequestContext,
    path: string,
    schema: S,
    payload: z.input<S>,
  ) {
    schema.parse(payload);
    const response = await api.post(path, { data: payload });
    expect(response.status(), await response.text()).toBe(201);
    return (await response.json()) as { id: string } & Record<string, unknown>;
  }

  async function patch(api: APIRequestContext, path: string, data: Record<string, unknown>) {
    const response = await api.patch(path, { data });
    expect(response.status(), await response.text()).toBe(200);
    return (await response.json()) as Record<string, unknown>;
  }

  const SCRIPTED =
    '<p>Kept</p><script>alert(1)</script><a href="javascript:alert(1)">link</a>' +
    '<img src="https://tracker.example/p.gif" onerror="alert(1)">';

  const expectClean = (html: unknown) => {
    expect(html).toContain('<p>Kept</p>');
    expect(String(html)).not.toMatch(/script|onerror|javascript:|tracker\.example/i);
  };

  test('a category is created, renamed and keeps its slug', async ({ page }) => {
    const category = await create(page.request, '/api/admin/categories', categoryInputSchema, {
      slug: `${run}-category`,
      translations: both({ name: 'E2E category' }),
    });
    ids.category = category.id;

    const renamed = await patch(page.request, `/api/admin/categories/${category.id}`, {
      translations: both({ name: 'E2E category, renamed' }),
    });
    expect(renamed.slug).toBe(`${run}-category`);
  });

  test('a team member is created; an emptied link and address are stored as none', async ({
    page,
  }) => {
    const member = await create(page.request, '/api/admin/team', teamMemberInputSchema, {
      slug: `${run}-member`,
      email: 'e2e-member@example.com',
      linkedinUrl: 'https://www.linkedin.com/in/e2e',
      status: 'PUBLISHED',
      order: 7,
      translations: both({ name: 'E2E Member' }),
    });
    ids.member = member.id;

    const cleared = await patch(page.request, `/api/admin/team/${member.id}`, {
      linkedinUrl: '',
      email: '',
    });
    expect(cleared.linkedinUrl).toBeNull();
    expect(cleared.email).toBeNull();
    // Nothing else moved.
    expect(cleared.order).toBe(7);
    expect(cleared.status).toBe('PUBLISHED');
  });

  test('a service is stored clean, and its slug cannot be taken twice', async ({ page }) => {
    const service = await create(page.request, '/api/admin/services', serviceInputSchema, {
      slug: `${run}-service`,
      status: 'PUBLISHED',
      translations: both({ title: 'E2E service', body: SCRIPTED }),
    });
    ids.service = service.id;

    const stored = (await (await page.request.get(`/api/admin/services/${service.id}`)).json()) as {
      translations: { EN: { body: string } };
    };
    expectClean(stored.translations.EN.body);

    const publicCopy = (await (
      await page.request.get(`/api/public/services/${run}-service?locale=EN`)
    ).json()) as { body: string };
    expectClean(publicCopy.body);

    const twin = await page.request.post('/api/admin/services', {
      data: { slug: `${run}-service`, translations: both({ title: 'E2E twin' }) },
    });
    expect(twin.status()).toBe(409);
    expect(Object.keys((await twin.json()).error.fields)).toEqual(['slug']);

    const other = await create(page.request, '/api/admin/services', serviceInputSchema, {
      slug: `${run}-service-two`,
      translations: both({ title: 'E2E service two' }),
    });
    const renamedOnto = await page.request.patch(`/api/admin/services/${other.id}`, {
      data: { slug: `${run}-service` },
    });
    expect(renamedOnto.status()).toBe(409);
    expect((await page.request.delete(`/api/admin/services/${other.id}`)).status()).toBe(204);
  });

  test('an article names its category and author, and can let go of both', async ({ page }) => {
    const insight = await create(page.request, '/api/admin/insights', insightInputSchema, {
      slug: `${run}-insight`,
      categoryId: ids.category,
      authorId: ids.member,
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      translations: both({ title: 'E2E article', body: SCRIPTED }),
    });
    ids.insight = insight.id;

    const listed = (await (await page.request.get('/api/public/insights?locale=EN')).json()) as {
      items: { slug: string; category: { slug: string } | null; author: unknown }[];
    };
    const entry = listed.items.find((item) => item.slug === `${run}-insight`);
    expect(entry?.category?.slug).toBe(`${run}-category`);

    const detail = (await (
      await page.request.get(`/api/public/insights/${run}-insight?locale=EN`)
    ).json()) as { body: string };
    expectClean(detail.body);

    const loosened = await patch(page.request, `/api/admin/insights/${insight.id}`, {
      categoryId: '',
      authorId: '',
    });
    expect(loosened.categoryId).toBeNull();
    expect(loosened.authorId).toBeNull();
    expect(loosened.status).toBe('PUBLISHED');
  });

  test('a social link refuses a script address, and hiding it keeps its place', async ({
    page,
  }) => {
    const link = await create(page.request, '/api/admin/social-links', socialLinkInputSchema, {
      platform: 'LINKEDIN',
      url: 'https://www.linkedin.com/company/e2e',
      label: `E2E ${run}`,
      order: 42,
      isActive: false,
    });
    ids.socialLink = link.id;

    const script = await page.request.patch(`/api/admin/social-links/${link.id}`, {
      data: { url: 'javascript:alert(1)' },
    });
    expect(script.status()).toBe(422);

    const shown = await patch(page.request, `/api/admin/social-links/${link.id}`, {
      isActive: true,
    });
    expect(shown.order).toBe(42);
    expect(shown.url).toBe('https://www.linkedin.com/company/e2e');
    await patch(page.request, `/api/admin/social-links/${link.id}`, { isActive: false });
  });

  test('only an owner changes the settings', async ({ page }) => {
    const prisma = testPrisma();
    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { email: ADMIN_EMAIL! } });
    const settings = (await (await page.request.get('/api/admin/settings')).json()) as {
      phone: string | null;
    };
    // The same value back: nothing on the site changes.
    const unchanged = { phone: settings.phone };

    try {
      await prisma.adminUser.update({ where: { id: admin.id }, data: { role: 'OWNER' } });
      expect((await page.request.patch('/api/admin/settings', { data: unchanged })).status()).toBe(
        200,
      );

      await prisma.adminUser.update({ where: { id: admin.id }, data: { role: 'EDITOR' } });
      const refused = await page.request.patch('/api/admin/settings', { data: unchanged });
      expect(refused.status()).toBe(403);
      // An editor still reads them, and still edits content.
      expect((await page.request.get('/api/admin/settings')).status()).toBe(200);
      await patch(page.request, `/api/admin/categories/${ids.category}`, { order: 3 });
    } finally {
      await prisma.adminUser.update({ where: { id: admin.id }, data: { role: admin.role } });
    }
  });

  test('only an owner sends a test error; with reporting off, none is sent', async ({ page }) => {
    const prisma = testPrisma();
    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { email: ADMIN_EMAIL! } });
    try {
      await prisma.adminUser.update({ where: { id: admin.id }, data: { role: 'OWNER' } });
      // No DSN here, so the dashboard says reporting is off rather than "sent".
      await page.goto('/admin/settings');
      await page.getByRole('button', { name: adminEn.settings.errorReporting.send }).click();
      await expect(page.getByText(adminEn.settings.errorReporting.off)).toBeVisible();

      await prisma.adminUser.update({ where: { id: admin.id }, data: { role: 'EDITOR' } });
      expect((await page.request.post('/api/admin/monitoring')).status()).toBe(403);
    } finally {
      await prisma.adminUser.update({ where: { id: admin.id }, data: { role: admin.role } });
    }
  });

  test('a new inquiry is badged, read, archived out of the inbox, then deleted', async ({
    page,
  }) => {
    type Inbox = {
      items: Array<{ id: string }>;
      total: number;
      counts: { inbox: number; archived: number; unread: number };
      emailOn: boolean;
    };
    const unread = async () =>
      ((await (await page.request.get('/api/admin/inquiries/unread')).json()) as { count: number })
        .count;
    const list = async (view: 'inbox' | 'archived') =>
      (await (await page.request.get(`/api/admin/inquiries?view=${view}`)).json()) as Inbox;

    const before = await unread();
    const email = `${run}@example.com`;
    const inquiry = await testPrisma().contactInquiry.create({
      data: {
        name: 'E2E Visitor',
        email,
        interest: 'OTHER',
        message: 'An inquiry made by an end-to-end test.',
        locale: 'EN',
      },
    });

    // New: counted, and badged in the sidebar on every page.
    expect(await unread()).toBe(before + 1);
    await page.goto('/admin/inquiries');
    await expect(page.getByTestId('unread-inquiries')).toContainText(String(before + 1));
    await expect(page.getByText(email)).toBeVisible();
    // With email not set up, the page says so once, and no inquiry claims a
    // failed send.
    if (!(await list('inbox')).emailOn) {
      await expect(page.getByText(adminEn.inquiries.emailOff)).toBeVisible();
      await expect(page.getByText(adminEn.inquiries.notNotified)).toHaveCount(0);
    }

    const read = await patch(page.request, `/api/admin/inquiries/${inquiry.id}`, {
      status: 'READ',
    });
    expect(read.status).toBe('READ');
    expect(await unread()).toBe(before);

    // Archived: out of the inbox and into the archive, each counted in full.
    await patch(page.request, `/api/admin/inquiries/${inquiry.id}`, { status: 'ARCHIVED' });
    const [inbox, archived] = await Promise.all([list('inbox'), list('archived')]);
    expect(inbox.items.map((item) => item.id)).not.toContain(inquiry.id);
    expect(archived.items.map((item) => item.id)).toContain(inquiry.id);
    expect(inbox.total).toBe(inbox.counts.inbox);
    expect(archived.total).toBe(archived.counts.archived);

    await page.reload();
    await expect(page.getByText(email)).toHaveCount(0);
    await page.getByRole('button', { name: adminEn.inquiries.views.archived }).click();
    await expect(page.getByText(email)).toBeVisible();

    expect((await page.request.delete(`/api/admin/inquiries/${inquiry.id}`)).status()).toBe(204);
    expect((await page.request.delete(`/api/admin/inquiries/${inquiry.id}`)).status()).toBe(404);
  });

  test('everything made here is deleted, and a second delete is a 404', async ({ page }) => {
    for (const [path, id] of [
      ['insights', ids.insight],
      ['services', ids.service],
      ['team', ids.member],
      ['categories', ids.category],
      ['social-links', ids.socialLink],
    ] as const) {
      expect((await page.request.delete(`/api/admin/${path}/${id}`)).status(), path).toBe(204);
      expect((await page.request.delete(`/api/admin/${path}/${id}`)).status(), path).toBe(404);
      expect((await page.request.get(`/api/admin/${path}/${id}`)).status(), path).toBe(404);
    }
  });
});

test.describe('signing in', () => {
  test.skip(
    !CREDENTIALS_PRESENT,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the authenticated flow.',
  );

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Server behaviour; once is enough.');
  });

  test('the session cookies are out of reach of page scripts', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      // Its own documentation-range address, so the attempt never counts
      // against the one the rest of the suite signs in from.
      headers: { 'x-forwarded-for': '2001:db8::5e55:10' },
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(response.status()).toBe(200);

    const session = response
      .headersArray()
      .filter(({ name, value }) => name.toLowerCase() === 'set-cookie' && value.startsWith('sb-'))
      .map(({ value }) => value);
    expect(session.length).toBeGreaterThan(0);
    for (const cookie of session) {
      expect(cookie).toMatch(/;\s*HttpOnly/i);
      expect(cookie).toMatch(/;\s*SameSite=Lax/i);
      // Secure everywhere but `pnpm dev`; CI runs the production build.
      if (process.env.CI) expect(cookie).toMatch(/;\s*Secure/i);
    }
  });
});
