/**
 * Draws the site's icons and its share image from the brandbook:
 *
 *   src/app/favicon.ico                           16, 32 and 48 px
 *   src/shared/brandbook/images/icon.png          192 px: browsers, Android
 *   src/shared/brandbook/images/apple-icon.png    180 px: an iPhone's home screen
 *   src/shared/brandbook/images/share-image.png   1200 × 630: a link's preview card
 *
 * Set in type, like the site's wordmark (shared/components/wordmark.tsx),
 * until the logo artwork is in the repository. The colours, the typeface and
 * the wordmark's spacing are read from brandbook.css and site.css, so a brand
 * change is one run of `pnpm brand:images` and a commit of the files above.
 * Not part of the build: the images change only when the brand does.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium, type Page } from '@playwright/test';

import { BRAND } from '../src/shared/brandbook/tokens';

const ROOT = process.cwd();
const BRANDBOOK = path.join(ROOT, 'src/shared/brandbook');
const IMAGES = path.join(BRANDBOOK, 'images');

/**
 * The brandbook as a browser reads it: Tailwind's `@theme` blocks become
 * plain custom properties, and the fonts are inlined (a page set from a
 * string cannot load files beside it).
 */
function stylesheets(): string {
  const brandbook = readFileSync(path.join(BRANDBOOK, 'brandbook.css'), 'utf8')
    .replace(/@theme(?:\s+static)?\s*\{/g, ':root {')
    .replace(/url\('\.\/fonts\/([^']+)'\)/g, (_, file: string) => {
      const data = readFileSync(path.join(BRANDBOOK, 'fonts', file)).toString('base64');
      return `url(data:font/woff2;base64,${data})`;
    });
  const site = readFileSync(path.join(BRANDBOOK, 'site.css'), 'utf8');
  return `${brandbook}\n${site}`;
}

const LAYOUT = `
  html, body { margin: 0; background: transparent; }
  .icon {
    display: grid;
    place-items: center;
    background: var(--color-brand-teal);
    color: var(--color-brand-cream-light);
    font-family: var(--font-brand);
    font-weight: 600;
    line-height: 1;
  }
  .icon span { transform: translateY(-0.02em); }
  .card {
    position: relative;
    box-sizing: border-box;
    width: 1200px;
    height: 630px;
    padding: 88px 96px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    background: var(--color-surface);
    color: var(--color-ink);
    font-family: var(--font-brand);
  }
  /* A pool of light, and the stage floor: the site's own decoration. */
  .card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(55% 75% at 82% 92%, var(--ct-glow), transparent 70%);
  }
  .card::after {
    content: '';
    position: absolute;
    inset: 40% 0 0;
    background-image: radial-gradient(
      circle,
      color-mix(in oklab, var(--color-ink) 18%, transparent) 1.5px,
      transparent 2px
    );
    background-size: 32px 32px;
    mask-image: linear-gradient(to bottom, transparent, black 70%);
  }
  .card > * { position: relative; z-index: 1; }
  .card p { margin: 0; }
  .mark {
    font-size: 136px;
    font-weight: 600;
    letter-spacing: var(--tracking-wordmark);
    line-height: 1;
  }
  .rule {
    display: block;
    width: 112px;
    height: 4px;
    margin: 44px 0 36px;
    border-radius: 2px;
    background: var(--color-accent);
  }
  .positioning { font-size: 46px; line-height: 1.2; color: var(--color-ink); }
  .tagline { font-size: 30px; color: var(--color-ink-muted); }
`;

async function render(
  page: Page,
  body: string,
  file: string,
  size: { width: number; height: number },
) {
  await page.setViewportSize(size);
  await page.setContent(
    `<!doctype html><html lang="en"><head><style>${stylesheets()}${LAYOUT}</style></head><body>${body}</body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  const shot = await page.locator('body > *').first().screenshot({ omitBackground: true });
  if (file) writeFileSync(file, shot);
  return shot;
}

function iconMarkup(size: number, rounded: boolean): string {
  const radius = rounded ? `border-radius: ${Math.round(size * 0.22)}px;` : '';
  return `<div data-site class="icon" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.66)}px;${radius}"><span>S</span></div>`;
}

/** An .ico holding PNGs (every browser since 2007 reads them), largest last. */
function ico(pngs: Array<{ size: number; data: Buffer }>): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map(({ data }) => data)]);
}

async function main() {
  // The same override as playwright.config.ts, for an image whose Chromium
  // is not the one this Playwright version would download.
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  );
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  try {
    await render(page, iconMarkup(192, true), path.join(IMAGES, 'icon.png'), {
      width: 192,
      height: 192,
    });
    // iOS rounds the corners itself, and shows transparency as black.
    await render(page, iconMarkup(180, false), path.join(IMAGES, 'apple-icon.png'), {
      width: 180,
      height: 180,
    });
    const favicons = [];
    for (const size of [16, 32, 48]) {
      favicons.push({
        size,
        data: await render(page, iconMarkup(size, true), '', { width: size, height: size }),
      });
    }
    writeFileSync(path.join(ROOT, 'src/app/favicon.ico'), ico(favicons));

    await render(
      page,
      `<div data-site class="card">
        <div>
          <p class="mark">${BRAND.name}</p>
          <span class="rule"></span>
          <p class="positioning">${BRAND.positioning.replace('&', '&amp;')}</p>
        </div>
        <p class="tagline">${BRAND.tagline}</p>
      </div>`,
      path.join(IMAGES, 'share-image.png'),
      { width: 1200, height: 630 },
    );
  } finally {
    await browser.close();
  }
  console.log('brand-images: wrote the favicon, the icons and the share image.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
