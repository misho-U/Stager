import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * TEMPORARY — the home page designs under comparison (round 4, `?v=1`, `?v=2`).
 * Delete with the variants once one is chosen; its contrast and layout checks
 * then move to the chosen design's own spec.
 *
 * Every design must meet WCAG AA on its own: 4.5:1 for all text, whatever
 * its size, and 3:1 for the boundaries that identify a control — input
 * borders, button fills and outlines, the keyboard focus ring — and for
 * icons. Measured on the rendered page, so a token edit that breaks a pair
 * fails here rather than shipping.
 */

const VARIANTS: readonly string[] = ['1', '2'];
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

    const scopes = [
      document.querySelector('[data-home-variant]'),
      document.querySelector('[data-testid="design-variant-switcher"]'),
    ].filter((scope): scope is Element => scope !== null);

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

async function openVariant(page: Page, locale: string, variant: string) {
  // The settled page: sections that rise into view as they are scrolled to
  // would otherwise still be invisible below the fold, and the contrast scan
  // skips anything invisible.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/${locale}?v=${variant}`);
  await expect(page.locator(`[data-home-variant="${variant}"]`)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const variant of VARIANTS) {
  for (const locale of LOCALES) {
    test.describe(`design ${variant.toUpperCase()} on /${locale}`, () => {
      test('renders the database content and the inquiry form', async ({ page }) => {
        await openVariant(page, locale, variant);

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
        await page.locator('[data-home-variant] main a[href="#inquiry"]:visible').first().click();
        await expect(page.getByTestId('inquiry-form')).toBeInViewport();
      });

      test('fits the screen without sideways scrolling', async ({ page }) => {
        await openVariant(page, locale, variant);
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
          await openVariant(page, locale, variant);
          const header = await page.evaluate(() => {
            const element = document.querySelector('[data-home-variant] header');
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
        await openVariant(page, locale, variant);
        expect(await contrastFindings(page)).toEqual([]);

        // Validation errors appear on the same backgrounds as the fields.
        await page.getByTestId('inquiry-form').locator('button[type="submit"]').click();
        await expect(page.getByTestId('inquiry-form').getByRole('alert').first()).toBeVisible();
        expect(await contrastFindings(page)).toEqual([]);
      });
    });
  }

  test(`design ${variant.toUpperCase()}: Georgian text is never capitalised, slanted or cramped`, async ({
    page,
  }) => {
    // Chromium leaves Mkhedruli unchanged under `uppercase`, faked italics
    // look broken in Georgian, and tall Georgian letters collide below the
    // brandbook's tightest line height (AGENTS.md § Design skill).
    await openVariant(page, 'ka', variant);
    const problems = await page.evaluate(() => {
      const georgian = /[Ⴀ-ჿᲐ-Ჿ]/;
      const found: string[] = [];
      for (const element of document.querySelectorAll('[data-home-variant] *')) {
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
}

/**
 * A slow phone: the design's script arrives seconds after the page. The hero
 * must not wait for it (its text is the page's Largest Contentful Paint), and
 * once shown it must never be hidden again for an entrance the visitor would
 * see as a flicker.
 */
for (const variant of VARIANTS) {
  test(`design ${variant.toUpperCase()}: a late script neither delays the hero nor hides it again`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one browser is enough for motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // Scripts only: the stylesheet arrives with the page, as it would.
    await page.route('**/_next/static/chunks/**/*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.continue();
    });
    await page.goto(`/en?v=${variant}`, { waitUntil: 'commit' });

    const hero = page.locator(`[data-home-variant="${variant}"] [data-enter]`).last();
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
    await expect(page.locator(`[data-home-variant="${variant}"]`)).toHaveAttribute(
      'data-motion',
      'on',
    );
  });
}

/**
 * With motion allowed, as most visitors see it: after the entrance and a
 * scroll to the bottom and back, nothing a visitor needs may be left hidden.
 * The motion starts things invisible and relies on its script to show them.
 */
for (const variant of VARIANTS) {
  test(`design ${variant.toUpperCase()}: with motion on, the page settles fully visible`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one browser is enough for motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/en?v=${variant}`);
    await expect(page.locator(`[data-home-variant="${variant}"]`)).toBeVisible();
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
          '[data-home-variant] h1, [data-home-variant] h2, [data-testid="inquiry-form"]',
        ),
      ]
        .filter((element) => !element.closest('dialog, [role="dialog"]'))
        .filter((element) => !shown(element))
        .map((element) => (element.textContent ?? '').trim().slice(0, 40));
    });
    expect(hidden).toEqual([]);

    // An intro, if the design has one, is gone.
    await expect(page.locator('[data-intro]')).toBeHidden();
  });
}

/**
 * The Academy and the videos: entries the dashboard cannot hold yet are
 * samples, and every design must say so; registering opens the site's own
 * form, preset; a video without a link explains itself instead of playing.
 */
for (const variant of VARIANTS) {
  test.describe(`design ${variant}: the Academy and the videos`, () => {
    test('are marked as samples while the dashboard has none', async ({ page, request }) => {
      const [hasCourses, hasVideos] = await Promise.all([
        dashboardHas(request, 'courses'),
        dashboardHas(request, 'videos'),
      ]);
      await openVariant(page, 'en', variant);
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
      await openVariant(page, 'en', variant);
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
      test.skip(
        await dashboardHas(request, 'videos'),
        'The dashboard has videos; no samples show.',
      );
      await openVariant(page, 'en', variant);
      await page.locator('#videos button[aria-label^="Play"]:visible').first().click();
      await expect(
        page.locator('#videos [role="status"], dialog[open] [role="status"]'),
      ).toContainText('sample entry');
    });
  });
}

test.describe('design 1: exploring in place', () => {
  test('the Academy filter shows one category, and All brings the rest back', async ({ page }) => {
    await openVariant(page, 'en', '1');
    test.skip(
      (await page.locator('#academy [aria-pressed]').count()) < 2,
      'No categories to filter by.',
    );
    const rows = page.locator('[data-testid="course-list"] > li:visible');
    const total = await rows.count();
    const chip = page.locator('#academy [aria-pressed]').nth(1);
    const count = Number((await chip.locator('span').textContent())?.trim());
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(rows).toHaveCount(count);
    await page.locator('#academy [aria-pressed]').first().click();
    await expect(rows).toHaveCount(total);
  });

  test('choosing an episode writes its title on the player', async ({ page }) => {
    await openVariant(page, 'en', '1');
    const episodes = page.locator('#videos ol button');
    test.skip((await episodes.count()) < 3, 'Needs three videos or more.');
    const episode = episodes.nth(2);
    const title = (await episode.locator('[data-episode-title]').textContent())?.trim() ?? '';
    await episode.click();
    await expect(episode).toHaveAttribute('aria-current', 'true');
    // The title sits on the frame itself, over the poster.
    await expect(page.locator('#videos [data-video-player] h3')).toHaveText(title);
  });

  test('the services read as a journey, one stage per service', async ({ page }) => {
    await openVariant(page, 'en', '1');
    const stages = page.locator('#services [data-journey-step]');
    const count = await stages.count();
    expect(count).toBeGreaterThan(1);
    await expect(page.locator('#services [data-journey-step] h3')).toHaveCount(count);
    // A stage's Academy course takes the visitor to the Academy.
    const course = page.locator('#services .ok-step-course').first();
    if ((await course.count()) > 0) {
      await expect(course).toHaveAttribute('href', '#academy');
    }
  });
});

test.describe('design 2: the tickets, the screening room and the menu', () => {
  test('the Academy tabs show one category, and All brings the rest back', async ({ page }) => {
    await openVariant(page, 'en', '2');
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
    await openVariant(page, 'en', '2');
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

  test('the services index lists every service and takes the visitor to one', async ({
    page,
  }, testInfo) => {
    // With motion: on a desktop that is when the cards stack under the index.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/en?v=2');
    await expect(page.locator('[data-home-variant="2"]')).toBeVisible();
    const links = page.locator('[data-stack-index] [data-index-link]');
    const cards = page.locator('[data-stack-card]');
    await expect(links).toHaveCount(await cards.count());
    const target = 2;
    await links.nth(target).click();
    await expect(cards.nth(target)).toBeInViewport();
    // On a desktop the cards stack, and the index marks the one in front.
    if (testInfo.project.name === 'chromium') {
      await expect(links.nth(target)).toHaveAttribute('aria-current', 'true');
    } else {
      // A plain in-page link: the card lands its scroll-margin below the top,
      // clear of the header, and not twice that (Lenis applies the margin
      // itself; an offset on top of it once doubled the gap).
      await expect
        .poll(() =>
          cards
            .nth(target)
            .evaluate((card) =>
              Math.abs(
                card.getBoundingClientRect().top -
                  parseFloat(getComputedStyle(card).scrollMarginTop),
              ),
            ),
        )
        .toBeLessThan(2);
    }
  });

  test('the newest video is described from the top of its frame', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'the description sits beside the frame on a desktop',
    );
    await openVariant(page, 'en', '2');
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
    await openVariant(page, 'en', '2');
    await page.locator('[data-ct-header] button[aria-haspopup="dialog"]').click();
    const menu = page.locator('dialog[open]');
    const academy = menu.getByRole('link', { name: 'Academy' });
    await expect(academy).toBeVisible();
    await academy.click();
    await expect(menu).toBeHidden();
    await expect(page.locator('#academy-title')).toBeInViewport();
  });
});

test.describe('the design comparison bar', () => {
  test('opens a design from a link and switches with plain links', async ({ page }) => {
    const [first = '1', second] = VARIANTS;
    await openVariant(page, 'ka', first);

    const bar = page.getByTestId('design-variant-switcher');
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('link')).toHaveText([...VARIANTS]);
    await expect(bar.getByRole('link', { name: `ვარიანტი ${first}` })).toHaveAttribute(
      'aria-current',
      'page',
    );

    if (second) {
      await bar.getByRole('link', { name: `ვარიანტი ${second}` }).click();
      await expect(page).toHaveURL(new RegExp(`/ka\\?v=${second}$`));
      await expect(page.locator(`[data-home-variant="${second}"]`)).toBeVisible();
    }
  });

  test('switching language keeps the design', async ({ page }) => {
    const variant = VARIANTS.at(-1) ?? '1';
    await openVariant(page, 'ka', variant);
    // The switcher reads the query inside a Suspense boundary, so its first
    // paint is a fallback without it. React reveals the streamed links a
    // moment later (it batches reveals, ~300ms, often after `load`), and a
    // click in between would drop the design. Wait for what a visitor sees.
    const english = page.getByRole('link', { name: 'ENG' });
    await expect(english).toHaveAttribute('href', new RegExp(`[?&]v=${variant}(&|$)`));
    await english.click();
    await expect(page).toHaveURL(new RegExp(`/en\\?v=${variant}$`));
    await expect(page.locator(`[data-home-variant="${variant}"]`)).toBeVisible();
  });

  test('an unknown design falls back to the first', async ({ page }) => {
    await page.goto('/ka?v=nope');
    await expect(page.locator(`[data-home-variant="${VARIANTS[0] ?? '1'}"]`)).toBeVisible();
  });

  test('the preview is kept out of search engines', async ({ page }) => {
    await page.goto('/ka');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
