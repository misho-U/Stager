/**
 * Upload constraints, shared by the browser (to fail fast) and the server (to
 * actually enforce). The server copy is the one that counts — the browser check
 * is a courtesy that anyone can bypass.
 */
// SVG is deliberately excluded. An SVG is an executable document — it can carry
// <script> — and next/image refuses to optimise one anyway unless
// `dangerouslyAllowSVG` is turned on. Logos go up as PNG or WebP.
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** 12 MB. Large enough for a full-resolution photo before next/image resizes it. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export function isAllowedImageType(contentType: string): contentType is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType);
}

/**
 * Video files, played on the site in place of a YouTube link. MP4 (H.264) and
 * WebM play in every current browser; a phone's .mov often does not, so it is
 * refused rather than shown as a black frame: export it as MP4 first.
 */
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;

/**
 * 200 MB: a few minutes of good-quality video. Every view downloads the file
 * from the blob store, which is billed by the byte, so long films belong on
 * YouTube.
 */
export const MAX_VIDEO_UPLOAD_BYTES = 200 * 1024 * 1024;

export function isAllowedVideoType(contentType: string): boolean {
  return (ALLOWED_VIDEO_TYPES as readonly string[]).includes(contentType);
}

/**
 * Folder prefix inside the blob store. Uploads always get a random suffix, so a
 * caller cannot overwrite an existing object by guessing its name, and cannot
 * escape this prefix.
 */
export const BLOB_PATH_PREFIX = 'media';

/** Where video files go, inside the media prefix; the upload token's rules follow the folder. */
export const VIDEO_PATH_PREFIX = `${BLOB_PATH_PREFIX}/videos`;

/** Strips directory traversal and anything that is not a safe filename. */
export function sanitizeFilename(filename: string): string {
  const base = filename.split('/').pop()?.split('\\').pop() ?? 'upload';
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100) || 'upload'
  );
}
