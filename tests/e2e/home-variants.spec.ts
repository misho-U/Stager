import { expect, test, type Page } from '@playwright/test';

/**
 * TEMPORARY — the five home page designs under comparison (`?v=a…e`).
 * Delete with the variants once one is chosen; its contrast and layout checks
 * then move to the chosen design's own spec.
 *
 * Every design must meet WCAG AA on its own: 4.5:1 for all text, whatever
 * its size, and 3:1 for the boundaries that identify a control — input
 * borders, button fills and outlines, the keyboard focus ring — and for
 * icons. Measured on the rendered page, so a token edit that breaks a pair
 * fails here rather than shipping.
 */

const VARIANTS = ['a', 'b', 'c', 'd', 'e'] as const;
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
        .filter((element) => !element.closest('[role="dialog"], [data-susan-item]'))
        .filter((element) => !shown(element))
        .map((element) => (element.textContent ?? '').trim().slice(0, 40));
    });
    expect(hidden).toEqual([]);

    // An intro, if the design has one, is gone.
    await expect(page.locator('[data-intro]')).toBeHidden();
  });
}

test.describe('the intro', () => {
  test('plays once per visit, and any key skips it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one browser is enough for motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/en?v=e');
    const curtain = page.locator('[data-intro]');
    await expect(curtain).toBeVisible();

    await page.waitForTimeout(800);
    await page.keyboard.press('Space');
    await expect(curtain).toBeHidden({ timeout: 3000 });

    // Played in this tab: a reload never shows it again.
    await page.reload();
    await expect(page.getByTestId('hero-heading')).toBeVisible();
    await expect(curtain).toBeHidden();
  });

  test('never plays under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en?v=e');
    await expect(page.getByTestId('hero-heading')).toBeVisible();
    await expect(page.locator('[data-intro]')).toBeHidden();
  });
});

test.describe('the design comparison bar', () => {
  test('opens a design from a link and switches with plain links', async ({ page }) => {
    await openVariant(page, 'ka', 'b');

    const bar = page.getByTestId('design-variant-switcher');
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('link')).toHaveText(['ა', 'ბ', 'გ', 'დ', 'ე']);
    await expect(bar.getByRole('link', { name: 'ვარიანტი ბ' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await bar.getByRole('link', { name: 'ვარიანტი გ' }).click();
    await expect(page).toHaveURL(/\/ka\?v=c$/);
    await expect(page.locator('[data-home-variant="c"]')).toBeVisible();
  });

  test('switching language keeps the design', async ({ page }) => {
    await openVariant(page, 'ka', 'c');
    // The switcher reads the query inside a Suspense boundary, so its first
    // paint is a fallback without it. React reveals the streamed links a
    // moment later (it batches reveals, ~300ms, often after `load`), and a
    // click in between would drop the design. Wait for what a visitor sees.
    const english = page.getByRole('link', { name: 'ENG' });
    await expect(english).toHaveAttribute('href', /[?&]v=c(&|$)/);
    await english.click();
    await expect(page).toHaveURL(/\/en\?v=c$/);
    await expect(page.locator('[data-home-variant="c"]')).toBeVisible();
  });

  test('an unknown design falls back to the first', async ({ page }) => {
    await page.goto('/ka?v=nope');
    await expect(page.locator('[data-home-variant="a"]')).toBeVisible();
  });

  test('the preview is kept out of search engines', async ({ page }) => {
    await page.goto('/ka');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
