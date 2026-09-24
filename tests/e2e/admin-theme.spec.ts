import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

/**
 * The dashboard's light / dark / system theme — and the rule that the public
 * site never follows it.
 *
 * Runs without credentials: the login page lives under the admin layout, so it
 * carries exactly the same theme wiring as the dashboard.
 */

const COOKIE = 'stager-admin-theme';

type Rgb = [number, number, number];

/** Every colour role the admin theme must remap. Read from brandbook.css below. */
const BRANDBOOK = readFileSync(
  path.join(process.cwd(), 'src/shared/brandbook/brandbook.css'),
  'utf8',
);

function declarations(block: string): Map<string, string> {
  return new Map(
    [...block.matchAll(/--(color-[a-z-]+)\s*:\s*([^;]+);/g)].map(([, name = '', value = '']) => [
      name,
      value.trim(),
    ]),
  );
}

function blockAfter(marker: RegExp): string {
  const match = marker.exec(BRANDBOOK);
  if (!match) throw new Error(`brandbook.css no longer contains ${marker}. Update this test.`);
  const start = match.index + match[0].length;
  return BRANDBOOK.slice(start, BRANDBOOK.indexOf('}', start));
}

const ROLES = [...declarations(blockAfter(/^@theme \{/m)).keys()];

async function setCookie(
  page: Page,
  baseURL: string | undefined,
  value: string,
  cookiePath: string,
) {
  const { hostname } = new URL(baseURL!);
  await page.context().addCookies([{ name: COOKIE, value, domain: hostname, path: cookiePath }]);
}

async function openLogin(
  page: Page,
  baseURL: string | undefined,
  osScheme: 'light' | 'dark',
  cookie?: string,
) {
  await page.emulateMedia({ colorScheme: osScheme });
  // Written where the switch writes it: /admin only.
  if (cookie !== undefined) await setCookie(page, baseURL, cookie, '/admin');
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
}

/** Resolves CSS colours to 8-bit sRGB through a 1px canvas, whatever syntax they compute to. */
async function readColours(page: Page, expressions: Record<string, string>) {
  return page.evaluate((entries) => {
    const probe = document.createElement('div');
    document.body.append(probe);
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('No 2D canvas context');
    const resolved: Record<string, [number, number, number]> = {};
    for (const [key, expression] of Object.entries(entries)) {
      probe.style.color = expression;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = getComputedStyle(probe).color;
      context.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
      resolved[key] = [r, g, b];
    }
    probe.remove();
    return resolved;
  }, expressions);
}

const roleColours = (page: Page) =>
  readColours(page, Object.fromEntries(ROLES.map((role) => [role, `var(--${role})`])));

async function pageState(page: Page) {
  const colorScheme = await page.evaluate(
    () => getComputedStyle(document.documentElement).colorScheme,
  );
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const { body } = await readColours(page, { body: background });
  return { colorScheme, background: body as Rgb };
}

function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

test.describe('admin theme wiring in brandbook.css', () => {
  test('every colour role is remapped, identically, in both dark blocks', () => {
    // CSS cannot share one declaration list between a selector and a media
    // query, so the explicit-dark and system-dark blocks are written twice.
    // A role missing from them silently keeps its light colour in dark mode.
    const dark = declarations(blockAfter(/:root:has\(\[data-admin-theme='dark'\]\)\s*\{/));
    const system = declarations(blockAfter(/:root:has\(\[data-admin-theme='system'\]\)\s*\{/));

    expect(ROLES.length, 'no colour roles found in the @theme block').toBeGreaterThan(10);
    expect([...dark.keys()].sort(), 'roles without a dark value').toEqual([...ROLES].sort());
    expect(Object.fromEntries(system), 'the two dark blocks have drifted').toEqual(
      Object.fromEntries(dark),
    );
  });
});

test.describe('admin theme modes', () => {
  test('with no saved choice it follows the operating system', async ({ page, baseURL }) => {
    await openLogin(page, baseURL, 'light');
    const light = await pageState(page);
    expect(light.colorScheme).toBe('normal');
    expect(luminance(light.background)).toBeGreaterThan(0.5);

    await openLogin(page, baseURL, 'dark');
    const dark = await pageState(page);
    expect(dark.colorScheme).toBe('dark');
    expect(luminance(dark.background)).toBeLessThan(0.1);
  });

  test('a saved choice overrides the operating system', async ({ page, baseURL }) => {
    await openLogin(page, baseURL, 'light', 'dark');
    expect((await pageState(page)).colorScheme).toBe('dark');

    await openLogin(page, baseURL, 'dark', 'light');
    expect((await pageState(page)).colorScheme).toBe('normal');
  });

  test('an unrecognised cookie value falls back to the system setting', async ({
    page,
    baseURL,
  }) => {
    await openLogin(page, baseURL, 'dark', 'purple');
    expect((await pageState(page)).colorScheme).toBe('dark');

    await openLogin(page, baseURL, 'light', 'purple');
    expect((await pageState(page)).colorScheme).toBe('normal');
  });

  test('explicit dark and system dark resolve to identical colours', async ({ page, baseURL }) => {
    await openLogin(page, baseURL, 'light', 'dark');
    const explicit = await roleColours(page);

    await page.context().clearCookies();
    await openLogin(page, baseURL, 'dark');
    const system = await roleColours(page);

    expect(system).toEqual(explicit);
  });
});

test.describe('the public site is light-only', () => {
  for (const locale of ['ka', 'en']) {
    test(`/${locale} ignores an OS dark preference and a stray theme cookie`, async ({
      page,
      baseURL,
    }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(`/${locale}`);
      const light = await pageState(page);

      // A cookie at "/" would never be written by the switch (it is scoped to
      // /admin), but the public site must not react to one regardless.
      await setCookie(page, baseURL, 'dark', '/');
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(`/${locale}`);
      const underDark = await pageState(page);

      expect(underDark.colorScheme).toBe('normal');
      expect(underDark.background).toEqual(light.background);
    });
  }
});

test.describe('contrast', () => {
  // WCAG AA: 4.5:1 for text, 3:1 for the focus ring. A brand-colour edit in
  // brandbook.css that breaks one of these fails here instead of shipping.
  //
  // Not asserted yet, because the light theme fails them today — design-phase
  // work: ink-subtle (captions, helper text) is 2.3:1 on the page and 2.7:1 on
  // cards, and input borders (line) are 1.4:1 against 3:1 for UI boundaries.
  const PAIRS: Array<[foreground: string, background: string, minimum: number]> = [
    ['color-ink', 'color-surface', 4.5],
    ['color-ink', 'color-surface-raised', 4.5],
    ['color-ink-muted', 'color-surface-raised', 4.5],
    ['color-on-primary', 'color-primary', 4.5],
    ['color-on-primary', 'color-primary-hover', 4.5],
    ['color-danger', 'color-surface-raised', 4.5],
    ['color-focus', 'color-surface', 3],
  ];

  for (const [label, osScheme, cookie] of [
    ['light', 'light', 'light'],
    ['dark', 'light', 'dark'],
  ] as const) {
    test(`text stays readable in the ${label} theme`, async ({ page, baseURL }) => {
      await openLogin(page, baseURL, osScheme, cookie);
      const colours = await roleColours(page);

      for (const [foreground, background, minimum] of PAIRS) {
        const ratio = contrast(colours[foreground] as Rgb, colours[background] as Rgb);
        expect(
          ratio,
          `${foreground} on ${background} is ${ratio.toFixed(2)}:1 in the ${label} theme`,
        ).toBeGreaterThanOrEqual(minimum);
      }
    });
  }
});
