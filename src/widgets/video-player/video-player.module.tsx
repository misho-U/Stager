'use client';

import { InfoIcon } from '@phosphor-icons/react/dist/csr/Info';
import { YoutubeLogoIcon } from '@phosphor-icons/react/dist/csr/YoutubeLogo';
import Image from 'next/image';
import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { youtubeEmbed, youtubeId, youtubeThumbnail } from '@/shared/lib/youtube';

/**
 * The pieces every design's video player is built from. How a video opens
 * (in place, in a full-screen dialog) is the design's choice; what plays is
 * the privacy-preserving YouTube player, or a file uploaded from the
 * dashboard, either loaded only on a click, so a visitor who never presses
 * Play never contacts YouTube for more than the poster image, nor downloads
 * the film.
 */

/** The YouTube player, filling its frame. Render it only after a click. */
export function VideoEmbed({ id, title }: { id: string; title: string }) {
  return (
    <iframe
      src={youtubeEmbed(id)}
      title={title}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      // YouTube refuses to play without knowing the embedding origin.
      referrerPolicy="strict-origin-when-cross-origin"
      className="absolute inset-0 size-full border-0"
    />
  );
}

/**
 * An uploaded file, played in its frame by the page's own <video> with the
 * browser's controls: never a link to the file, so Play can never start a
 * download. Render it only after Play is pressed, like the embed.
 *
 * `preload="none"` until then: nothing of the file is fetched until the
 * element is told to play, which happens once it is mounted, from the
 * visitor's own Play. `controlsList="nodownload"` takes Download out of the
 * controls' menu. `src` is the store's `url`, which serves the file inline;
 * its `downloadUrl` would serve it as an attachment (uploaded-video.ts).
 */
export function VideoFile({ src, title }: { src: string; title: string }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // A refused start (a browser that wants another click) leaves the
    // controls on screen for the visitor to press; nothing else to do.
    video.current?.play().catch(() => {});
  }, [src]);

  return (
    // No captions file: an uploaded film carries its words in its picture, as
    // the YouTube ones do. The title names it to a screen reader.
    <video
      ref={video}
      src={src}
      aria-label={title}
      controls
      controlsList="nodownload"
      playsInline
      preload="none"
      data-video-file
      className="absolute inset-0 size-full bg-black object-contain"
    />
  );
}

type PosterImage = { url: string; width: number | null; height: number | null };

type VideoPosterProps = {
  youtubeUrl: string | null;
  /** The cover chosen in the dashboard, which wins over anything else. */
  poster?: PosterImage | null;
  /** Passed to next/image for a cover: how wide the frame is drawn. */
  sizes?: string;
  priority?: boolean;
  /** The design's own placeholder, drawn when the entry has no link yet. */
  placeholder: ReactNode;
  className?: string;
};

/**
 * What a video's frame shows before it plays, first of: the cover chosen in
 * the dashboard, YouTube's poster frame, or the design's placeholder.
 * Decorative every way (the title is always written next to it), so it has
 * no alt text. An uploaded file is never touched before Play, so one without
 * a cover shows the placeholder: the dashboard asks for a cover.
 *
 * The poster loads straight from YouTube, not through the image optimizer:
 * the optimizer would take any video id, so anyone could spend the site's
 * image quota through it. A poster is a 480 px JPEG of a few dozen KB.
 */
export function VideoPoster({
  youtubeUrl,
  poster = null,
  sizes = '(min-width: 1024px) 66vw, 100vw',
  priority = false,
  placeholder,
  className,
}: VideoPosterProps) {
  const id = youtubeId(youtubeUrl);
  return (
    <div className={cn('absolute inset-0', className)}>
      {poster ? (
        <Image
          src={poster.url}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : id ? (
        <Image
          src={youtubeThumbnail(id)}
          alt=""
          fill
          unoptimized
          priority={priority}
          className="object-cover"
        />
      ) : (
        placeholder
      )}
    </div>
  );
}

/**
 * The title, and whatever else a design writes, on a video's frame before it
 * plays. It gives way to the picture when a mouse rests on the frame (the
 * frame carries `data-video-card`; see `.video-caption` in globals.css) and
 * never takes a click: the Play under it does. The design draws the scrim.
 */
export function VideoCaption({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('video-caption pointer-events-none absolute inset-x-0 bottom-0', className)}>
      {children}
    </div>
  );
}

/**
 * Opens the video on YouTube, in a new tab, for whoever would rather watch it
 * there. Only for an entry with a link; the design places and colours it.
 */
export function WatchOnYouTube({
  youtubeUrl,
  label,
  className,
}: {
  youtubeUrl: string | null;
  /** "Watch on YouTube: <title>", its accessible name. */
  label: string;
  className?: string;
}) {
  if (!youtubeUrl || !youtubeId(youtubeUrl)) return null;
  return (
    <a
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={className}
    >
      <YoutubeLogoIcon aria-hidden weight="fill" size="1.25em" />
      YouTube
    </a>
  );
}

/**
 * Shown in the frame when a video without a link is played. A sample entry
 * has no film behind it, so it says so rather than doing nothing.
 */
export function VideoUnavailable({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="bg-surface-raised text-ink absolute inset-0 flex items-center justify-center p-6 text-center"
    >
      <p className="text-body flex max-w-md flex-col items-center gap-3 text-pretty">
        <InfoIcon aria-hidden size="1.75em" weight="light" />
        {message}
      </p>
    </div>
  );
}
