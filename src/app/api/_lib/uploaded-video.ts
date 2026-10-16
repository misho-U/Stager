import { head, type HeadBlobResult } from '@vercel/blob';

import type { Prepared } from '@/app/api/_lib/crud-route';
import {
  isAllowedVideoType,
  MAX_VIDEO_UPLOAD_BYTES,
  VIDEO_PATH_PREFIX,
} from '@pkg/blob/constraints';
import { blobStoreHost } from '@pkg/blob/store';
import { serverEnv } from '@pkg/config/env.server';
import { apiFail } from '@pkg/http/api-response';

/** An uploaded video file, as the blob store describes it. */
export type StoredVideoFile = {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
};

/**
 * What a video repository writes: the form's values, with the file's address
 * swapped for what the store says about it. `file` undefined leaves the file
 * as it is, null removes it.
 */
export type VideoWrite<T extends { fileUrl?: string | null }> = Omit<T, 'fileUrl'> & {
  file?: StoredVideoFile | null;
};

const fail = (
  code: 'BAD_REQUEST' | 'UNSUPPORTED_MEDIA_TYPE' | 'PAYLOAD_TOO_LARGE',
  message: string,
) => ({ ok: false, response: apiFail(code, message) }) as const;

/**
 * Checks a video file the browser says it uploaded, before a video points at
 * it (AGENTS.md § Security rules, 17). Nothing the browser says is taken on
 * trust: the file must be in THIS project's store (every Vercel customer's
 * store shares the domain), under media/videos/, and its type and size are
 * read from the store. What is stored is the store's own `url`, never its
 * `downloadUrl`, and the file must be served inline, so Play plays it in the
 * page rather than downloading it. A video plays either a file or a YouTube
 * link, never both, so a request naming both is refused.
 */
export async function prepareVideoWrite<
  T extends { fileUrl?: string | null; youtubeUrl?: string | null },
>(input: T): Promise<Prepared<VideoWrite<T>>> {
  const { fileUrl, ...rest } = input;

  if (fileUrl && input.youtubeUrl) {
    return fail('BAD_REQUEST', 'A video plays either a YouTube link or a file, not both');
  }
  if (fileUrl === undefined) return { ok: true, data: rest };
  if (fileUrl === null) return { ok: true, data: { ...rest, file: null } };

  let url: URL;
  try {
    url = new URL(fileUrl);
  } catch {
    return fail('BAD_REQUEST', 'Invalid upload URL');
  }

  // The file's own address only. Blob's `downloadUrl` is the same address
  // with `?download=1`, which serves the file as an attachment: a browser
  // asked to play it would save it instead.
  if (url.search !== '' || url.hash !== '') {
    return fail('BAD_REQUEST', 'Upload URL must be the file itself, without a query');
  }

  const store = blobStoreHost();
  if (
    url.protocol !== 'https:' ||
    !store ||
    url.hostname !== store ||
    !url.pathname.startsWith(`/${VIDEO_PATH_PREFIX}/`)
  ) {
    return fail('BAD_REQUEST', 'Upload URL must point at the project blob store');
  }

  let blob: HeadBlobResult;
  try {
    blob = await head(url.toString(), { token: serverEnv.BLOB_READ_WRITE_TOKEN });
  } catch {
    return fail('BAD_REQUEST', 'The upload was not found in the project blob store');
  }

  if (!isAllowedVideoType(blob.contentType)) {
    return fail('UNSUPPORTED_MEDIA_TYPE', 'Only MP4 and WebM videos are allowed');
  }
  if (blob.size > MAX_VIDEO_UPLOAD_BYTES) {
    return fail('PAYLOAD_TOO_LARGE', 'The file is too large');
  }
  // Played in the page, never saved: a file the store would send as an
  // attachment is refused.
  if (/^\s*attachment/i.test(blob.contentDisposition)) {
    return fail('BAD_REQUEST', 'The file is set to download instead of play');
  }

  return {
    ok: true,
    data: {
      ...rest,
      file: {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: blob.size,
      },
    },
  };
}
