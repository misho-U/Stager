'use client';

import type { PutBlobResult } from '@vercel/blob';
import { upload } from '@vercel/blob/client';

/**
 * How long an upload may take to get its first bytes out before it is stopped.
 *
 * When the browser cannot reach Blob at all (the upload is blocked, or the
 * connection is down), the Blob client retries ten times with growing waits,
 * about seventeen minutes in all, and the dashboard showed "Uploading…" for
 * that whole time with no explanation. Nothing is sent in that case, so a short
 * limit catches it without any risk to an upload that works.
 */
const UPLOAD_START_MS = 30_000;

/**
 * How long an upload that has started may then go without reporting progress.
 *
 * Far longer, because silence is normal once bytes are moving: Chrome reads
 * the file up to about 2 MB ahead of what the network has sent and reports
 * nothing while that drains, which on a slow connection takes well over 30
 * seconds. A 30-second limit here cancelled working uploads.
 */
const UPLOAD_SILENCE_MS = 120_000;

/** The upload stopped making progress and was cancelled (see the limits above). */
export class UploadStalledError extends Error {}

/**
 * Uploads a file straight to Vercel Blob through the dashboard's token route,
 * stopping it, and reporting it, once no progress has arrived within the
 * current limit. `onProgress` gets 0–99: held below 100 until the upload has
 * finished, because Chrome's figure runs up to 2 MB ahead of the network and
 * "100%" could otherwise sit on screen for as long as the real upload takes.
 *
 * `multipart` sends a large file in parts, each retried on its own: for video.
 */
export async function uploadToBlob(
  pathname: string,
  file: File,
  { onProgress, multipart = false }: { onProgress: (percent: number) => void; multipart?: boolean },
): Promise<PutBlobResult> {
  const controller = new AbortController();
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let bytesAreMoving = false;
  let reportStall: (error: UploadStalledError) => void = () => {};
  const stalled = new Promise<never>((_, reject) => {
    reportStall = reject;
  });
  const rearmWatchdog = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(
      () => {
        controller.abort();
        reportStall(new UploadStalledError());
      },
      bytesAreMoving ? UPLOAD_SILENCE_MS : UPLOAD_START_MS,
    );
  };

  try {
    rearmWatchdog();
    return await Promise.race([
      upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/media/upload',
        contentType: file.type,
        multipart,
        abortSignal: controller.signal,
        onUploadProgress: ({ loaded, percentage }) => {
          bytesAreMoving ||= loaded > 0;
          onProgress(Math.min(99, Math.floor(percentage)));
          rearmWatchdog();
        },
      }),
      stalled,
    ]);
  } finally {
    clearTimeout(watchdog);
  }
}
