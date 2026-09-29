'use client';

import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { useRef, type ReactNode } from 'react';

import {
  stepRail,
  useTicketRail,
} from '@/modules/home-page/elements/variant-d/elements/ticket-rail/ticket-rail.service';

type TicketRailProps = {
  /** What the rail holds, for assistive technology (the section heading). */
  label: string;
  previousLabel: string;
  nextLabel: string;
  children: ReactNode;
};

/**
 * The rail the service tickets hang from, with prev/next keys. The tickets
 * themselves are server-rendered and passed in.
 */
export function TicketRail({ label, previousLabel, nextLabel, children }: TicketRailProps) {
  const scroller = useRef<HTMLDivElement>(null);
  useTicketRail(scroller);

  return (
    <div className="relative">
      <div className="px-gutter">
        <div className="max-w-page mx-auto flex justify-end gap-3 pt-6 pb-8">
          {[
            { label: previousLabel, Icon: ArrowLeftIcon, direction: -1 as const },
            { label: nextLabel, Icon: ArrowRightIcon, direction: 1 as const },
          ].map(({ label: keyLabel, Icon, direction }) => (
            <button
              key={direction}
              type="button"
              aria-label={keyLabel}
              onClick={() => stepRail(scroller.current, direction)}
              className="pass-key bg-primary text-on-primary hover:bg-primary-hover text-title-sm inline-flex size-12 items-center justify-center rounded-md"
            >
              <Icon aria-hidden weight="bold" />
            </button>
          ))}
        </div>
      </div>

      {/* The rail runs edge to edge; each ticket's clip grips it from inside the scroller. */}
      <div className="relative">
        <div aria-hidden data-decorative className="pass-rail absolute inset-x-0 top-0" />
        <div
          ref={scroller}
          role="region"
          aria-label={label}
          tabIndex={0}
          className="pass-scroller relative snap-x snap-mandatory scroll-px-(--spacing-gutter) overflow-x-auto"
        >
          {/* Its own track, because Draggable wraps a scroller's children in a block of its own. */}
          <div className="px-gutter flex w-max gap-6 pb-16">{children}</div>
        </div>
      </div>
    </div>
  );
}
