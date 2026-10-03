/**
 * Client-side image preparation, done before upload.
 *
 * - A photo (JPEG, WebP, AVIF) is scaled down to MAX_EDGE on its longest side
 *   and re-encoded as WebP. Camera originals used to be stored as they came,
 *   up to 12 MB, and the image optimizer fetched and decoded the whole file
 *   for every size it made. Re-encoding also drops the camera's metadata,
 *   which can say where a photo was taken (a team portrait shot at home).
 * - A PNG (a logo, a diagram: sharp edges, transparency) keeps its format,
 *   which lossy WebP would soften. It is only scaled down past MAX_EDGE.
 * - A copy that does not come out smaller is thrown away, and the original
 *   is uploaded instead.
 *
 * Dimensions let next/image reserve the right space and avoid layout shift, and
 * the blur placeholder gives a usable preview while a large photo loads. Both
 * are far cheaper to compute here, from the decoded bitmap the browser already
 * has, than by downloading the blob again on the server.
 *
 * Imports nothing: tests/e2e/upload-image.spec.ts runs this file as it is, in
 * a browser page.
 */

export type PreparedImage = {
  /** What to upload: the original, or a smaller copy of it. */
  file: File;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
};

/** Longest edge kept, in pixels: a full-width image on a 2× laptop screen. */
export const MAX_EDGE = 2560;

/** WebP quality for photos; at viewing size it cannot be told from the original. */
const PHOTO_QUALITY = 0.85;

/** Longest edge of the blur placeholder, in pixels. Small on purpose. */
const BLUR_SIZE = 12;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function prepareImage(original: File): Promise<PreparedImage> {
  const unread: PreparedImage = { file: original, width: null, height: null, blurDataUrl: null };

  if (typeof window === 'undefined' || !('createImageBitmap' in window)) return unread;

  let bitmap: ImageBitmap;
  try {
    // Turned upright as the camera recorded it, before anything is measured.
    bitmap = await createImageBitmap(original, { imageOrientation: 'from-image' });
  } catch {
    // A corrupt or unsupported file — let the upload proceed and fail loudly
    // server-side rather than blocking on metadata we can live without.
    return unread;
  }

  try {
    const blurDataUrl = drawBlur(bitmap);
    // A copy that fails to come out (memory, an odd format) costs nothing:
    // the original goes up as before.
    const copy = await smallerCopy(bitmap, original).catch(() => null);
    return copy
      ? { ...copy, blurDataUrl }
      : { file: original, width: bitmap.width, height: bitmap.height, blurDataUrl };
  } finally {
    bitmap.close();
  }
}

/** The image re-encoded at MAX_EDGE at most, or null when the original is the better upload. */
async function smallerCopy(
  bitmap: ImageBitmap,
  original: File,
): Promise<{ file: File; width: number; height: number } | null> {
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const isPng = original.type === 'image/png';
  if (isPng && scale === 1) return null;

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = isPng
    ? await encode(canvas, 'image/png')
    : // Safari cannot write WebP. A JPEG then, but only from a JPEG: a WebP or
      // AVIF may be transparent, and JPEG would fill that in black.
      ((await encode(canvas, 'image/webp', PHOTO_QUALITY)) ??
      (original.type === 'image/jpeg' ? await encode(canvas, 'image/jpeg', PHOTO_QUALITY) : null));

  if (!blob || blob.size >= original.size) return null;

  const base = original.name.replace(/\.[^.]*$/, '') || 'image';
  const file = new File([blob], `${base}.${EXTENSIONS[blob.type]}`, {
    type: blob.type,
    lastModified: original.lastModified,
  });
  return { file, width, height };
}

/** The canvas as `type`, or null when this browser cannot write that format. */
function encode(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    // A browser that cannot write `type` quietly writes a PNG instead.
    canvas.toBlob((blob) => resolve(blob?.type === type ? blob : null), type, quality);
  });
}

function drawBlur(bitmap: ImageBitmap): string | null {
  const scale = BLUR_SIZE / Math.max(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  // JPEG at low quality: a handful of bytes, and it is inlined into the HTML,
  // so size matters more than fidelity.
  return canvas.toDataURL('image/jpeg', 0.5);
}
