'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef } from 'react';

import { Button } from '@/shared/components/button';
import { ErrorNotice } from '@/shared/components/panel';
import { useAdminFormat } from '@/shared/lib/use-admin-format';
import { ALLOWED_VIDEO_TYPES } from '@pkg/blob/constraints';
import { useVideoUpload, type UploadedVideo } from '@/widgets/video-upload/video-upload.service';

type VideoUploadProps = {
  label: string;
  hint?: string;
  /** The file the video plays, saved or just uploaded; null for none. */
  value: UploadedVideo | null;
  onChange: (file: UploadedVideo | null) => void;
  error?: string;
};

/**
 * Upload, replace or remove a video's file in the dashboard. The file is
 * shown in the browser's own player, so the owner can check it is the right
 * one, and plays before the video is saved. Removing it only takes effect on
 * Save, like every other field.
 */
export function VideoUpload({ label, hint, value, onChange, error }: VideoUploadProps) {
  const t = useTranslations('admin');
  const format = useAdminFormat();
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const { uploadVideo, isUploading, progress, error: uploadError } = useVideoUpload(onChange);

  return (
    <div className="flex flex-col gap-2" data-testid="video-upload">
      <span className="text-caption text-ink-muted font-medium">{label}</span>

      {value ? (
        <div className="flex flex-col gap-2">
          {/* The owner's own check that this is the right file. */}
          <video
            src={value.url}
            controls
            controlsList="nodownload"
            preload="none"
            playsInline
            aria-label={label}
            className="border-line bg-surface-muted aspect-video w-full max-w-md rounded-md border"
          />
          <p className="text-caption text-ink-subtle">
            {value.contentType.replace('video/', '').toUpperCase()} · {format.fileSize(value.size)}
          </p>
        </div>
      ) : (
        <p className="text-body-sm text-ink-muted">{t('videos.form.file.none')}</p>
      )}

      {uploadError ? <ErrorNotice message={uploadError} /> : null}
      {error ? <p className="text-caption text-danger">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={isUploading}
          aria-describedby={hint ? hintId : undefined}
          onClick={() => input.current?.click()}
        >
          {isUploading
            ? t('media.uploading', { progress: progress ?? 0 })
            : value
              ? t('videos.form.file.replace')
              : t('videos.form.file.upload')}
        </Button>
        {value && !isUploading ? (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            {t('common.remove')}
          </Button>
        ) : null}
        <input
          ref={input}
          type="file"
          accept={ALLOWED_VIDEO_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void uploadVideo(file);
          }}
        />
      </div>

      {hint ? (
        <p id={hintId} className="text-caption text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
