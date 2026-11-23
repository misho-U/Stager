import { randomBytes } from 'node:crypto';

import { expect, test, type Browser } from '@playwright/test';

import { PASSWORD_MIN, passwordChangeInputSchema } from '@/entity/session/model/session.model';
import adminEn from '@pkg/i18n/messages/admin.en.json';

import { setDashboardLanguage } from './admin-locale';
import { CREDENTIALS_PRESENT } from './admin-session';
import {
  DB_WRITES_ALLOWED,
  DB_WRITES_SKIP_REASON,
  disconnectTestPrisma,
  testPrisma,
} from './db-guard';

/**
 * Settings → Password, end to end: the current password is asked, the two
 * new ones must match, a wrong current one is refused under its field, and a
 * change keeps this browser signed in while every other device is signed out.
 *
 * It runs as an admin of its own, made for the test and removed after it:
 * signing out "every other device" of the shared test admin would end the
 * session every other signed-in test runs on (admin-session.ts). Its
 * sign-ins come from addresses of their own, so they never use up the
 * shared address's sign-in allowance (RATE_LIMITS.login).
 *
 * Only against a Supabase Auth on this machine (CI's, or a local one), never
 * a real project: production has one admin, the owner (CLAUDE.md).
 */

const words = adminEn.settings.password;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOCAL_AUTH =
  !!SUPABASE_URL && ['localhost', '127.0.0.1', '::1'].includes(new URL(SUPABASE_URL).hostname);

/** A field by its whole label, required mark allowed (as admin-academy.spec.ts). */
const labelled = (text: string) =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*?$`);

/** A made-up address of the test's own, as api-contract.spec.ts does. */
const fromTestAddress = () => ({
  'x-forwarded-for': `2001:db8::${randomBytes(6).toString('hex').match(/.{4}/g)!.join(':')}`,
});

/** GoTrue's admin API, on this machine only. */
async function authAdmin(path: string, init: RequestInit = {}) {
  return fetch(new URL(`/auth/v1/admin${path}`, SUPABASE_URL), {
    ...init,
    headers: {
      apikey: SERVICE_KEY!,
      authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
    },
  });
}

test.describe('the password rules', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Pure logic; once is enough.');
  });

  const check = (currentPassword: string, newPassword: string, confirmPassword = newPassword) => {
    const result = passwordChangeInputSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return result.success
      ? 'ok'
      : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.code}`);
  };

  test(`a new password is at least ${PASSWORD_MIN} characters, typed twice alike`, () => {
    expect(check('old one', 'a long new password')).toBe('ok');
    expect(check('old one', 'x'.repeat(PASSWORD_MIN - 1))).toEqual(['newPassword:too_small']);
    expect(check('old one', 'a long new password', 'another long one')).toEqual([
      'confirmPassword:custom',
    ]);
  });

  test('it differs from the current one, and spaces are part of it', () => {
    expect(check('a long new password', 'a long new password')).toEqual(['newPassword:custom']);
    // Never trimmed: "  twelve chars  " is the password, spaces and all.
    const parsed = passwordChangeInputSchema.parse({
      currentPassword: ' old ',
      newPassword: '  padded pass  ',
      confirmPassword: '  padded pass  ',
    });
    expect(parsed.newPassword).toBe('  padded pass  ');
    expect(parsed.currentPassword).toBe(' old ');
  });
});

test.describe('changing the password in Settings', () => {
  test.skip(!CREDENTIALS_PRESENT, 'Runs with the signed-in tests (CI, or a local auth server).');
  test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
  test.skip(!LOCAL_AUTH || !SERVICE_KEY, 'Needs a Supabase Auth on this machine and its key.');
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Changes a shared account; once is enough.');
  });
  test.afterAll(disconnectTestPrisma);

  test('asks for the current password, keeps this browser in, signs every other device out', async ({
    browser,
    baseURL,
  }) => {
    const prisma = testPrisma();
    const email = `e2e-password-${Date.now()}@example.com`;
    const oldPassword = `old-password-${randomBytes(6).toString('hex')}`;
    const newPassword = `new password ${randomBytes(6).toString('hex')}`;

    const created = await authAdmin('/users', {
      method: 'POST',
      body: JSON.stringify({ email, password: oldPassword, email_confirm: true }),
    });
    expect(created.ok, await created.clone().text()).toBeTruthy();
    const { id: userId } = (await created.json()) as { id: string };
    const admin = await prisma.adminUser.create({ data: { email, role: 'EDITOR' } });

    /** A browser of its own (a device), signed in through the form. */
    const signIn = async (from: Browser, password: string) => {
      const context = await from.newContext({ extraHTTPHeaders: fromTestAddress() });
      await setDashboardLanguage(context, baseURL, 'en');
      const page = await context.newPage();
      await page.goto('/admin/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/\/admin$/);
      return { context, page };
    };

    try {
      const here = await signIn(browser, oldPassword);
      const elsewhere = await signIn(browser, oldPassword);

      await here.page.goto('/admin/settings');
      const form = here.page.getByTestId('password-change');
      const current = form.getByLabel(labelled(words.current));
      const fresh = form.getByLabel(labelled(words.new));
      const again = form.getByLabel(labelled(words.confirm));
      const submit = form.getByRole('button', { name: words.submit });

      // The two new ones must match: caught in the form, nothing sent.
      await current.fill(oldPassword);
      await fresh.fill(newPassword);
      await again.fill(`${newPassword}x`);
      await submit.click();
      await expect(form).toContainText(adminEn.validation.passwordsDiffer);

      // A wrong current password is refused, under its own field.
      await current.fill('not the current password');
      await again.fill(newPassword);
      await submit.click();
      await expect(form).toContainText(adminEn.errors.reasons.WRONG_PASSWORD);

      // The right one changes it; the form keeps no password behind.
      await current.fill(oldPassword);
      await submit.click();
      await expect(form).toContainText(words.changed);
      await expect(current).toHaveValue('');
      await expect(fresh).toHaveValue('');

      // This browser is still signed in; the other device is not.
      await here.page.goto('/admin/settings');
      await expect(here.page).toHaveURL(/\/admin\/settings$/);
      await elsewhere.page.goto('/admin');
      await expect(elsewhere.page).toHaveURL(/\/admin\/login/);

      // The old password no longer signs in; the new one does.
      const api = (await browser.newContext({ extraHTTPHeaders: fromTestAddress() })).request;
      const withOld = await api.post('/api/auth/login', { data: { email, password: oldPassword } });
      expect(withOld.status()).toBe(401);
      const withNew = await api.post('/api/auth/login', { data: { email, password: newPassword } });
      expect(withNew.status()).toBe(200);

      // Recorded as a change to the admin, and never the password itself.
      const entry = await prisma.auditLog.findFirst({
        where: { actorId: admin.id, action: 'UPDATE', entityType: 'AdminUser' },
      });
      expect(entry?.diff).toEqual({ password: 'changed' });
      expect(JSON.stringify(entry)).not.toContain(newPassword);

      await here.context.close();
      await elsewhere.context.close();
    } finally {
      await prisma.adminUser.delete({ where: { id: admin.id } });
      await authAdmin(`/users/${userId}`, { method: 'DELETE' });
    }
  });
});
