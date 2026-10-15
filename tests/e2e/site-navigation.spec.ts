import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';

import en from '@pkg/i18n/messages/en.json';
import ka from '@pkg/i18n/messages/ka.json';

import { contrastFindings } from './contrast';
import { headingSkips } from './headings';
import { expectSettledVisible } from './motion';

/**
 * Moving between the public pages. A link to another page of the site opens
 * it without a reload (SiteLink), so what a fresh load used to give for free
 * must still hold: the page starts at its top, its motion starts again and
 * leaves nothing hidden, an address with a section lands there and takes the
 * keyboard along, the menu closes behind it, and Back and Forward work.
 *
 * Every route used here stands on any database: the home page, and the
 * articles page, which says so when there is no article yet.
 *
 * Next keeps the last pages visited mounted but hidden (React's Activity),
 * so a page left behind is still in the document: every lookup here takes
 * the one shown.
 */

const HOME = '/en';
const ARTICLES = '/en/insights';

type Marked = Window & { sameDocument?: boolean };

/** The one shown, of the matches: a page Next keeps hidden holds its own. */
const shown = (locator: Locator) => locator.filter({ visible: true });

/** Opens a page by a full load, and marks it: a client-side change keeps the mark, a reload drops it. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('[data-site]')).toBeVisible();
  await page.evaluate(() => {
    (window as Marked).sameDocument = true;
  });
}

const notReloaded = (page: Page) => page.evaluate(() => (window as Marked).sameDocument === true);

/** The header's wordmark, which leads home from every other page. */
const brand = (page: Page) => shown(page.locator(`[data-ct-header] a[href="${HOME}"]`));
const site = (page: Page) => shown(page.locator('[data-site]'));
const byTestId = (page: Page, id: string) => shown(page.getByTestId(id));

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

async function publishedArticles(request: APIRequestContext) {
  const response = await request.get('/api/public/insights?locale=EN');
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { items: Array<{ slug: string; title: string }> }).items;
}

test.describe('a link to another page of the site', () => {
  test('opens it without a reload, at its top, and Back and Forward follow', async ({ page }) => {
    await open(page, ARTICLES);
    // From the foot of the page, so arriving at the top of the next is proven.
    const homeLink = page.locator(`footer a[href="${HOME}"]`);
    await homeLink.scrollIntoViewIfNeeded();
    await expect.poll(() => scrollY(page)).toBeGreaterThan(100);
    await homeLink.click();

    await expect(page).toHaveURL(HOME);
    await expect(byTestId(page, 'hero-heading')).toBeVisible();
    await expect.poll(() => scrollY(page)).toBeLessThan(2);
    expect(await notReloaded(page), 'the page was reloaded').toBe(true);
    // The page left behind stays in the document, hidden, and out of reach:
    // one main and one page title to a screen reader.
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    await page.goBack();
    await expect(page).toHaveURL(ARTICLES);
    await expect(byTestId(page, 'insights-title')).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(HOME);
    await expect(byTestId(page, 'hero-heading')).toBeVisible();
    expect(await notReloaded(page), 'Back or Forward reloaded the page').toBe(true);
  });

  test('from home to the articles to one article, and back', async ({ page, request }) => {
    const articles = await publishedArticles(request);
    test.skip(articles.length === 0, 'no article is published, so home links to none');

    await open(page, HOME);
    await byTestId(page, 'all-insights').click();
    await expect(page).toHaveURL(ARTICLES);
    await expect(byTestId(page, 'insights-title')).toBeVisible();

    const [first] = articles;
    await byTestId(page, 'insight-link').filter({ hasText: first!.title }).click();
    await expect(page).toHaveURL(`${ARTICLES}/${first!.slug}`);
    await expect(byTestId(page, 'insight-title')).toHaveText(first!.title);
    await shown(page.getByRole('link', { name: en.insights.all })).click();
    await expect(page).toHaveURL(ARTICLES);

    await page.goBack();
    await page.goBack();
    await expect(page).toHaveURL(ARTICLES);
    await page.goBack();
    await expect(page).toHaveURL(HOME);
    await expect(byTestId(page, 'hero-heading')).toBeVisible();
    expect(await notReloaded(page)).toBe(true);
  });

  test('starts the motion again, and it leaves nothing hidden', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one browser is enough for motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, ARTICLES);
    await expect(site(page)).toHaveAttribute('data-motion', 'on');

    await brand(page).click();
    await expect(page).toHaveURL(HOME);
    await expect(site(page)).toHaveAttribute('data-motion', 'on');
    await expectSettledVisible(page, 4500);

    // And back through the browser's history, which mounts the page again.
    await page.goBack();
    await expect(page).toHaveURL(ARTICLES);
    await expect(site(page)).toHaveAttribute('data-motion', 'on');
    await expectSettledVisible(page, 2000);
    expect(await notReloaded(page)).toBe(true);
  });

  test('opens a page that still meets the contrast minimums and keeps its outline', async ({
    page,
  }) => {
    // The settled page, as the contrast scan skips anything not yet shown.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, ARTICLES);
    await brand(page).click();
    await expect(page).toHaveURL(HOME);
    await expect(byTestId(page, 'hero-heading')).toBeVisible();
    expect(await headingSkips(page)).toEqual([]);
    expect(await contrastFindings(page)).toEqual([]);

    await page.goBack();
    await expect(byTestId(page, 'insights-title')).toBeVisible();
    expect(await headingSkips(page)).toEqual([]);
    expect(await contrastFindings(page)).toEqual([]);
    expect(await notReloaded(page)).toBe(true);
  });

  test('to a section of the home page lands on it, with the keyboard', async ({ page }) => {
    await open(page, ARTICLES);
    await shown(page.locator(`footer a[href="${HOME}#inquiry"]`)).click();

    await expect(page).toHaveURL(`${HOME}#inquiry`);
    await expect(byTestId(page, 'inquiry-form')).toBeInViewport();
    // At the section's start, below the header, not merely somewhere in it.
    const top = await shown(page.locator('#inquiry')).evaluate((section) =>
      Math.round(section.getBoundingClientRect().top),
    );
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(200);
    await expect(shown(page.locator('#inquiry'))).toBeFocused();
    // The next Tab goes on from the form, not from the top of the page.
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('#inquiry')))).toBe(
      true,
    );
    expect(await notReloaded(page)).toBe(true);
  });

  test('in the menu closes the menu, and the page it opens scrolls', async ({ page }) => {
    await open(page, ARTICLES);
    await shown(page.locator('[data-ct-header] button[aria-haspopup="dialog"]')).click();
    const menu = page.locator('dialog[open]');
    await expect(menu).toBeVisible();
    await menu.getByRole('link', { name: en.nav.home }).click();

    await expect(page).toHaveURL(HOME);
    await expect(byTestId(page, 'hero-heading')).toBeVisible();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    // Nothing the open menu held still holds the page.
    await page.evaluate(() => window.scrollBy(0, 800));
    await expect.poll(() => scrollY(page)).toBeGreaterThan(100);
    expect(await notReloaded(page)).toBe(true);
  });

  test('in the menu to the page already open closes the menu', async ({ page, request }) => {
    test.skip((await publishedArticles(request)).length === 0, 'the menu lists no articles');
    await open(page, ARTICLES);
    await shown(page.locator('[data-ct-header] button[aria-haspopup="dialog"]')).click();
    const here = page.locator(`dialog[open] a[data-menu-link][href="${ARTICLES}"]`);
    await expect(here).toHaveAttribute('aria-current', 'page');
    await here.click();

    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page).toHaveURL(ARTICLES);
    await page.evaluate(() => window.scrollBy(0, 400));
    await expect.poll(() => scrollY(page)).toBeGreaterThan(100);
  });
});

test('the language switch opens the page in the other language, lang and all', async ({ page }) => {
  await open(page, ARTICLES);
  // The bar's switch where it shows, the menu's on a phone.
  const inBar = shown(page.locator('[data-ct-header] a[hreflang="ka"]'));
  if ((await inBar.count()) === 0) {
    await shown(page.locator('[data-ct-header] button[aria-haspopup="dialog"]')).click();
  }
  await shown(page.locator('a[hreflang="ka"]')).first().click();

  await expect(page).toHaveURL('/ka/insights');
  // <html lang> picks the Georgian typeface (brandbook.css), and the page's
  // own words follow it.
  await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  await expect(shown(page.getByRole('link', { name: ka.common.skipToContent }))).toHaveCount(1);
  await expect(byTestId(page, 'insights-title')).toBeVisible();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await notReloaded(page)).toBe(true);
});
