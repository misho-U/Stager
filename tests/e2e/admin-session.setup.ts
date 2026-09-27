import { expect, test as setup } from '@playwright/test';

import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION, CREDENTIALS_PRESENT } from './admin-session';

/**
 * Signs in once, before the chromium and mobile projects run, and saves the
 * session every credential-gated test starts from (see admin-session.ts).
 */
setup.skip(
  !CREDENTIALS_PRESENT,
  'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the authenticated tests.',
);

setup('signs in as the admin', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL!);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Both browser projects wait on this test, so a refused sign-in stops the
  // whole run. Report the form's own reason — rate limit, wrong password,
  // unconfirmed email — instead of only "never reached /admin".
  const dashboard = page.getByRole('navigation', { name: 'Dashboard' });
  const refusal = page.locator('form').getByRole('alert');
  await expect(dashboard.or(refusal).first()).toBeVisible();
  expect(await refusal.allInnerTexts(), 'the sign-in form refused the credentials').toEqual([]);
  await expect(page).toHaveURL(/\/admin$/);

  await page.context().storageState({ path: ADMIN_SESSION });
});
