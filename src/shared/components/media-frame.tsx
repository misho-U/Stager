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
  className,
}: MediaFrameProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        RATIOS[ratio],
        // The dashed edge sits on the frame itself, so it follows the frame's
        // corner radius instead of being clipped by it.
        !media && 'border-line-input bg-surface-muted border border-dashed',
        className,
      )}
      data-media-frame={media ? 'image' : 'empty'}
    >
      {media ? (
        <Image
          src={media.url}
          alt={media.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          {...(media.blurDataUrl
            ? { placeholder: 'blur' as const, blurDataURL: media.blurDataUrl }
            : {})}
        />
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
