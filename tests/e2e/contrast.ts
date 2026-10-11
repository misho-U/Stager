import type { Page } from '@playwright/test';

/**
 * WCAG AA, measured on the rendered page: 4.5:1 for all text, whatever its
 * size, and 3:1 for the boundaries that identify a control (input borders,
 * button fills and outlines, the keyboard focus ring) and for icons. A token
 * edit that breaks a pair fails a test rather than shipping. Used by every
 * public page's spec.
 */

export type Finding = {
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
export async function contrastFindings(page: Page): Promise<Finding[]> {
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
