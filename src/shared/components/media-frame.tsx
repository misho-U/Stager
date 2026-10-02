import { CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import Image from 'next/image';

import { cn } from '@/shared/lib/cn';

type Media = {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
};

const RATIOS = {
  '4/5': 'aspect-4/5',
  '3/2': 'aspect-3/2',
  '16/9': 'aspect-video',
  '1/1': 'aspect-square',
  /** No ratio of its own: the layout sizes it (a grid cell it stretches to fill). */
  fill: '',
} as const;

const EMPTY_STYLES = {
  dashed: 'border-line-input bg-surface-muted border border-dashed',
  hatched: 'bg-surface-muted hatch',
  outlined: 'border-line-strong border border-dashed',
} as const;

type MediaFrameProps = {
  media: Media | null;
  ratio: keyof typeof RATIOS;
  /** Passed to next/image so the browser downloads the right width. */
  sizes: string;
  /** Shown in the empty frame: what photo belongs here. */
  missingLabel: string;
  /** Shown under it: where to add one. */
  missingHint?: string;
  priority?: boolean;
  /**
   * How an empty frame is drawn: a dashed edge on a tinted fill, fine
   * diagonal lines, or just the dashed edge (for a dark page, where a tinted
   * block reads as a grey box).
   */
  empty?: keyof typeof EMPTY_STYLES;
  /**
   * `duotone` redraws the photo in the design's two inks: shadows in the
   * surface colour, highlights in the text colour. Photos from a phone or a
   * messenger then sit on the page like the rest of the brand.
   */
  treatment?: 'none' | 'duotone';
  /** Corner rounding and elevation belong to the layout, so they come in here. */
  className?: string;
};

/**
 * A CMS image at a fixed aspect ratio — or, when none has been uploaded, a
 * clearly labelled empty frame of the same size.
 *
 * Never a stock or generated photo: this is a real company's portfolio, and an
 * invented picture would misrepresent its work (AGENTS.md § Design skill). The
 * frame keeps the layout honest and judgeable until real photos arrive.
 */
export function MediaFrame({
  media,
  ratio,
  sizes,
  missingLabel,
  missingHint,
  priority = false,
  empty = 'dashed',
  treatment = 'none',
  className,
}: MediaFrameProps) {
  const duotone = media !== null && treatment === 'duotone';

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        RATIOS[ratio],
        // The dashed edge sits on the frame itself, so it follows the frame's
        // corner radius instead of being clipped by it.
        !media && EMPTY_STYLES[empty],
        // The surface colour is the dark end; `isolate` keeps the blending
        // inside the frame.
        duotone && 'bg-surface isolate',
        className,
      )}
      data-media-frame={media ? 'image' : 'empty'}
    >
      {media ? (
        <>
          <Image
            src={media.url}
            alt={media.alt}
            fill
            sizes={sizes}
            priority={priority}
            className={cn(
              'object-cover',
              // Grey, screened onto the dark end: black stays the surface
              // colour, white stays white…
              duotone && 'mix-blend-screen contrast-125 grayscale',
            )}
            {...(media.blurDataUrl
              ? { placeholder: 'blur' as const, blurDataURL: media.blurDataUrl }
              : {})}
          />
          {/* …then multiplied by the text colour, so white becomes it. */}
          {duotone ? (
            <div aria-hidden className="bg-ink absolute inset-0 mix-blend-multiply" />
          ) : null}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <CameraIcon size="1.75em" aria-hidden className="text-ink-muted" />
          <p className="text-body-sm text-ink-muted font-medium">{missingLabel}</p>
          {missingHint ? <p className="text-caption text-ink-muted">{missingHint}</p> : null}
        </div>
      )}
    </div>
  );
}
