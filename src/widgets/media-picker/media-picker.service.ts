'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { mediaListQuery, useRegisterMedia } from '@/entity/media/api/media.query';
import { uploadToBlob, UploadStalledError } from '@/shared/lib/blob-upload';
import { useFormErrors } from '@/shared/lib/form-errors';
import { prepareImage } from '@/widgets/media-picker/media-picker.utils';
import {
  BLOB_PATH_PREFIX,
  isAllowedImageType,
  MAX_UPLOAD_BYTES,
  sanitizeFilename,
} from '@pkg/blob/constraints';

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

    try {
      // A smaller copy where one helps (see prepareImage), so the size limit
      // applies to what is actually sent: a large camera photo now fits.
      const { file, ...metadata } = await prepareImage(picked);

      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(t('fileTooBig', { max: Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024)) }));
        return null;
      }

      const blob = await uploadToBlob(`${BLOB_PATH_PREFIX}/${sanitizeFilename(file.name)}`, file, {
        onProgress: setUploadProgress,
      });

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
