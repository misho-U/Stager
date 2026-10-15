import type { Page } from '@playwright/test';

/**
 * A screen reader user moves through a page by its headings: the outline must
 * never jump a level (an h3 straight under the h1 reads as a section missing).
 * Returns each jump, empty when the outline is whole. Used by the home page's
 * spec and the navigation spec.
 */
export async function headingSkips(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const headings = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-site] :is(h1, h2, h3, h4, h5, h6, [role="heading"])',
      ),
    ].filter(
      (heading) =>
        !heading.closest('[aria-hidden="true"], [hidden], dialog:not([open])') &&
        // Drawn: neither it nor a box around it is display: none (a page
        // Next keeps hidden after a page change without a reload).
        heading.checkVisibility(),
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
}
