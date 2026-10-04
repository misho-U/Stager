'use client';

import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import type { ReactNode } from 'react';

import {
  openFrom,
  useScreeningPlayer,
} from '@/modules/home-page/elements/chefs-table/elements/screening-room/screening-room.service';
import { cn } from '@/shared/lib/cn';
import { VideoEmbed, VideoUnavailable } from '@/widgets/video-player/video-player.module';

/** A Play that opens a video full screen, growing out of `growFrom` (or itself). */
export function PlayButton({
  videoId,
  label,
  growFrom,
  className,
  children,
}: {
  videoId: string;
  label: string;
  /** Selector of the element the player grows out of, inside the button's card. */
  growFrom?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      data-play={videoId}
      onClick={(event) => {
        const button = event.currentTarget;
        const from = growFrom ? button.closest('[data-video-card]')?.querySelector(growFrom) : null;
        openFrom(videoId, from ?? button);
      }}
      className={className}
    >
      {children}
    </button>
  );
}

type PlayerVideo = {
  id: string;
  title: string;
  meta: string;
  summary: string;
  youtubeId: string | null;
};

/**
 * The full-screen player: the screen darkens, the video's frame grows out of
 * the poster that was pressed, and only then does YouTube's player load. A
 * sample entry without a link says so in the frame. One per page.
 */
export function ScreeningPlayer({
  videos,
  labels,
}: {
  videos: readonly PlayerVideo[];
  labels: { close: string; unavailable: string };
}) {
  const { openId, playing, dialog, frame, onClose, requestClose } = useScreeningPlayer();
  const video = videos.find((item) => item.id === openId) ?? null;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-label={video?.title ?? labels.close}
      data-lenis-prevent
      className="ct-fullscreen"
    >
      <div className="px-gutter mx-auto flex min-h-full max-w-6xl flex-col justify-center gap-6 py-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={requestClose}
            className="border-line-input hover:bg-surface-muted text-body-sm inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-medium transition-colors"
          >
            <XIcon aria-hidden weight="bold" />
            {labels.close}
          </button>
        </div>
        <div
          ref={frame}
          className="bg-surface-raised relative aspect-video w-full overflow-hidden rounded-lg"
        >
          {video && playing ? (
            video.youtubeId ? (
              <VideoEmbed id={video.youtubeId} title={video.title} />
            ) : (
              <VideoUnavailable message={labels.unavailable} />
            )
          ) : null}
        </div>
        {video ? (
          // The caption waits for the frame, which would otherwise grow across it.
          <div
            className={cn(
              'ease-brand flex flex-col gap-2 transition-opacity duration-300',
              playing ? 'opacity-100' : 'opacity-0',
            )}
          >
            <p className="text-body-sm text-ink-muted">{video.meta}</p>
            <h2 className="text-title font-heading stretch-heading text-balance">{video.title}</h2>
            {video.summary ? (
              <p className="text-body-lg text-ink-muted max-w-3xl text-pretty">{video.summary}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
