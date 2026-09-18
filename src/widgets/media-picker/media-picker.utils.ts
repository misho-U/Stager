/**
 * Client-side image inspection, done before upload.
 *
 * Dimensions let next/image reserve the right space and avoid layout shift, and
 * the blur placeholder gives a usable preview while a large photo loads. Both
 * are far cheaper to compute here, from the decoded bitmap the browser already
 * has, than by downloading the blob again on the server.
 */

export type ImageMetadata = {
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
};

/** Longest edge of the blur placeholder, in pixels. Small on purpose. */
const BLUR_SIZE = 12;

export async function readImageMetadata(file: File): Promise<ImageMetadata> {
  const empty: ImageMetadata = { width: null, height: null, blurDataUrl: null };

  if (typeof window === 'undefined' || !('createImageBitmap' in window)) return empty;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // A corrupt or unsupported file — let the upload proceed and fail loudly
    // server-side rather than blocking on metadata we can live without.
    return empty;
  }

  try {
    const { width, height } = bitmap;

    const scale = BLUR_SIZE / Math.max(width, height);
    const blurWidth = Math.max(1, Math.round(width * scale));
    const blurHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = blurWidth;
    canvas.height = blurHeight;

    const context = canvas.getContext('2d');
    if (!context) return { width, height, blurDataUrl: null };

    context.drawImage(bitmap, 0, 0, blurWidth, blurHeight);

    // JPEG at low quality: a handful of bytes, and it is inlined into the HTML,
    // so size matters more than fidelity.
    const blurDataUrl = canvas.toDataURL('image/jpeg', 0.5);

    return { width, height, blurDataUrl };
  } finally {
    bitmap.close();
  }
}

/** Human-readable file size for the media library listing. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
