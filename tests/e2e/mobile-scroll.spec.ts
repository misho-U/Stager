import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Browser } from '@playwright/test';

/**
 * A phone's address bar hides as the visitor scrolls down and comes back as
 * they scroll up, and `dvh` follows it. The home hero was 78dvh, so it grew
 * and shrank under the visitor's finger, moving the whole page, and every
 * scroll animation was measured again. Anything in the page's flow is sized
 * in `svh`, which stays put; `dvh` is only for layers over the page (the
 * menu, the drawer, the full-screen player), which should fill the screen
 * as it is.
 */

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');

test('the home hero is sized to a screen that does not change while scrolling', () => {
  const hero = read('src/shared/brandbook/site.css').match(/--ct-hero-h:\s*([^;]+);/)?.[1];
  expect(hero).toMatch(/svh$/);
});

test('no public page sizes itself in dvh', () => {
  // A headless browser has no address bar, so svh and dvh measure the same
  // there: the source is what can be checked. A short page's footer would
  // ride the bar too. The dashboard is not checked: it is not the site.
  const files = readdirSync(path.join(process.cwd(), 'src'), { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.tsx') && !file.includes('admin'))
    .filter((file) => /\d+dvh|-dvh\b|h-dvh/.test(read(path.join('src', file))));
  expect(files).toEqual([]);
});

/**
 * Content slid up into place as it was scrolled to, which under a finger
 * read as the page shifting (the owner, on an iPhone). With a mouse it still
 * does; on a touch screen the page is already in place when it is reached.
 */
const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  // Said in full: under the `mobile` project, Playwright gives every new
  // context that project's touch screen unless told otherwise.
  desktop: { viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false },
};

/** The first element below the fold that slides in with a mouse. */
async function belowTheFold(device: keyof typeof DEVICES, browser: Browser) {
  const context = await browser.newContext({ ...DEVICES[device], reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto('/en');
  await expect(page.locator('[data-site][data-motion="on"]')).toHaveCount(1);
  const item = page.locator('[data-reveal]').last();
  await expect(item).not.toBeInViewport();
  return { context, item };
}

test('on a touch screen, content is in place before it is scrolled to', async ({ browser }) => {
  const { context, item } = await belowTheFold('phone', browser);
  await expect(item).toHaveCSS('opacity', '1');
  await expect(item).toHaveCSS('transform', 'none');
  await context.close();
});

test('with a mouse, content still slides in as it is scrolled to', async ({ browser }) => {
  const { context, item } = await belowTheFold('desktop', browser);
  await expect(item).toHaveCSS('opacity', '0');
  await context.close();
});
