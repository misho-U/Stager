import { expect, test, type Page } from '@playwright/test';

import en from '@pkg/i18n/messages/en.json';
import ka from '@pkg/i18n/messages/ka.json';

import { contrastFindings } from './contrast';

/**
 * The pages beside the home page: the team (/team), the articles
 * (/insights) and each article (/insights/<slug>), in the site's design with
 * the shared header, footer and motion. Their lists come from the
 * dashboard's Team and Insights screens, their headings from Page copy.
 */

const LOCALES = ['ka', 'en'] as const;
const PAGES = [
  { path: 'team', title: 'team-title' },
  { path: 'insights', title: 'insights-title' },
] as const;

async function open(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const response = await page.goto(path);
  await expect(page.locator('[data-site]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return response;
}

for (const locale of LOCALES) {
  const words = locale === 'ka' ? ka : en;

  for (const { path, title } of PAGES) {
    test.describe(`/${locale}/${path}`, () => {
      test('has its title, one main, the shared header and footer', async ({ page }) => {
        await open(page, `/${locale}/${path}`);
        await expect(page.getByTestId(title)).toBeVisible();
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('main#content')).toHaveCount(1);
        await expect(page.locator('[data-ct-header]')).toBeVisible();
        await expect(page.getByTestId('footer-wordmark')).toBeVisible();

        // The menu leads home, and marks this page where it lists it.
        await page.locator('[data-ct-header] button[aria-haspopup="dialog"]').click();
        const menu = page.locator('dialog[open]');
        await expect(menu.getByRole('link', { name: words.nav.home })).toHaveAttribute(
          'href',
          `/${locale}`,
        );
        const here = menu.locator(`a[href="/${locale}/${path}"]`);
        if ((await here.count()) > 0) await expect(here).toHaveAttribute('aria-current', 'page');
      });

      test('fits the screen and meets the contrast minimums', async ({ page }) => {
        await open(page, `/${locale}/${path}`);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0);
        expect(await contrastFindings(page)).toEqual([]);
      });

      test('the language switch keeps the visitor on the page', async ({ page }) => {
        await open(page, `/${locale}/${path}`);
        const other = locale === 'ka' ? 'en' : 'ka';
        await expect(page.locator(`[data-ct-header] a[hreflang="${other}"]`)).toHaveAttribute(
          'href',
          `/${other}/${path}`,
        );
      });
    });
  }
}

test.describe('the articles', () => {
  test('each listed article opens its own page, and leads back to them all', async ({
    page,
    request,
  }) => {
    const { items } = (await (await request.get('/api/public/insights?locale=EN')).json()) as {
      items: Array<{ slug: string; title: string }>;
    };
    await open(page, '/en/insights');
    if (items.length === 0) {
      await expect(page.getByTestId('insight-link')).toHaveCount(0);
      await expect(page.getByText(en.insights.empty)).toBeVisible();
      return;
    }

    const links = page.getByTestId('insight-link');
    await expect(links).toHaveCount(items.length);
    const [first] = items;
    await links.filter({ hasText: first!.title }).click();
    await expect(page).toHaveURL(`/en/insights/${first!.slug}`);
    await expect(page.getByTestId('insight-title')).toHaveText(first!.title);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('link', { name: en.insights.all })).toHaveAttribute(
      'href',
      '/en/insights',
    );
    expect(await contrastFindings(page)).toEqual([]);
  });

  test('an address with no published article is a 404', async ({ page }) => {
    expect((await page.goto('/en/insights/no-such-article'))?.status()).toBe(404);
    // Not a slug at all: never sent to the API.
    expect((await page.goto('/en/insights/NOT%20A%20SLUG'))?.status()).toBe(404);
  });

  test('the home page lists the latest, each a link, with a way to all of them', async ({
    page,
    request,
  }) => {
    const { total } = (await (
      await request.get('/api/public/insights?locale=EN&limit=1')
    ).json()) as {
      total: number;
    };
    await open(page, '/en');
    if (total === 0) {
      await expect(page.locator('#insights')).toHaveCount(0);
      await expect(page.locator('footer a[href="/en/insights"]')).toHaveCount(0);
      return;
    }
    const section = page.locator('#insights');
    await expect(section.getByTestId('all-insights')).toHaveAttribute('href', '/en/insights');
    for (const link of await section.getByTestId('insight-link').all()) {
      await expect(link).toHaveAttribute('href', /^\/en\/insights\/[a-z0-9-]+$/);
    }
    await expect(page.locator('footer a[href="/en/insights"]')).toHaveCount(1);
  });
});

test('who STAGER is and why choose it read as one section', async ({ page }) => {
  await open(page, '/en');
  const about = page.locator('section#about');
  await expect(about).toHaveCount(1);
  // The reasons sit inside it (when the dashboard has them), not after the videos.
  const why = page.locator('#why');
  if ((await why.count()) > 0) {
    await expect(about.locator('#why')).toHaveCount(1);
    await expect(page.locator('section#why')).toHaveCount(0);
  }
});

test('the pages beside the home page never skip a heading level', async ({ page, request }) => {
  const { items } = (await (
    await request.get('/api/public/insights?locale=EN&limit=1')
  ).json()) as {
    items: Array<{ slug: string }>;
  };
  const paths = ['/en/team', '/en/insights', '/en/privacy'];
  if (items[0]) paths.push(`/en/insights/${items[0].slug}`);

  for (const path of paths) {
    await open(page, path);
    const skips = await page.evaluate(() => {
      const headings = [
        ...document.querySelectorAll<HTMLElement>('[data-site] :is(h1, h2, h3, h4, h5, h6)'),
      ].filter(
        (heading) =>
          !heading.closest('[aria-hidden="true"], [hidden], dialog:not([open])') &&
          getComputedStyle(heading).display !== 'none',
      );
      const found: string[] = [];
      let previous = 0;
      for (const heading of headings) {
        const level = Number(heading.tagName.slice(1));
        if (level > previous + 1) found.push(`h${previous} → h${level}`);
        previous = level;
      }
      return found;
    });
    expect(skips, path).toEqual([]);
  }
});
