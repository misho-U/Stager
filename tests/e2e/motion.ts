import { expect, type Page } from '@playwright/test';

/**
 * With motion allowed, as most visitors see it: after the entrance and a
 * scroll to the bottom and back, nothing a visitor needs may be left hidden.
 * The motion starts things invisible and relies on its script to show them,
 * on a first load and after a client-side page change alike. Used by the
 * home page's spec and the navigation spec.
 *
 * `entranceMs`: how long the page's entrance is given before the scroll.
 */
export async function expectSettledVisible(page: Page, entranceMs: number) {
  await page.waitForTimeout(entranceMs);

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
    // The page shown: after a page change without a reload, Next keeps the
    // pages left behind in the document, hidden whole (display: none).
    const site = [...document.querySelectorAll('[data-site]')].find(
      (element) => getComputedStyle(element).display !== 'none',
    );
    if (!site) return ['no page shown'];
    return [...site.querySelectorAll('h1, h2, h3, [data-testid="inquiry-form"]')]
      .filter((element) => !element.closest('dialog, [role="dialog"]'))
      .filter((element) => !shown(element))
      .map((element) => (element.textContent ?? '').trim().slice(0, 40));
  });
  expect(hidden).toEqual([]);

  // Every figure has counted all the way up to its own number.
  const figures = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-count-to]')]
      .filter((figure) => figure.checkVisibility())
      .map((figure) => {
        const to = Number(figure.dataset.countTo);
        const expected = figure.hasAttribute('data-grouped')
          ? to.toLocaleString('en-US')
          : String(to);
        return { shown: figure.textContent, expected };
      }),
  );
  for (const { shown, expected } of figures) expect(shown).toBe(expected);
}
