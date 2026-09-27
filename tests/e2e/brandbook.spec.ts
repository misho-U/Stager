import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { BRAND_HEX } from '@pkg/brand/hex.generated';
import { buildInquiryNotification } from '@pkg/mail/templates/inquiry-notification';

/**
 * The promise of src/shared/brandbook/brandbook.css: change a brand colour
 * there and it reaches everything — including the two consumers that cannot
 * read CSS, which get generated hex copies.
 */

const BRANDBOOK = readFileSync(
  path.join(process.cwd(), 'src/shared/brandbook/brandbook.css'),
  'utf8',
);

const brandbookHex = Object.fromEntries(
  [...BRANDBOOK.matchAll(/--color-brand-([a-z0-9-]+)\s*:\s*(#[0-9a-f]+)\s*;/gi)].map(
    ([, name = '', value = '']) => [
      name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase()),
      value.toLowerCase(),
    ],
  ),
);

test.describe('one brandbook, every consumer', () => {
  test('the generated hex copies match brandbook.css', () => {
    // A mismatch means the generator did not run: `pnpm install`, `pnpm dev`
    // and `pnpm build` all run scripts/brand-tokens.ts first.
    expect(BRAND_HEX).toEqual(brandbookHex);
  });

  test('the notification email uses only brand colours', () => {
    const { html } = buildInquiryNotification({
      name: 'Test',
      company: null,
      email: 'test@example.com',
      phone: null,
      interestLabel: 'Menu development',
      message: 'Hello',
      locale: 'en',
      submittedAt: new Date('2026-01-01T00:00:00Z'),
    });

    const used = new Set(html.match(/#[0-9a-f]{3,8}\b/gi)?.map((hex) => hex.toLowerCase()));
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((hex) => !Object.values(BRAND_HEX).includes(hex as never))).toEqual([]);
  });

  test('the phone browser bar takes the brand teal', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      brandbookHex.teal!,
    );
  });
});
