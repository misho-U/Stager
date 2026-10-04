'use client';

import { PlayIcon } from '@phosphor-icons/react/dist/csr/Play';
import { useRef, type ReactNode } from 'react';

import {
  playInSection,
  usePlaylistStore,
  useSwapIn,
} from '@/modules/home-page/elements/open-kitchen/elements/video-playlist/video-playlist.service';
import {
  VideoCaption,
  VideoEmbed,
  VideoUnavailable,
  WatchOnYouTube,
} from '@/widgets/video-player/video-player.module';

export type PlaylistVideo = {
  id: string;
  title: string;
  summary: string;
  /** Kind, length and date, already written out: "Podcast, 48 min". */
  meta: string;
  /** "Play: <title>", for the play button's accessible name. */
  playLabel: string;
  /** Null for an entry still waiting for its YouTube link. */
  youtubeId: string | null;
  youtubeUrl: string | null;
  /** "Watch on YouTube: <title>", for the link to YouTube. */
  youtubeLabel: string;
  /** The poster for the big player, and the small one for the list. */
  poster: ReactNode;
  thumb: ReactNode;
};

type VideoPlaylistProps = {
  videos: readonly PlaylistVideo[];
  labels: { list: string; nowPlaying: string; unavailable: string };
};

/** A "Play" anywhere on the page that starts a video in the video section's player. */
export function PlayInSectionButton({
  videoId,
  sectionId,
  label,
  className,
  children,
}: {
  videoId: string;
  sectionId: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => playInSection(videoId, sectionId)}
      className={className}
    >
      {children}
    </button>
  );
}

/**
 * The video section's player and its list of episodes. The chosen episode's
 * title and summary are written on its frame, and give way to the picture
 * when a mouse rests there; Play loads the privacy-preserving YouTube player
 * in place. The list sits beside the player on a wide screen and becomes a
 * row to swipe below it on a phone, where height is short. A sample entry
 * (no link yet) explains itself instead of playing.
 */
export function VideoPlaylist({ videos, labels }: VideoPlaylistProps) {
  const storedId = usePlaylistStore((state) => state.activeId);
  const playing = usePlaylistStore((state) => state.playing);
  const choose = usePlaylistStore((state) => state.choose);
  const play = usePlaylistStore((state) => state.play);

  const active = videos.find((video) => video.id === storedId) ?? videos[0];
  const player = useRef<HTMLDivElement>(null);
  useSwapIn(active?.id ?? '', [player]);

  if (!active) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-12 lg:gap-10">
      <div
        ref={player}
        data-video-player
        data-video-card
        className="bg-ink relative aspect-video overflow-hidden rounded-lg lg:col-span-8"
      >
        {playing ? (
          active.youtubeId ? (
            <VideoEmbed key={active.id} id={active.youtubeId} title={active.title} />
          ) : (
            <VideoUnavailable message={labels.unavailable} />
          )
        ) : (
          <>
            {active.poster}
            <VideoCaption className="ok-caption">
              <div aria-live="polite" className="flex max-w-3xl flex-col gap-1.5 sm:gap-2.5">
                <p className="text-caption sm:text-body-sm ok-caption-meta">{active.meta}</p>
                <h3 className="text-title-sm sm:text-title font-heading line-clamp-2 text-balance">
                  {active.title}
                </h3>
                {active.summary ? (
                  <p className="text-body ok-caption-meta line-clamp-2 text-pretty max-sm:hidden">
                    {active.summary}
                  </p>
                ) : null}
              </div>
            </VideoCaption>
            <button
              type="button"
              onClick={() => play(active.id)}
              aria-label={active.playLabel}
              className="ok-on-poster group absolute inset-0 flex items-center justify-center pb-(--ok-play-lift)"
            >
              <span className="bg-surface-raised text-ink shadow-card ease-brand flex size-(--ok-play-sm) items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 sm:size-(--ok-play)">
                <PlayIcon aria-hidden weight="fill" size="1.5rem" />
              </span>
            </button>
            <WatchOnYouTube
              youtubeUrl={active.youtubeUrl}
              label={active.youtubeLabel}
              className="ok-youtube absolute top-3 right-3 sm:top-4 sm:right-4"
            />
          </>
        )}
      </div>

      <ol
        aria-label={labels.list}
        className="max-lg:-mx-gutter max-lg:px-gutter max-lg:scroll-px-gutter ok-chips flex gap-3 max-lg:snap-x max-lg:snap-mandatory max-lg:overflow-x-auto max-lg:pb-1 lg:col-span-4 lg:flex-col lg:gap-1.5"
      >
        {videos.map((video) => {
          const current = video.id === active.id;
          return (
            <li key={video.id} className="max-lg:w-(--ok-episode-w) max-lg:shrink-0 max-lg:snap-start">
              <button
                type="button"
                aria-current={current ? 'true' : undefined}
                onClick={() => choose(video.id)}
                className="hover:bg-surface-raised aria-[current=true]:ring-primary flex h-full w-full flex-col gap-3 rounded-lg p-2 text-left transition-all aria-[current=true]:ring-2 lg:grid lg:grid-cols-(--ok-playlist-row) lg:items-center lg:gap-4 lg:p-2.5"
              >
                <span className="relative aspect-video overflow-hidden rounded-(--ok-radius-thumb)">
                  {video.thumb}
                </span>
                <span className="flex min-w-0 flex-col gap-1 px-1 lg:px-0">
                  <span className="text-caption text-ink-muted">
                    {current && playing ? labels.nowPlaying : video.meta}
                  </span>
                  <span
                    data-episode-title
                    className="text-body-sm line-clamp-2 font-medium text-pretty"
                  >
                    {video.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
