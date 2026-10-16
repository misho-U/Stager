'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { uploadToBlob, UploadStalledError } from '@/shared/lib/blob-upload';
import { useFormErrors } from '@/shared/lib/form-errors';
import {
  isAllowedVideoType,
  MAX_VIDEO_UPLOAD_BYTES,
  sanitizeFilename,
  VIDEO_PATH_PREFIX,
} from '@pkg/blob/constraints';

/** What the form shows about the file just uploaded, until the video is saved. */
export type UploadedVideo = { url: string; size: number; contentType: string };

/**
 * Uploads a video file straight to Vercel Blob, under media/videos/, where
 * the token route allows video types and a larger size. Nothing is recorded
 * here: the file's address goes into the video form, and the server checks
 * it against the store when the video is saved (uploaded-video.ts). A file
 * uploaded and then not saved stays in the store unused.
 */
export function useVideoUpload(onUploaded: (file: UploadedVideo) => void) {
  const t = useTranslations('admin.errors');
  const formErrors = useFormErrors();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadVideo = async (file: File) => {
    setError(null);

    // Checked again by the store and the server; this only fails fast.
    if (!isAllowedVideoType(file.type)) {
      setError(t('unsupportedVideoType'));
      return;
    }
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      setError(t('fileTooBig', { max: Math.floor(MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024)) }));
      return;
    }

    setProgress(0);
    try {
      const blob = await uploadToBlob(`${VIDEO_PATH_PREFIX}/${sanitizeFilename(file.name)}`, file, {
        onProgress: setProgress,
        multipart: true,
      });
      onUploaded({ url: blob.url, size: file.size, contentType: file.type });
    } catch (caught) {
      setError(
        caught instanceof UploadStalledError ? t('uploadStalled') : formErrors.message(caught),
      );
    } finally {
      setProgress(null);
    }
  };

  return { uploadVideo, isUploading: progress !== null, progress, error };
}
