import { expect, test } from '@playwright/test';
import { createTranslator } from 'next-intl';
import { z } from 'zod';

import { createAdminFormat } from '@/shared/lib/admin-format';
import { describeIssue, type IssueLike } from '@/shared/lib/validation-message';
import { slugSchema } from '@/shared/types/api';
import { toValidationIssue } from '@pkg/http/validation-issue';
import { ADMIN_LOCALE_COOKIE } from '@pkg/i18n/admin-locale';
import adminEn from '@pkg/i18n/messages/admin.en.json';
import adminKa from '@pkg/i18n/messages/admin.ka.json';
import siteEn from '@pkg/i18n/messages/en.json';
import siteKa from '@pkg/i18n/messages/ka.json';
import { buildInquiryNotification } from '@pkg/mail/templates/inquiry-notification';

import { setDashboardLanguage } from './admin-locale';
import { ADMIN_SESSION, CREDENTIALS_PRESENT } from './admin-session';
import { findHardCodedWording, findMissingKeys } from './i18n-source';

/**
 * The dashboard speaks Georgian or English, the admin's choice, Georgian
 * until they make one. Its wording lives in admin.ka.json and admin.en.json,
 * never in code, so a translation can be corrected without touching a
 * component — and these tests keep it that way.
 */

type Messages = { [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ''): Map<string, string> {
  return new Map(
    Object.entries(messages).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [[`${prefix}${key}`, value] as const]
        : [...flatten(value, `${prefix}${key}.`)],
    ),
  );
}

/** `{name}`, and the variable of a `{count, plural, …}`. */
function placeholders(message: string): string[] {
  return [...new Set([...message.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((match) => match[1]!))].sort();
}

const ka = flatten(adminKa);
const en = flatten(adminEn);

/**
 * A field by its whole label, required mark allowed: "სათაური" must not also
 * find "სათაური Google-ში".
 */
const labelled = (text: string) =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*?$`);

test.describe('the message files', () => {
  test('Georgian and English have the same keys', () => {
    expect([...ka.keys()].sort()).toEqual([...en.keys()].sort());
  });

  test('each Georgian message takes the same values as its English one', () => {
    const mismatched = [...en].filter(
      ([key, english]) => placeholders(english).join() !== placeholders(ka.get(key) ?? '').join(),
    );
    expect(mismatched.map(([key]) => key)).toEqual([]);
  });

  test('every message formats, in both languages', () => {
    // A stray "<" or an unclosed "{" breaks a message only when it is shown.
    for (const [locale, messages] of [
      ['ka', adminKa],
      ['en', adminEn],
    ] as const) {
      const failures: string[] = [];
      const t = createTranslator({
        locale,
        messages: messages as Messages,
        onError: (error) => failures.push(error.message),
      });
      for (const [key, message] of flatten(messages)) {
        const values = Object.fromEntries(placeholders(message).map((name) => [name, 2]));
        t(key as never, values as never);
      }
      expect(failures, locale).toEqual([]);
    }
  });

  test('every message the dashboard asks for exists in both languages', () => {
    const keys = (site: Messages, admin: Messages) =>
      new Set([...flatten(site).keys(), ...flatten(admin, 'admin.').keys()]);

    expect(findMissingKeys({ ka: keys(siteKa, adminKa), en: keys(siteEn, adminEn) })).toEqual([]);
  });

  test('no wording is written into dashboard code', () => {
    // JSX text, and strings given to props a person reads or hears. Put new
    // wording in both message files instead.
    expect(findHardCodedWording()).toEqual([]);
  });
});

test.describe('validation messages', () => {
  const describe = (issue: IssueLike) => describeIssue(issue);

  test('are chosen from what failed, not from wording in the schema', () => {
    expect(describe({ code: 'too_small', origin: 'string', minimum: 1 })).toEqual({
      key: 'required',
    });
    expect(describe({ code: 'too_small', origin: 'string', minimum: 8, input: 'abc' })).toEqual({
      key: 'tooShort',
      values: { min: 8 },
    });
    expect(describe({ code: 'too_big', origin: 'string', maximum: 70 })).toEqual({
      key: 'tooLong',
      values: { max: 70 },
    });
    expect(describe({ code: 'too_small', origin: 'number', minimum: 1900 })).toEqual({
      key: 'tooSmall',
      values: { min: 1900 },
    });
    expect(describe({ code: 'too_big', origin: 'number', maximum: 2100 })).toEqual({
      key: 'tooBig',
      values: { max: 2100 },
    });
    expect(describe({ code: 'invalid_type', expected: 'number' })).toEqual({ key: 'number' });
    expect(describe({ code: 'invalid_format', format: 'email', input: 'me@' })).toEqual({
      key: 'email',
    });
    expect(describe({ code: 'invalid_format', format: 'url', input: 'x' })).toEqual({ key: 'url' });
    expect(describe({ code: 'custom', params: { key: 'youtube' } })).toEqual({ key: 'youtube' });
    expect(describe({ code: 'custom', params: { key: 'unknown' } })).toEqual({ key: 'invalid' });
    expect(describe({ code: 'unrecognized_keys' })).toEqual({ key: 'invalid' });
  });

  test('an empty box is always "fill this in"', () => {
    expect(describe({ code: 'too_small', origin: 'string', minimum: 8, input: '' })).toEqual({
      key: 'required',
    });
    expect(describe({ code: 'invalid_format', format: 'email', input: '' })).toEqual({
      key: 'required',
    });
  });

  test('recognise the slug rule from a real parse, live and as the API sends it', () => {
    // As the form sees it: the raw issue, through the per-parse error map,
    // which zod calls when the issues are first read.
    let live: ReturnType<typeof describeIssue> | undefined;
    const parsed = slugSchema.safeParse('Not a slug', {
      error: (issue) => {
        live = describeIssue(issue as unknown as IssueLike);
        return 'x';
      },
    });
    expect(parsed.error?.issues).toHaveLength(1);
    expect(live).toEqual({ key: 'slug' });

    // As a 422 carries it back to the form, through JSON.
    const [issue] = slugSchema.safeParse('Not a slug').error!.issues;
    const sent = JSON.parse(JSON.stringify(toValidationIssue(issue!))) as IssueLike;
    expect(sent).not.toHaveProperty('input');
    expect(describeIssue(sent)).toEqual({ key: 'slug' });
  });

  test('reach the first reason a choice of shapes failed', () => {
    const optionalEmail = z.email().or(z.literal(''));
    const [issue] = optionalEmail.safeParse('not-an-email').error!.issues;
    expect(describeIssue(issue as IssueLike)).toEqual({ key: 'email' });
  });
});

test('dates and sizes are written in the dashboard language, in Tbilisi time', () => {
  const units = (messages: Messages, locale: string) =>
    createTranslator({ locale, messages, namespace: 'units' as never }) as never;

  // Built by hand for Georgian: Chrome has no Georgian date data and would
  // fall back to US English ("Sep 28, 2026").
  const ka = createAdminFormat('ka', units(adminKa, 'ka'));
  expect(ka.date('2026-09-28T13:34:00Z')).toBe('28.09.2026');
  expect(ka.dateTime('2026-09-28T13:34:00Z')).toBe('28.09.2026, 17:34');
  expect(ka.fileSize(1_572_864)).toBe(adminKa.units.mb.replace('{size}', '1,5'));

  const en = createAdminFormat('en', units(adminEn, 'en'));
  expect(en.dateTime('2026-09-28T13:34:00Z')).toMatch(/^28 Sept? 2026, 17:34$/);
  expect(en.fileSize(1_572_864)).toBe('1.5 MB');
});

test('the inquiry email is written in Georgian', () => {
  const { subject, html, text } = buildInquiryNotification({
    name: 'Nino',
    company: 'Café',
    email: 'nino@example.com',
    phone: null,
    interest: 'MENU_DEVELOPMENT',
    message: 'Hello',
    locale: 'EN',
    submittedAt: new Date('2026-01-01T09:30:00Z'),
  });

  expect(subject).toBe(
    adminKa.email.subjectWithCompany.replace('{name}', 'Nino').replace('{company}', 'Café'),
  );
  expect(html).toContain('<html lang="ka">');
  expect(html).toContain(adminKa.email.heading);
  // The contact form's own Georgian label, and the visitor's site language.
  expect(text).toContain(siteKa.contact.interests.MENU_DEVELOPMENT);
  expect(text).toContain(`${adminKa.email.language}: ${adminKa.email.languages.en}`);
  // Tbilisi time (UTC+4), not the server's.
  expect(text).toContain('13:30');
});

test.describe('interface language, signed out', () => {
  const heading = (page: import('@playwright/test').Page, name: string) =>
    page.getByRole('heading', { name, level: 1 });

  test('starts in Georgian', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(heading(page, adminKa.signIn.title)).toBeVisible();
    await expect(page.getByLabel(adminKa.signIn.password)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  });

  test('is English once English is chosen', async ({ page, baseURL }) => {
    await setDashboardLanguage(page.context(), baseURL, 'en');
    await page.goto('/admin/login');
    await expect(heading(page, adminEn.signIn.title)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('an unknown choice falls back to Georgian', async ({ page, baseURL }) => {
    const { hostname } = new URL(baseURL!);
    await page
      .context()
      .addCookies([{ name: ADMIN_LOCALE_COOKIE, value: 'fr', domain: hostname, path: '/admin' }]);
    await page.goto('/admin/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  });

  test('can be changed on the sign-in form, and is remembered', async ({ page }) => {
    await page.goto('/admin/login');
    await page
      .getByRole('group', { name: adminKa.interfaceLanguage.label })
      .getByRole('button', { name: 'English' })
      .click();

    await expect(heading(page, adminEn.signIn.title)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    // The switch itself now labelled in English.
    await expect(
      page
        .getByRole('group', { name: adminEn.interfaceLanguage.label })
        .getByRole('button', { name: 'English' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(heading(page, adminEn.signIn.title)).toBeVisible();

    // Only the dashboard reads it: the public site keeps its own language.
    const [cookie] = (await page.context().cookies()).filter(
      ({ name }) => name === ADMIN_LOCALE_COOKIE,
    );
    expect(cookie).toMatchObject({ value: 'en', path: '/admin' });
  });

  test('words validation problems in that language', async ({ page, baseURL }) => {
    await page.goto('/admin/login');
    await page.getByRole('button', { name: adminKa.signIn.submit }).click();
    // Both boxes empty: "fill this in", not "enter a valid email".
    await expect(page.getByText(adminKa.validation.required)).toHaveCount(2);

    await setDashboardLanguage(page.context(), baseURL, 'en');
    await page.goto('/admin/login');
    await page.getByLabel(adminEn.signIn.email).fill('not-an-email');
    await page.getByLabel(adminEn.signIn.password).fill('short');
    await page.getByRole('button', { name: adminEn.signIn.submit }).click();
    await expect(page.getByText(adminEn.validation.email)).toBeVisible();
    await expect(page.getByText(adminEn.validation.tooShort.replace('{min}', '8'))).toBeVisible();
  });
});

test.describe('interface language, signed in', () => {
  test.skip(!CREDENTIALS_PRESENT, 'Requires an authenticated admin session.');
  // The shared session is in English (admin-session.setup.ts).
  test.use({ storageState: ADMIN_SESSION });

  test('the sidebar switch changes the whole dashboard, and a reload keeps it', async ({
    page,
  }) => {
    await page.goto('/admin');
    const sidebar = page.getByRole('navigation', { name: adminEn.sidebar.label });
    await expect(sidebar.getByRole('link', { name: adminEn.sidebar.nav.projects })).toBeVisible();

    await page
      .getByRole('group', { name: adminEn.interfaceLanguage.label })
      .getByRole('button', { name: 'ქართული' })
      .click();

    const georgianSidebar = page.getByRole('navigation', { name: adminKa.sidebar.label });
    await expect(
      georgianSidebar.getByRole('link', { name: adminKa.sidebar.nav.projects }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ka');

    await page.reload();
    await expect(
      georgianSidebar.getByRole('link', { name: adminKa.sidebar.nav.projects }),
    ).toBeVisible();
  });

  test('switching mid-edit keeps what was typed, and the language being edited', async ({
    page,
  }) => {
    await page.goto('/admin/projects/new');
    const georgian = page.locator('[data-content-locale="KA"]');
    const english = page.locator('[data-content-locale="EN"]');

    await georgian.getByLabel(labelled(adminEn.fields.title)).fill('ქართული სათაური');
    await page
      .getByRole('group', { name: adminEn.contentLocale.label })
      .getByRole('button', { name: 'English' })
      .click();
    await english.getByLabel(labelled(adminEn.fields.title)).fill('English title');

    // The interface changes; the copy and the language being edited do not.
    await page
      .getByRole('group', { name: adminEn.interfaceLanguage.label })
      .getByRole('button', { name: 'ქართული' })
      .click();
    const editing = page.getByRole('group', { name: adminKa.contentLocale.label });
    await expect(editing).toBeVisible();
    await expect(editing.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(english.getByLabel(labelled(adminKa.fields.title))).toHaveValue(
      'English title',
    );
    await expect(georgian.getByLabel(labelled(adminKa.fields.title))).toHaveValue(
      'ქართული სათაური',
    );
  });

  test('a failed save shows the language that needs fixing', async ({ page }) => {
    await page.goto('/admin/projects/new');
    const editing = page.getByRole('group', { name: adminEn.contentLocale.label });
    const english = page.locator('[data-content-locale="EN"]');

    // Georgian is complete; the English title is missing, out of sight.
    await page
      .locator('[data-content-locale="KA"]')
      .getByLabel(labelled(adminEn.fields.title))
      .fill('მხოლოდ ქართულად');
    await page.getByLabel(adminEn.fields.slug.label).fill('only-georgian');
    await page.getByRole('button', { name: adminEn.projects.form.submit }).click();

    await expect(editing.getByRole('button', { name: /^English/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(english.getByText(adminEn.validation.required)).toBeVisible();
    await expect(editing.getByRole('button', { name: /^English/ })).toContainText(
      adminEn.contentLocale.hasErrors,
    );
    await expect(page).toHaveURL(/\/admin\/projects\/new$/);
  });

  test('the Georgian sidebar still fits a small laptop screen', async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'desktop browser widths only');

    await setDashboardLanguage(page.context(), baseURL, 'ka');
    await page.setViewportSize({ width: 1366, height: 600 });
    await page.goto('/admin');

    const sidebar = page.getByRole('navigation', { name: adminKa.sidebar.label });
    await expect(sidebar.getByRole('link', { name: adminKa.sidebar.nav.inquiries })).toBeVisible();
    const overflow = await sidebar.evaluate((nav) => nav.scrollHeight - nav.clientHeight);
    expect(overflow, 'the sidebar would need its own scrollbar').toBeLessThanOrEqual(0);
  });
});
