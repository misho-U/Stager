import { readFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';
import ts from 'typescript';

import type { prepareImage as PrepareImage } from '@/widgets/media-picker/media-picker.utils';

/**
 * What the dashboard does to an image before uploading it
 * (src/widgets/media-picker/media-picker.utils.ts), run in a real browser:
 * canvas, createImageBitmap and the encoders are the browser's own.
 *
 * The file imports nothing, so it is loaded into a blank page as it is, with
 * its types stripped.
 */

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Browser logic; once is enough.');
});

const SOURCE = ts
  .transpileModule(readFileSync('src/widgets/media-picker/media-picker.utils.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  })
  .outputText.replace(/^export /gm, '');

type Outcome = {
  kept: boolean;
  name: string;
  type: string;
  size: number;
  originalSize: number;
  width: number | null;
  height: number | null;
  blur: string | null;
};

/**
 * Draws a picture in the page, saves it as `type`, and prepares it for
 * upload. A gradient, with `grain` on top (what makes a photo heavy), or
 * nothing but `noise`.
 */
async function prepare(
  page: Page,
  picture: {
    width: number;
    height: number;
    type: string;
    quality?: number;
    detail?: 'grain' | 'noise';
  },
): Promise<Outcome> {
  await page.goto('about:blank');
  await page.addScriptTag({ content: SOURCE });
  return page.evaluate(async ({ width, height, type, quality, detail }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1d464a');
    gradient.addColorStop(1, '#e8b04a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    if (detail) {
      const pixels = context.getImageData(0, 0, width, height);
      const { data } = pixels;
      for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * 40;
        for (let channel = i; channel < i + 3; channel += 1) {
          data[channel] = detail === 'noise' ? Math.random() * 255 : (data[channel] ?? 0) + grain;
        }
      }
      context.putImageData(pixels, 0, 0);
    }
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), type, quality),
    );
    const original = new File([blob], `Photo ${width}.original`, { type });

    const prepareImage = (window as unknown as { prepareImage: typeof PrepareImage }).prepareImage;
    const result = await prepareImage(original);
    return {
      kept: result.file === original,
      name: result.file.name,
      type: result.file.type,
      size: result.file.size,
      originalSize: original.size,
      width: result.width,
      height: result.height,
      blur: result.blurDataUrl,
    };
  }, picture);
}

test('a camera-sized photo goes up as a WebP of at most 2560 px', async ({ page }) => {
  const out = await prepare(page, {
    width: 4000,
    height: 3000,
    type: 'image/jpeg',
    quality: 0.95,
    detail: 'grain',
  });
  expect(out.kept).toBe(false);
  expect(out.type).toBe('image/webp');
  expect(out.name).toBe('Photo 4000.webp');
  expect([out.width, out.height]).toEqual([2560, 1920]);
  expect(out.size).toBeLessThan(out.originalSize / 2);
  expect(out.blur).toMatch(/^data:image\/jpeg;base64,/);
});

test('a photo that already fits is still re-encoded when that makes it smaller', async ({
  page,
}) => {
  const out = await prepare(page, {
    width: 1600,
    height: 1000,
    type: 'image/jpeg',
    quality: 1,
    detail: 'grain',
  });
  expect(out.kept).toBe(false);
  expect(out.type).toBe('image/webp');
  expect([out.width, out.height]).toEqual([1600, 1000]);
  expect(out.size).toBeLessThan(out.originalSize);
});

test('a copy that would be bigger is dropped and the original goes up', async ({ page }) => {
  // Noise squeezed to almost nothing (about 5 KB): WebP at 0.85 keeps the
  // blocks that squeezing left, at six times the size.
  const out = await prepare(page, {
    width: 400,
    height: 300,
    type: 'image/jpeg',
    quality: 0.05,
    detail: 'noise',
  });
  expect(out.kept).toBe(true);
  expect(out.type).toBe('image/jpeg');
  expect([out.width, out.height]).toEqual([400, 300]);
});

test('a PNG that fits is left exactly as it is', async ({ page }) => {
  const out = await prepare(page, { width: 320, height: 200, type: 'image/png' });
  expect(out.kept).toBe(true);
  expect([out.width, out.height]).toEqual([320, 200]);
});

test('a PNG past 2560 px is scaled down and stays a PNG', async ({ page }) => {
  const out = await prepare(page, {
    width: 3200,
    height: 1000,
    type: 'image/png',
    detail: 'grain',
  });
  expect(out.kept).toBe(false);
  expect(out.type).toBe('image/png');
  expect(out.name).toBe('Photo 3200.png');
  expect([out.width, out.height]).toEqual([2560, 800]);
});

test('a file the browser cannot read goes up untouched, without measurements', async ({ page }) => {
  await page.goto('about:blank');
  await page.addScriptTag({ content: SOURCE });
  const out = await page.evaluate(async () => {
    const original = new File([new Uint8Array([1, 2, 3, 4])], 'broken.jpg', {
      type: 'image/jpeg',
    });
    const prepareImage = (window as unknown as { prepareImage: typeof PrepareImage }).prepareImage;
    const result = await prepareImage(original);
    return { kept: result.file === original, width: result.width, blur: result.blurDataUrl };
  });
  expect(out).toEqual({ kept: true, width: null, blur: null });
});
