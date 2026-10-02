'use client';

import type { ReactNode } from 'react';

import { CT_MOTION } from '@/modules/home-page/elements/chefs-table/chefs-table.constants';
import { useFlipFilter } from '@/shared/lib/motion/use-flip-filter';

type Tab = { id: string; label: string; count: number };

type TicketGridProps = {
  /** "All", then the categories that have courses, each with its count. */
  tabs: readonly Tab[];
  filterLabel: string;
  tickets: ReadonlyArray<{ id: string; category: string; node: ReactNode }>;
};

/**
 * The Academy's courses as admission tickets, two to a row on a wide screen,
 * under a row of category tabs. The tickets are server-rendered and passed
 * in; this decides which are shown, and re-deals them (Flip) on a change.
 */
export function TicketGrid({ tabs, filterLabel, tickets }: TicketGridProps) {
  const { filter, choose, list, shows } = useFlipFilter<HTMLUListElement>({
    itemSelector: '[data-ticket]',
    ...CT_MOTION.flip,
  });

  return (
    <div className="flex flex-col gap-8">
      <div
        role="group"
        aria-label={filterLabel}
        className="bg-surface-raised -mx-1 flex gap-1 self-start overflow-x-auto rounded-full p-1 [scrollbar-width:none] max-sm:max-w-full"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={filter === tab.id}
            onClick={() => choose(tab.id)}
            className="text-body-sm text-ink-muted hover:text-ink aria-pressed:bg-primary aria-pressed:text-on-primary inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 font-medium whitespace-nowrap transition-colors"
          >
            {tab.label}
            <span className="tabular-nums opacity-70">{tab.count}</span>
          </button>
        ))}
      </div>

      <ul ref={list} data-testid="course-list" className="relative grid gap-5 lg:grid-cols-2">
        {tickets.map((ticket) => (
          <li
            key={ticket.id}
            data-ticket
            data-category={ticket.category}
            data-filtered-out={shows(ticket.category) ? undefined : ''}
          >
            {ticket.node}
          </li>
        ))}
      </ul>
    </div>
  );
}
