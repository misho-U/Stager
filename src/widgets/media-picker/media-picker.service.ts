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

export function useMediaPicker() {
  const { data, isLoading, error } = useQuery(mediaListQuery());
  const registerMedia = useRegisterMedia();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * Upload straight to Vercel Blob, then record the result.
   *
   * The file bypasses our server entirely — `upload()` asks
   * /api/admin/media/upload for a scoped token and then talks to Blob directly.
   * Only the resulting URL comes back through our API, which is why the Media
   * row is created in a second step rather than in Blob's completion webhook
   * (that webhook cannot reach a localhost dev server).
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

    try {
      const metadata = await readImageMetadata(file);

      const blob = await upload(`${BLOB_PATH_PREFIX}/${sanitizeFilename(file.name)}`, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/media/upload',
        contentType: file.type,
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
      setUploadError(toFormErrorMessage(caught));
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    items: data?.items ?? [],
    isLoading,
    loadError: error ? toFormErrorMessage(error) : null,
    uploadFile,
    isUploading,
    uploadError,
  };
}
