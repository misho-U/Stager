'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { Button } from '@/shared/components/button';
import { ErrorNotice, SuccessNotice } from '@/shared/components/panel';
import { ALLOWED_VIDEO_TYPES } from '@pkg/blob/constraints';
import { useVideoFrame } from '@/widgets/video-frame/video-frame.service';

type VideoFrameProps = {
  /** The stored file, saved or just uploaded; null before there is one. */
  src: string | null;
  /** The cover's alt text: the video's title. */
  alt: string;
  /** The new cover's media id. */
  onPicked: (mediaId: string) => void;
};

/**
 * "Take the cover from the video": the owner pauses on a moment of the film
 * and that frame becomes the card's cover on the site, instead of a plain
 * placeholder. Only for an uploaded file; a YouTube video has YouTube's own.
 */
export function VideoFrame({ src, alt, onPicked }: VideoFrameProps) {
  const t = useTranslations('admin.videos.form.frame');
  const [isOpen, setIsOpen] = useState(false);
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const {
    video,
    src: playing,
    isLocal,
    openLocal,
    takeFrame,
    onLoadError,
    error,
    isUploading,
    uploadProgress,
    uploadError,
  } = useVideoFrame(src, alt);

  const take = async () => {
    setDone(false);
    const id = await takeFrame();
    if (id) {
      onPicked(id);
      setDone(true);
    }
  };

  return (
    <div className="flex flex-col gap-3" data-testid="video-frame">
      <div>
        <Button variant="secondary" size="sm" onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? t('hide') : t('open')}
        </Button>
      </div>

      {isOpen ? (
        <div className="border-line bg-surface-inset flex flex-col gap-3 rounded-md border p-3">
          <p className="text-body-sm text-ink-muted">{t('intro')}</p>
          {playing ? (
            <video
              // A new element for a new file: the browser keeps no state of the last.
              key={playing}
              ref={video}
              src={playing}
              // Asked for so the picture may be read; the host must allow it.
              crossOrigin={isLocal ? undefined : 'anonymous'}
              controls
              controlsList="nodownload"
              preload="metadata"
              muted
              playsInline
              onError={isLocal ? undefined : onLoadError}
              aria-label={alt}
              className="border-line aspect-video w-full max-w-md rounded-md border bg-black"
            />
          ) : null}

          {error ? <ErrorNotice message={t(error)} /> : null}
          {uploadError ? <ErrorNotice message={uploadError} /> : null}
          {done ? <SuccessNotice message={t('done')} /> : null}

          <div className="flex flex-wrap items-center gap-2">
            {playing ? (
              <Button size="sm" loading={isUploading} onClick={() => void take()}>
                {isUploading ? t('uploading', { progress: uploadProgress ?? 0 }) : t('use')}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => input.current?.click()}>
              {t('local')}
            </Button>
            <input
              ref={input}
              type="file"
              accept={ALLOWED_VIDEO_TYPES.join(',')}
              className="hidden"
              data-testid="video-frame-file"
              onChange={(event) => {
                openLocal(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>
          <p className="text-caption text-ink-subtle">{t('localHint')}</p>
        </div>
      ) : null}
    </div>
  );
}
