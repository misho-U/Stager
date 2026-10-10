'use client';

import { CaretLeftIcon } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import type { ReactNode } from 'react';

import { useProjectPhotos } from '@/modules/home-page/elements/chefs-table/elements/project-photos/project-photos.service';

type ProjectPhotosProps = {
  /** The photos, server-rendered: the cover first, then the gallery. */
  slides: readonly ReactNode[];
  /** Names the photos for a screen reader ("Photos: the project's title"). */
  label: string;
  labels: {
    /** What the row is ("photos") and what each item in it is ("photo"). */
    carousel: string;
    slide: string;
    previous: string;
    next: string;
  };
  /** "1 of 4", for each photo in turn. */
  slideLabels: readonly string[];
};

/**
 * A project card's photos. With one there is nothing to move; with more, a
 * count in one top corner and two arrows in the other (shown under the
 * pointer, or always on a touch screen: .ct-photos-arrow in site.css).
 */
export function ProjectPhotos({ slides, label, labels, slideLabels }: ProjectPhotosProps) {
  const { track, current, go } = useProjectPhotos(slides.length);
  const several = slides.length > 1;

  return (
    <div
      role="group"
      aria-roledescription={labels.carousel}
      aria-label={label}
      className="absolute inset-0"
    >
      <ul ref={track} className="ct-photos-track">
        {slides.map((slide, index) => (
          <li
            key={index}
            role={several ? 'group' : undefined}
            aria-roledescription={several ? labels.slide : undefined}
            aria-label={several ? slideLabels[index] : undefined}
            className="ct-photos-slide"
          >
            {slide}
          </li>
        ))}
      </ul>
      {several ? (
        <>
          <button
            type="button"
            aria-label={labels.previous}
            onClick={() => go(-1)}
            className="ct-photos-arrow ct-photos-previous"
          >
            <CaretLeftIcon aria-hidden weight="bold" />
          </button>
          <button
            type="button"
            aria-label={labels.next}
            onClick={() => go(1)}
            className="ct-photos-arrow ct-photos-next"
          >
            <CaretRightIcon aria-hidden weight="bold" />
          </button>
          <p aria-hidden className="ct-tag absolute top-4 left-4 tabular-nums">
            {current + 1} / {slides.length}
          </p>
          <p aria-live="polite" className="sr-only">
            {slideLabels[current]}
          </p>
        </>
      ) : null}
    </div>
  );
}
