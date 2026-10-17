import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { contrastFindings } from './contrast';
import {
  DB_WRITES_ALLOWED,
  DB_WRITES_SKIP_REASON,
  disconnectTestPrisma,
  testPrisma,
} from './db-guard';
import { headingSkips } from './headings';
import { expectSettledVisible } from './motion';

/**
 * The home page, in the site's one design ("Chef's Table", dark).
 *
 * It must meet WCAG AA: 4.5:1 for all text, whatever its size, and 3:1 for
 * the boundaries that identify a control — input borders, button fills and
 * outlines, the keyboard focus ring — and for icons. Measured on the rendered
 * page, so a token edit that breaks a pair fails here rather than shipping.
 */

const LOCALES = ['ka', 'en'] as const;

/** Whether the dashboard holds entries of its own there, in which case no samples show. */
async function dashboardHas(request: APIRequestContext, list: 'courses' | 'videos') {
  const response = await request.get(`/api/public/${list}?locale=EN`);
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { items: unknown[] }).items.length > 0;
}

async function openHome(page: Page, locale: string) {
  // The settled page: sections that rise into view as they are scrolled to
  // would otherwise still be invisible below the fold, and the contrast scan
  // skips anything invisible.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/${locale}`);
  await expect(page.locator('[data-site]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const locale of LOCALES) {
  test.describe(`the home page on /${locale}`, () => {
    test('renders the database content and the inquiry form', async ({ page }) => {
      await openHome(page, locale);

      await expect(page.getByTestId('read-failure')).toHaveCount(0);
      await expect(page.getByTestId('hero-heading')).toBeVisible();
      await expect(page.getByTestId('hero-heading')).not.toHaveText('[no hero heading set]');
      await expect(page.getByTestId('project-list')).toBeVisible();
      await expect(page.getByTestId('project-title').first()).not.toBeEmpty();
      await expect(page.getByTestId('wordmark')).toHaveCount(1);

      // Every "start a project" link scrolls to the form on this page.
      await expect(page.locator(`#inquiry [data-testid="inquiry-form"]`)).toHaveCount(1);
      await expect(page.locator('a[href="/contact"], a[href$="/contact"]')).toHaveCount(0);
      // The page's own call to action (in <main>, not the header's copy of
      // it), clicked like a visitor would: nothing drawn over it may take
      // the click.
      await page.locator('[data-site] main a[href="#inquiry"]:visible').first().click();
      await expect(page.getByTestId('inquiry-form')).toBeInViewport();
    });

    test('fits the screen without sideways scrolling', async ({ page }) => {
      await openHome(page, locale);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0);
    });

    test('keeps its header on one line at tablet widths', async ({ page }, testInfo) => {
      // Where the section links first appear, Georgian labels are longest.
      test.skip(testInfo.project.name !== 'chromium', 'desktop browser widths only');
      for (const width of [768, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await openHome(page, locale);
        const header = await page.evaluate(() => {
          const element = document.querySelector('[data-site] header');
          const links = [...(element?.querySelectorAll('nav a') ?? [])].filter(
            (link) => link.getBoundingClientRect().width > 0,
          );
          return {
            height: element?.getBoundingClientRect().height ?? 0,
            rows: new Set(links.map((link) => Math.round(link.getBoundingClientRect().top))).size,
          };
        });
        expect(header.rows, `the navigation wraps at ${width}px`).toBeLessThanOrEqual(1);
        expect(header.height, `the header is too tall at ${width}px`).toBeLessThanOrEqual(80);
      }
    });

    test('meets 4.5:1 for text and 3:1 for controls, focus and icons', async ({ page }) => {
      await openHome(page, locale);
      expect(await contrastFindings(page)).toEqual([]);

      // Validation errors appear on the same backgrounds as the fields.
      await page.getByTestId('inquiry-form').locator('button[type="submit"]').click();
      await expect(page.getByTestId('inquiry-form').getByRole('alert').first()).toBeVisible();
      expect(await contrastFindings(page)).toEqual([]);
    });
  });
}

test('Georgian text is never capitalised, slanted or cramped', async ({ page }) => {
  // Chromium leaves Mkhedruli unchanged under `uppercase`, faked italics
  // look broken in Georgian, and tall Georgian letters collide below the
  // brandbook's tightest line height (AGENTS.md § Design skill).
  await openHome(page, 'ka');
  const problems = await page.evaluate(() => {
    const georgian = /[Ⴀ-ჿᲐ-Ჿ]/;
    const found: string[] = [];
    for (const element of document.querySelectorAll('[data-site] *')) {
      const text = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join('');
      if (!georgian.test(text)) continue;
      const style = getComputedStyle(element);
      const lineHeight = parseFloat(style.lineHeight) / parseFloat(style.fontSize);
      if (style.textTransform === 'uppercase') found.push(`uppercase: ${text.trim()}`);
      if (style.fontStyle !== 'normal') found.push(`italic: ${text.trim()}`);
      if (lineHeight < 1.049) found.push(`line height ${lineHeight.toFixed(2)}: ${text.trim()}`);
    }
    return found;
  });
  expect(problems).toEqual([]);
});

/**
 * A slow phone: the design's script arrives seconds after the page. The hero
 * must not wait for it (its text is the page's Largest Contentful Paint), and
 * once shown it must never be hidden again for an entrance the visitor would
 * see as a flicker.
 */
test('a late script neither delays the hero nor hides it again', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'one browser is enough for motion');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Scripts only: the stylesheet arrives with the page, as it would.
  await page.route('**/_next/static/chunks/**/*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.continue();
  });
  await page.goto('/en', { waitUntil: 'commit' });

  const hero = page.locator('[data-site] [data-enter]').last();
  // Hidden at first, waiting for its entrance…
  await expect(hero).toHaveCSS('opacity', '0');
  // …then shown by the CSS fallback, long before the script.
  await expect(hero).toHaveCSS('opacity', '1', { timeout: 2000 });

  // The script lands seconds later; the hero stays fully shown throughout.
  const lowest = await hero.evaluate(
    (element) =>
      new Promise<number>((resolve) => {
        let min = 1;
        const started = performance.now();
        const sample = () => {
          min = Math.min(min, Number(getComputedStyle(element).opacity));
          if (performance.now() - started < 6000) requestAnimationFrame(sample);
          else resolve(min);
        };
        sample();
      }),
  );
  expect(lowest).toBe(1);
  // And the script did take over, without an entrance.
  await expect(page.locator('[data-site]')).toHaveAttribute('data-motion', 'on');
});

/**
 * Text split into lines, words or letters for an entrance must still read
 * whole, and once, to a screen reader: what assistive technology is given is
 * compared with the same page under reduced motion, where nothing is split
 * (shared/lib/motion/split.ts). The footer wordmarks are decoration, hidden
 * either way.
 *
 * The intro is written here, in the English copy of HOME's intro, and put
 * back afterwards: a fresh database has none, and the design splits it as a
 * short statement.
 */
test.describe('split text and screen readers', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(({}, testInfo) => {
    test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
    test.skip(testInfo.project.name !== 'chromium', 'Writes the intro; one browser is enough.');
  });

  // The hero's headline, the intro, and every section heading rising into view.
  const SPLIT_TEXT = '[data-ct-headline], [data-read-along], [data-rise]';
  const INTRO_TEXT = '[data-read-along]';
  const INTRO =
    '<p>STAGER builds better food businesses.</p><p>We work in the kitchen, not only in the office.</p>';
  const INTRO_WITH_LINK =
    '<p>STAGER builds better food businesses. <a href="#inquiry">Write to us</a> to begin.</p>';

  let original: { id: string; body: string } | null = null;

  const revalidatePages = (request: APIRequestContext) =>
    request.post('/api/dev/revalidate-probe', {
      data: { entity: 'page', key: 'HOME' },
      headers: { 'sec-fetch-site': 'same-origin' },
    });

  async function setIntro(request: APIRequestContext, body: string) {
    const prisma = testPrisma();
    if (!original) {
      const section = await prisma.pageSection.findFirstOrThrow({
        where: { key: 'intro', page: { key: 'HOME' } },
        select: { translations: { where: { locale: 'EN' }, select: { id: true, body: true } } },
      });
      const [translation] = section.translations;
      if (!translation) throw new Error('HOME has no English intro: run `pnpm db:seed` first.');
      original = translation;
    }
    await prisma.pageSectionTranslation.update({ where: { id: original.id }, data: { body } });
    expect((await revalidatePages(request)).ok()).toBeTruthy();
  }

  test.afterAll(async ({ playwright }, testInfo) => {
    if (!original) return;
    await testPrisma().pageSectionTranslation.update({
      where: { id: original.id },
      data: { body: original.body },
    });
    const api = await playwright.request.newContext({ baseURL: testInfo.project.use.baseURL });
    await revalidatePages(api);
    await api.dispose();
    await disconnectTestPrisma();
  });

  test('split text still reads whole to a screen reader', async ({ page, request }) => {
    await setIntro(request, INTRO);
    const split = page.locator(SPLIT_TEXT);
    // Each split element's surroundings, as a screen reader is given them,
    // and how many elements it holds (splitting wraps every piece in one).
    const readOut = async () =>
      Promise.all(
        (await split.all()).map(async (element) => ({
          spoken: await element.locator('..').ariaSnapshot(),
          pieces: await element.evaluate((node) => node.querySelectorAll('*').length),
        })),
      );

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en');
    const whole = await readOut();
    // The headline, the intro and a section heading, at least.
    expect(whole.length).toBeGreaterThanOrEqual(3);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/en');
    await expect(page.locator('[data-site]')).toHaveAttribute('data-motion', 'on');
    const animated = await readOut();
    expect(animated).toHaveLength(whole.length);
    animated.forEach(({ spoken, pieces }, index) => {
      // Split…
      expect(pieces).toBeGreaterThan(whole[index]?.pieces ?? 0);
      // …and read exactly as it was whole.
      expect(spoken).toBe(whole[index]?.spoken);
    });
  });

  test('intro text holding a link is left whole, so the link keeps its name', async ({
    page,
    request,
  }) => {
    await setIntro(request, INTRO_WITH_LINK);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/en');
    await expect(page.locator('[data-site]')).toHaveAttribute('data-motion', 'on');

    // The intro's text, wherever the design puts it (a subheading may sit beside it).
    const intro = page.locator(INTRO_TEXT).filter({ hasText: 'Write to us' });
    await expect(intro.getByRole('link', { name: 'Write to us' })).toBeVisible();
    await expect(intro).not.toHaveAttribute('aria-hidden', 'true');
  });
});

/**
 * A screen reader user moves through a page by its headings: the outline must
 * never jump a level (an h3 straight under the h1 reads as a section missing).
 */
test('the headings never skip a level', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('[data-site]')).toBeVisible();
  expect(await headingSkips(page)).toEqual([]);
});

/**
 * With motion allowed, as most visitors see it: after the entrance and a
 * scroll to the bottom and back, nothing a visitor needs may be left hidden.
 * The motion starts things invisible and relies on its script to show them.
 */
for (const path of ['/en', '/en/team', '/en/insights']) {
  test(`with motion on, ${path} settles fully visible`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one browser is enough for motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(path);
    await expect(page.locator('[data-site]')).toBeVisible();
    await expectSettledVisible(page, path === '/en' ? 4500 : 2000);
  });
}

/**
 * The Academy and the videos: entries the dashboard cannot hold yet are
 * samples, and the page must say so; registering opens the site's own form,
 * preset; a video without a link explains itself instead of playing.
 */
test.describe('the Academy and the videos', () => {
  test('are marked as samples while the dashboard has none', async ({ page, request }) => {
    const [hasCourses, hasVideos] = await Promise.all([
      dashboardHas(request, 'courses'),
      dashboardHas(request, 'videos'),
    ]);
    await openHome(page, 'en');
    for (const [section, real] of [
      ['#academy', hasCourses],
      ['#videos', hasVideos],
    ] as const) {
      const badge = page.locator(`${section} [data-testid="sample-badge"]`);
      if (real) await expect(badge).toHaveCount(0);
      else await expect(badge.first()).toBeVisible();
    }
  });

  test('Register opens the inquiry form, preset to the course', async ({ page }) => {
    await openHome(page, 'en');
    const register = page.locator('#academy [data-register]:visible').first();
    await register.click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('select')).toHaveValue('TRAINING');
    await expect(dialog.locator('textarea')).not.toHaveValue('');
    // The drawer meets the same contrast bar as the page.
    expect(await contrastFindings(page)).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    // Focus goes back to the button that opened it.
    await expect(register).toBeFocused();
  });

  test('a video without a link says it is a sample instead of playing', async ({
    page,
    request,
  }) => {
    test.skip(await dashboardHas(request, 'videos'), 'The dashboard has videos; no samples show.');
    await openHome(page, 'en');
    await page.locator('#videos button[aria-label^="Play"]:visible').first().click();
    await expect(
      page.locator('#videos [role="status"], dialog[open] [role="status"]'),
    ).toContainText('sample entry');
  });
});

test.describe('the tickets, the screening room and the menu', () => {
  test('the Academy tabs show one category, and All brings the rest back', async ({ page }) => {
    await openHome(page, 'en');
    test.skip(
      (await page.locator('#academy [aria-pressed]').count()) < 2,
      'No categories to filter by.',
    );
    const tickets = page.locator('[data-testid="course-list"] > li:visible');
    const total = await tickets.count();
    const tab = page.locator('#academy [aria-pressed]').nth(1);
    const count = Number((await tab.locator('span').textContent())?.trim());
    await tab.click();
    await expect(tab).toHaveAttribute('aria-pressed', 'true');
    await expect(tickets).toHaveCount(count);
    await page.locator('#academy [aria-pressed]').first().click();
    await expect(tickets).toHaveCount(total);
  });

  test('a video opens full screen, and Escape returns to its card', async ({ page }) => {
    await openHome(page, 'en');
    const cards = page.locator('#videos ul [data-video-card]');
    test.skip((await cards.count()) === 0, 'Needs two videos or more.');
    const card = cards.first();
    const title = (await card.locator('h3').textContent())?.trim() ?? '';
    const play = card.locator('[data-play]');
    await play.click();

    const player = page.locator('dialog[open]');
    await expect(player).toBeVisible();
    await expect(player).toHaveAttribute('aria-label', title);
    await expect(player.getByRole('heading', { name: title })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(player).toBeHidden();
    await expect(play).toBeFocused();
  });

  test('the newest video is described from the top of its frame', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'the description sits beside the frame on a desktop',
    );
    await openHome(page, 'en');
    const frame = page.locator('#videos [data-video-card]').first();
    const heading = page.locator('#videos article').first().locator('h3');
    await frame.scrollIntoViewIfNeeded();
    const [frameBox, textBox] = await Promise.all([
      frame.boundingBox(),
      heading.locator('xpath=..').boundingBox(),
    ]);
    expect(Math.abs((frameBox?.y ?? 0) - (textBox?.y ?? 0))).toBeLessThanOrEqual(2);
  });

  test('the menu lists the sections and takes the visitor to one', async ({ page }) => {
    await openHome(page, 'en');
    await page.locator('[data-ct-header] button[aria-haspopup="dialog"]').click();
    const menu = page.locator('dialog[open]');
    const academy = menu.getByRole('link', { name: 'Academy' });
    await expect(academy).toBeVisible();
    await academy.click();
    await expect(menu).toBeHidden();
    await expect(page.locator('#academy-title')).toBeInViewport();
  });

  test('the menu is a panel under its button, and a click outside closes it', async ({ page }) => {
    await openHome(page, 'en');
    const button = page.locator('[data-ct-header] button[aria-haspopup="dialog"]');
    await button.click();
    const menu = page.locator('dialog[open]');
    await expect(menu).toBeVisible();

    // Compact, not the whole screen: under the button, centred on a phone
    // and level with the button's right edge on a wider screen (the owner's
    // choice for each), narrower than the page on a wide screen.
    const [panel, trigger, viewport] = await Promise.all([
      menu.boundingBox(),
      button.boundingBox(),
      page.viewportSize(),
    ]);
    expect(panel && trigger && viewport).toBeTruthy();
    expect(panel!.y).toBeGreaterThanOrEqual(trigger!.y + trigger!.height);
    if (viewport!.width < 640) {
      expect(Math.abs(panel!.x + panel!.width / 2 - viewport!.width / 2)).toBeLessThan(2);
    } else {
      expect(Math.abs(panel!.x + panel!.width - (trigger!.x + trigger!.width))).toBeLessThan(2);
    }
    expect(panel!.height).toBeLessThan(viewport!.height);
    if (viewport!.width >= 768) expect(panel!.width).toBeLessThan(viewport!.width / 2);

    // A click beside it closes it, and the keyboard is back on the button.
    await page.mouse.click(10, viewport!.height - 10);
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();

    // So does Escape.
    await button.click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });
});

test.describe('the company, its services and its projects', () => {
  test('the figures follow the hero, each read whole', async ({ page, request }) => {
    const response = await request.get('/api/public/company-stats?locale=EN');
    expect(response.ok()).toBeTruthy();
    const real = ((await response.json()) as { items: unknown[] }).items.length > 0;
    await openHome(page, 'en');

    const band = page.getByTestId('stat-band');
    await expect(band).toBeVisible();
    // Right under the hero, before anything else.
    const next = await page.evaluate(() =>
      Boolean(
        document
          .querySelector('#top')
          ?.nextElementSibling?.querySelector('[data-testid="stat-band"]'),
      ),
    );
    expect(next, 'the figures come right after the hero').toBe(true);
    // Placeholders until the dashboard has figures of its own, and marked so.
    const badge = page.locator(
      'section:has([data-testid="stat-band"]) [data-testid="sample-badge"]',
    );
    await expect(badge).toHaveCount(real ? 0 : 1);
    // A screen reader hears each value whole, once: the counting digits are hidden from it.
    for (const figure of await band.locator('dd').all()) {
      const counted = figure.locator('[aria-hidden]');
      if ((await counted.count()) === 0) continue;
      await expect(figure.locator('.sr-only')).toHaveCount(1);
    }
  });

  test('the services read as a journey, one stage per service, without the Academy', async ({
    page,
    request,
  }) => {
    const response = await request.get('/api/public/services?locale=EN&limit=100');
    const services = ((await response.json()) as { items: unknown[] }).items.length;
    test.skip(services === 0, 'No services to show.');
    await openHome(page, 'en');
    const stages = page.locator('#services [data-journey-step]');
    await expect(stages).toHaveCount(services);
    await expect(page.locator('#services [data-journey-step] h3')).toHaveCount(services);
    // The client's call: the service cards no longer point at the Academy.
    await expect(page.locator('#services a')).toHaveCount(0);
  });

  test("a project's summary waits for the pointer, or reads under its name on a touch screen", async ({
    page,
  }, testInfo) => {
    await openHome(page, 'en');
    const card = page.locator('.ct-project:has([data-testid="project-summary"])').first();
    test.skip((await card.count()) === 0, 'No project has a summary.');
    const summary = card.getByTestId('project-summary');
    const title = card.getByTestId('project-title');
    await card.scrollIntoViewIfNeeded();

    if (testInfo.project.name === 'chromium') {
      await expect(summary).toHaveCSS('opacity', '0');
      await card.locator('.ct-project-frame').hover();
      await expect(summary).toHaveCSS('opacity', '1');
      // Over the photos, not under the name.
      const [summaryBox, titleBox] = await Promise.all([
        summary.boundingBox(),
        title.boundingBox(),
      ]);
      expect(summaryBox?.y ?? 0).toBeLessThan(titleBox?.y ?? 0);
    } else {
      // No hover on a touch screen: always shown, under the name.
      await expect(summary).toHaveCSS('opacity', '1');
      const [summaryBox, titleBox] = await Promise.all([
        summary.boundingBox(),
        title.boundingBox(),
      ]);
      expect(summaryBox?.y ?? 0).toBeGreaterThan(titleBox?.y ?? 0);
    }
  });

  test('projects have no page of their own: the cards link nowhere', async ({ page }) => {
    await openHome(page, 'en');
    await expect(page.locator('#projects a')).toHaveCount(0);
  });
});

test('the preview is kept out of search engines', async ({ page }) => {
  await page.goto('/ka');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
