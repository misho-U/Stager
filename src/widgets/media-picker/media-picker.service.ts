'use client';

import { upload } from '@vercel/blob/client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { mediaListQuery, useRegisterMedia } from '@/entity/media/api/media.query';
import { useFormErrors } from '@/shared/lib/form-errors';
import { prepareImage } from '@/widgets/media-picker/media-picker.utils';
import {
  BLOB_PATH_PREFIX,
  isAllowedImageType,
  MAX_UPLOAD_BYTES,
  sanitizeFilename,
} from '@pkg/blob/constraints';

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

class UploadStalledError extends Error {}

export function useMediaPicker() {
  const t = useTranslations('admin.errors');
  const formErrors = useFormErrors();
  const { data, isLoading, error, refetch } = useQuery(mediaListQuery());
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
  const uploadFile = async (picked: File, alt: string) => {
    setUploadError(null);

    // Checked again server-side; this is just to fail fast with a clear message.
    if (!isAllowedImageType(picked.type)) {
      setUploadError(t('unsupportedType'));
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Stops the upload, and reports it, once no progress has arrived within
    // the current limit. Re-armed by every progress event.
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
      // A smaller copy where one helps (see prepareImage), so the size limit
      // applies to what is actually sent: a large camera photo now fits.
      const { file, ...metadata } = await prepareImage(picked);

      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(t('fileTooBig', { max: Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024)) }));
        return null;
      }

      rearmWatchdog();
      const blob = await Promise.race([
        upload(`${BLOB_PATH_PREFIX}/${sanitizeFilename(file.name)}`, file, {
          access: 'public',
          handleUploadUrl: '/api/admin/media/upload',
          contentType: file.type,
          abortSignal: controller.signal,
          onUploadProgress: ({ loaded, percentage }) => {
            bytesAreMoving ||= loaded > 0;
            // Held at 99 until the upload finishes: in Chrome the figure runs
            // up to 2 MB ahead of the network, so "100%" could otherwise sit
            // on screen for as long as the real upload takes.
            setUploadProgress(Math.min(99, Math.floor(percentage)));
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
        caught instanceof UploadStalledError ? t('uploadStalled') : formErrors.message(caught),
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
    // Only while nothing has loaded; a failed refresh keeps what is on screen.
    loadError: error && !data ? formErrors.message(error) : null,
    retry: () => void refetch(),
    uploadFile,
    isUploading,
    /** 0–100 while an upload is running, otherwise null. */
    uploadProgress,
    uploadError,
  };
}
