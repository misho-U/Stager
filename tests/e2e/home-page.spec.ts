import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  DB_WRITES_ALLOWED,
  DB_WRITES_SKIP_REASON,
  disconnectTestPrisma,
  testPrisma,
} from './db-guard';

/**
 * The home page, in the site's one design ("Chef's Table", dark).
 *
 * It must meet WCAG AA: 4.5:1 for all text, whatever its size, and 3:1 for
 * the boundaries that identify a control — input borders, button fills and
 * outlines, the keyboard focus ring — and for icons. Measured on the rendered
 * page, so a token edit that breaks a pair fails here rather than shipping.
 */

const LOCALES = ['ka', 'en'] as const;

type Finding = {
  kind: string;
  element: string;
  ratio: number;
  minimum: number;
};

/**
 * Walks the rendered page and returns every pair below its minimum.
 *
 * Colours are resolved through a 1px canvas, so any CSS colour syntax works
 * (the brandbook mixes in oklab). A background is the element's own fill,
 * composited over its ancestors' until an opaque one is reached.
 */
async function contrastFindings(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    type Rgba = [number, number, number, number];

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('No 2D canvas context');
    const probe = document.createElement('div');
    probe.style.display = 'none';
    document.body.append(probe);

    const parse = (css: string): Rgba => {
      probe.style.color = '';
      probe.style.color = css;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = getComputedStyle(probe).color;
      context.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };

    const over = (top: Rgba, bottom: Rgba): Rgba => {
      const alpha = top[3] + bottom[3] * (1 - top[3]);
      if (alpha === 0) return [0, 0, 0, 0];
      const channel = (i: 0 | 1 | 2) =>
        (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / alpha;
      return [channel(0), channel(1), channel(2), alpha];
    };

    const backgroundOf = (element: Element | null): Rgba => {
      const layers: Rgba[] = [];
      for (let node = element; node; node = node.parentElement) {
        const fill = parse(getComputedStyle(node).backgroundColor);
        if (fill[3] > 0) layers.push(fill);
        if (fill[3] >= 1) break;
      }
      return layers
        .reverse()
        .reduce<Rgba>((below, layer) => over(layer, below), [255, 255, 255, 1]);
    };

    const luminance = ([r, g, b]: Rgba) => {
      const linear = (c: number) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    };

    const ratio = (a: Rgba, b: Rgba) => {
      const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
      return (light + 0.05) / (dark + 0.05);
    };

    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) return false; // includes sr-only
      const style = getComputedStyle(element);
      return style.visibility !== 'hidden' && Number(style.opacity) > 0;
    };

    const describe = (element: Element) => {
      const id = element.id ? `#${element.id}` : '';
      const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return `${element.tagName.toLowerCase()}${id} "${text}"`;
    };

    const findings: Array<{ kind: string; element: string; ratio: number; minimum: number }> = [];
    const check = (kind: string, element: Element, a: Rgba, b: Rgba, minimum: number) => {
      const value = ratio(over(a, b), b);
      if (value < minimum) {
        findings.push({
          kind,
          element: describe(element),
          ratio: Number(value.toFixed(2)),
          minimum,
        });
      }
    };

    const scopes = [document.querySelector('[data-site]')].filter(
      (scope): scope is Element => scope !== null,
    );

    for (const scope of scopes) {
      const elements = [scope, ...scope.querySelectorAll('*')];

      for (const element of elements) {
        // Skipped: the form's honeypot (screen-reader-only and never shown),
        // disabled controls, and pure decoration (`data-decorative`: a
        // drawing's grid and zone letters, a ring of words repeating a
        // button's label, a cursor), all of which WCAG exempts.
        if (element.closest('.sr-only, [disabled], [data-decorative]') || !visible(element)) {
          continue;
        }
        const style = getComputedStyle(element);

        // Text: every element that directly holds visible characters, and
        // every form control (what a visitor types takes its colour).
        const holdsText = [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        );
        const isControl = element.matches('input:not([type="hidden"]), select, textarea');
        if (holdsText || isControl) {
          check('text', element, parse(style.color), backgroundOf(element), 4.5);
        }

        // Icons carry meaning here (services, contact lines, the camera).
        if (element.matches('svg')) {
          check('icon', element, parse(style.color), backgroundOf(element.parentElement), 3);
        }

        // Form controls: the border that shows where to type, and the
        // primary-coloured border that marks focus.
        if (isControl) {
          const outside = backgroundOf(element.parentElement);
          check('control border', element, parse(style.borderTopColor), outside, 3);
          check(
            'control focus',
            element,
            parse(style.getPropertyValue('--color-primary')),
            outside,
            3,
          );
        }

        // Links and buttons: a fill or outline that identifies them, and the
        // focus ring drawn around them.
        if (element.matches('a, button, [tabindex="0"]')) {
          const outside = backgroundOf(element.parentElement);
          const fill = parse(style.backgroundColor);
          if (fill[3] > 0) {
            check('button fill', element, fill, outside, 3);
          } else if (parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== 'none') {
            check('button outline', element, parse(style.borderTopColor), outside, 3);
          }
          check('focus ring', element, parse(style.getPropertyValue('--color-focus')), outside, 3);
        }
      }
    }

    probe.remove();
    return findings;
  });
}

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

  const SPLIT_TEXT = '[data-ct-headline], [data-read-along]';
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
    // The headline and the intro, at least.
    expect(whole.length).toBeGreaterThanOrEqual(2);

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
  const skips = await page.evaluate(() => {
    const headings = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-site] :is(h1, h2, h3, h4, h5, h6, [role="heading"])',
      ),
    ].filter(
      (heading) =>
        !heading.closest('[aria-hidden="true"], [hidden], dialog:not([open])') &&
        getComputedStyle(heading).display !== 'none',
    );
    const found: string[] = [];
    let previous = 0;
    for (const heading of headings) {
      const level = Number(heading.getAttribute('aria-level') ?? heading.tagName.slice(1));
      if (level > previous + 1) {
        found.push(`h${previous} → h${level}: ${(heading.textContent ?? '').trim().slice(0, 40)}`);
      }
      previous = level;
    }
    return found;
  });
  expect(skips).toEqual([]);
});

/**
 * With motion allowed, as most visitors see it: after the entrance and a
 * scroll to the bottom and back, nothing a visitor needs may be left hidden.
 * The motion starts things invisible and relies on its script to show them.
 */
test('with motion on, the page settles fully visible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'one browser is enough for motion');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/en');
  await expect(page.locator('[data-site]')).toBeVisible();
  await page.waitForTimeout(4500);

  // Scroll through like a visitor, so every scroll-driven entrance fires,
  // then back to the top, where the first scene is shown in full again.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (const step of [500, -500]) {
    for (let y = 0; y <= height; y += 500) {
      await page.mouse.wheel(0, step);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1500);
  }

  const hidden = await page.evaluate(() => {
    const shown = (element: Element) => {
      for (let node: Element | null = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (Number(style.opacity) < 0.99) return false;
      }
      return true;
    };
    return [
      ...document.querySelectorAll(
        '[data-site] h1, [data-site] h2, [data-site] h3, [data-testid="inquiry-form"]',
      ),
    ]
      .filter((element) => !element.closest('dialog, [role="dialog"]'))
      .filter((element) => !shown(element))
      .map((element) => (element.textContent ?? '').trim().slice(0, 40));
  });
  expect(hidden).toEqual([]);

  // Every figure has counted all the way up to its own number.
  const figures = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-count-to]')].map((figure) => {
      const to = Number(figure.dataset.countTo);
      const expected = figure.hasAttribute('data-grouped')
        ? to.toLocaleString('en-US')
        : String(to);
      return { shown: figure.textContent, expected };
    }),
  );
  for (const { shown, expected } of figures) expect(shown).toBe(expected);
});

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
