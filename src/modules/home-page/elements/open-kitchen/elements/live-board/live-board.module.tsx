'use client';

import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { PauseIcon } from '@phosphor-icons/react/dist/csr/Pause';
import { PlayIcon } from '@phosphor-icons/react/dist/csr/Play';
import { useId, type ReactNode } from 'react';

import { useLiveBoard } from '@/modules/home-page/elements/open-kitchen/elements/live-board/live-board.service';
import { OK_MOTION } from '@/modules/home-page/elements/open-kitchen/open-kitchen.constants';
import { cn } from '@/shared/lib/cn';

export type BoardCard = {
  id: string;
  /** What the card is ("Next course"), for assistive technology. */
  name: string;
  /** The label of the button that brings it to the front ("Show: Next course"). */
  showLabel: string;
  node: ReactNode;
};

type LiveBoardProps = {
  cards: readonly BoardCard[];
  labels: {
    title: string;
    carousel: string;
    slide: string;
    previous: string;
    next: string;
    pause: string;
    resume: string;
  };
};

const ROUND_BUTTON =
  'border-line-input hover:bg-surface-raised inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors';

/**
 * The hero's live board: what is happening at STAGER now, as a deck of
 * cards. The cards are server-rendered and passed in; this places them, and
 * gives the deck its controls.
 */
export function LiveBoard({ cards, labels }: LiveBoardProps) {
  const count = cards.length;
  const { root, front, auto, paused, togglePause, next, previous, show } = useLiveBoard(count);
  const titleId = useId();

  return (
    <div
      ref={root}
      role="region"
      aria-roledescription={labels.carousel}
      aria-labelledby={titleId}
      data-live-board
      className="flex flex-col gap-5"
    >
      {/* Out of sight, for the outline: the cards' h3s sit under the page's
          h1, and a screen reader's list of headings skipped a level. */}
      <h2 id={titleId} className="sr-only">
        {labels.title}
      </h2>
      <div className="pt-(--ok-deck-pad)">
        {/* Every card in one grid cell: the deck is as tall as its tallest card. */}
        <div className="grid" aria-live={auto && !paused ? 'off' : 'polite'}>
          {cards.map((card, index) => {
            const depth = (index - front + count) % count;
            return (
              <div
                key={card.id}
                data-deck-card
                role="group"
                aria-roledescription={labels.slide}
                aria-label={card.name}
                inert={depth !== 0}
                // Where the deck starts (the first card in front) before its
                // script arrives. Fixed per card, never re-rendered: from then
                // on GSAP owns the transform.
                style={{
                  zIndex: count - index,
                  transform: `translateY(${-index * OK_MOTION.board.peek}px) scale(${1 - index * OK_MOTION.board.shrink})`,
                }}
                className="col-start-1 row-start-1 rounded-lg"
              >
                {card.node}
              </div>
            );
          })}
        </div>
      </div>

      {count > 1 ? (
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-2">
            {cards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                onClick={() => show(index)}
                aria-label={card.showLabel}
                aria-current={index === front ? 'true' : undefined}
                className="flex min-h-11 flex-1 items-center"
              >
                <span className="bg-line relative block h-1 w-full overflow-hidden rounded-full">
                  <span
                    data-progress
                    className={cn(
                      'bg-primary absolute inset-0 origin-left',
                      // Without the timer the current card's line is simply full.
                      index === front && !auto ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </span>
              </button>
            ))}
          </div>
          {auto ? (
            <button
              type="button"
              onClick={togglePause}
              aria-label={paused ? labels.resume : labels.pause}
              className={ROUND_BUTTON}
            >
              {paused ? (
                <PlayIcon aria-hidden weight="fill" />
              ) : (
                <PauseIcon aria-hidden weight="fill" />
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={previous}
            aria-label={labels.previous}
            className={ROUND_BUTTON}
          >
            <ArrowLeftIcon aria-hidden weight="bold" />
          </button>
          <button type="button" onClick={next} aria-label={labels.next} className={ROUND_BUTTON}>
            <ArrowRightIcon aria-hidden weight="bold" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
