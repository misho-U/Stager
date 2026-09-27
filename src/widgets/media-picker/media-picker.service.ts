'use client';

import { upload } from '@vercel/blob/client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { mediaListQuery, useRegisterMedia } from '@/entity/media/api/media.query';
import { toFormErrorMessage } from '@/shared/lib/form-errors';
import { readImageMetadata } from '@/widgets/media-picker/media-picker.utils';
import {
  BLOB_PATH_PREFIX,
  isAllowedImageType,
  MAX_UPLOAD_BYTES,
  sanitizeFilename,
} from '@pkg/blob/constraints';

/**
 * How long an upload may go without sending a byte before it is stopped.
 *
 * When the connection to Blob fails, the Blob client retries ten times with
 * growing waits, about seventeen minutes in all, and the dashboard showed
 * "Uploading…" for that whole time with no explanation. Measured from upload
 * progress rather than from the start, so a large photo on a slow connection
 * is never cut off while its bytes are still moving.
 */
const UPLOAD_STALL_MS = 30_000;

const STALLED_MESSAGE =
  'The upload stopped making progress, so it was cancelled. Check the connection and try again. If it keeps happening, uploads are being blocked: contact whoever maintains the site.';

class UploadStalledError extends Error {}

export function useMediaPicker() {
  const { data, isLoading, error } = useQuery(mediaListQuery());
  const registerMedia = useRegisterMedia();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * Upload straight to Vercel Blob, then record the result.
   *
   * The file bypasses our server entirely — `upload()` asks
   * /api/admin/media/upload for a scoped token and then talks to Blob directly.
   * Only the resulting URL comes back through our API, which is why the Media
   * row is created in a second step rather than in a Blob completion webhook
   * (Vercel's callback carries no admin session, so it could never pass).
   */
  const uploadFile = async (file: File, alt: string) => {
    setUploadError(null);

    // Checked again server-side; this is just to fail fast with a clear message.
    if (!isAllowedImageType(file.type)) {
      setUploadError('Only JPEG, PNG, WebP and AVIF images can be uploaded.');
      return null;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(`Images must be under ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`);
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Stops the upload, and reports it, once no progress has arrived for
    // UPLOAD_STALL_MS. Re-armed by every progress event.
    const controller = new AbortController();
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let reportStall: (error: UploadStalledError) => void = () => {};
    const stalled = new Promise<never>((_, reject) => {
      reportStall = reject;
    });
    const rearmWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        controller.abort();
        reportStall(new UploadStalledError());
      }, UPLOAD_STALL_MS);
    };

    try {
      const metadata = await readImageMetadata(file);

      rearmWatchdog();
      const blob = await Promise.race([
        upload(`${BLOB_PATH_PREFIX}/${sanitizeFilename(file.name)}`, file, {
          access: 'public',
          handleUploadUrl: '/api/admin/media/upload',
          contentType: file.type,
          abortSignal: controller.signal,
          onUploadProgress: ({ percentage }) => {
            setUploadProgress(Math.round(percentage));
            rearmWatchdog();
          },
        }),
        stalled,
      ]);
      clearTimeout(watchdog);

      return await registerMedia.mutateAsync({
        url: blob.url,
        pathname: blob.pathname,
        contentType: file.type,
        size: file.size,
        width: metadata.width,
        height: metadata.height,
        blurDataUrl: metadata.blurDataUrl,
        alt,
      });
    } catch (caught) {
      setUploadError(
        caught instanceof UploadStalledError ? STALLED_MESSAGE : toFormErrorMessage(caught),
      );
      return null;
    } finally {
      clearTimeout(watchdog);
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return {
    items: data?.items ?? [],
    isLoading,
    loadError: error ? toFormErrorMessage(error) : null,
    uploadFile,
    isUploading,
    /** 0–100 while an upload is running, otherwise null. */
    uploadProgress,
    uploadError,
  };
}
