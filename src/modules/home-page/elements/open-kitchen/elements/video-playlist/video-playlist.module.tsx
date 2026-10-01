'use client';

import { PlayIcon } from '@phosphor-icons/react/dist/csr/Play';
import { useRef, type ReactNode } from 'react';

import {
  playInSection,
  usePlaylistStore,
  useSwapIn,
} from '@/modules/home-page/elements/open-kitchen/elements/video-playlist/video-playlist.service';
import { VideoEmbed, VideoUnavailable } from '@/widgets/video-player/video-player.module';

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
 * The video section's player and its list of episodes. Choosing an episode
 * shows it in the player; Play loads the privacy-preserving YouTube player in
 * place. A sample entry (no link yet) explains itself instead of playing.
 */
export function VideoPlaylist({ videos, labels }: VideoPlaylistProps) {
  const storedId = usePlaylistStore((state) => state.activeId);
  const playing = usePlaylistStore((state) => state.playing);
  const choose = usePlaylistStore((state) => state.choose);
  const play = usePlaylistStore((state) => state.play);

  const active = videos.find((video) => video.id === storedId) ?? videos[0];
  const player = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  useSwapIn(active?.id ?? '', [player, caption]);

  if (!active) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="flex flex-col gap-6 lg:col-span-8">
        <div
          ref={player}
          data-video-player
          className="bg-ink relative aspect-video overflow-hidden rounded-lg"
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
              <button
                type="button"
                onClick={() => play(active.id)}
                aria-label={active.playLabel}
                className="ok-on-poster group absolute inset-0 flex items-center justify-center"
              >
                <span className="bg-surface-raised text-ink shadow-card ease-brand flex size-(--ok-play) items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110">
                  <PlayIcon aria-hidden weight="fill" size="1.75rem" />
                </span>
              </button>
            </>
          )}
        </div>
        <div ref={caption} className="flex flex-col gap-3" aria-live="polite">
          <p className="text-body-sm text-ink-muted">{active.meta}</p>
          <h3 className="text-title font-heading text-balance">{active.title}</h3>
          {active.summary ? (
            <p className="text-body-lg text-ink-muted max-w-2xl text-pretty">{active.summary}</p>
          ) : null}
        </div>
      </div>

      <ol aria-label={labels.list} className="flex flex-col gap-1.5 lg:col-span-4">
        {videos.map((video) => {
          const current = video.id === active.id;
          return (
            <li key={video.id}>
              <button
                type="button"
                aria-current={current ? 'true' : undefined}
                onClick={() => choose(video.id)}
                className="hover:bg-surface-raised aria-[current=true]:ring-primary grid w-full grid-cols-(--ok-playlist-row) items-center gap-4 rounded-lg p-2.5 text-left transition-all aria-[current=true]:ring-2"
              >
                <span className="relative aspect-video overflow-hidden rounded-(--ok-radius-thumb)">
                  {video.thumb}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-caption text-ink-muted">
                    {current && playing ? labels.nowPlaying : video.meta}
                  </span>
                  <span className="text-body-sm line-clamp-2 font-semibold text-pretty">
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
