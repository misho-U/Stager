'use client';

import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { useRef, type ReactNode } from 'react';

import {
  stepRail,
  useProjectRail,
} from '@/modules/home-page/elements/open-kitchen/elements/project-rail/project-rail.service';

type ProjectRailProps = {
  /** What the rail holds, for assistive technology (the section heading). */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** The section's heading block, set beside the prev/next buttons. */
  header: ReactNode;
  children: ReactNode;
};

const ROUND_BUTTON =
  'border-line-input hover:bg-surface-raised inline-flex size-12 items-center justify-center rounded-full border transition-colors';

/**
 * The projects as a rail the visitor can drag, scroll or step through. The
 * cards are server-rendered and passed in. Lined up with the page's content
 * at the start, it runs out to the edge of the screen at the end.
 */
export function ProjectRail({
  label,
  previousLabel,
  nextLabel,
  header,
  children,
}: ProjectRailProps) {
  const scroller = useRef<HTMLDivElement>(null);
  useProjectRail(scroller);

  return (
    <div data-rail className="@container flex flex-col gap-10">
      <div className="px-gutter">
        <div className="max-w-page mx-auto flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          {header}
          <div className="flex gap-3">
            {[
              { label: previousLabel, Icon: ArrowLeftIcon, direction: -1 as const },
              { label: nextLabel, Icon: ArrowRightIcon, direction: 1 as const },
            ].map(({ label: buttonLabel, Icon, direction }) => (
              <button
                key={direction}
                type="button"
                aria-label={buttonLabel}
                onClick={() => stepRail(scroller.current, direction)}
                className={ROUND_BUTTON}
              >
                <Icon aria-hidden weight="bold" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="snap-x snap-mandatory scroll-px-(--spacing-gutter) [scrollbar-width:none] overflow-x-auto pb-2"
      >
        {/* Its own track, because Draggable wraps a scroller's children in a block of its own. */}
        <ul data-testid="project-list" className="flex w-max gap-6 px-(--ok-rail-inset)">
          {children}
        </ul>
      </div>

      <div className="px-gutter">
        <span className="bg-line max-w-page relative mx-auto block h-0.5 overflow-hidden rounded-full">
          <span data-rail-thumb className="bg-ink absolute inset-y-0 left-0 rounded-full" />
        </span>
      </div>
    </div>
  );
}
