'use client';

import type { ReactNode } from 'react';

import { OK_MOTION } from '@/modules/home-page/elements/open-kitchen/open-kitchen.constants';
import { useFlipFilter } from '@/shared/lib/motion/use-flip-filter';

type Chip = { id: string; label: string; count: number };

type AcademyTimetableProps = {
  /** "All", then the categories that have courses, each with its count. */
  chips: readonly Chip[];
  filterLabel: string;
  rows: ReadonlyArray<{ id: string; category: string; node: ReactNode }>;
};

/**
 * The Academy's timetable: filter chips over the list of courses. The rows
 * are server-rendered and passed in; this decides which are shown.
 */
export function AcademyTimetable({ chips, filterLabel, rows }: AcademyTimetableProps) {
  const { filter, choose, list, shows } = useFlipFilter<HTMLUListElement>({
    itemSelector: '[data-course-row]',
    ...OK_MOTION.flip,
  });

  return (
    <div className="flex flex-col gap-8">
      {/* "All" alone filters nothing: no categories, no filter. */}
      {chips.length > 1 ? (
        <div
          role="group"
          aria-label={filterLabel}
          className="ok-chips -mx-6 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              aria-pressed={filter === chip.id}
              onClick={() => choose(chip.id)}
              className="text-body-sm border-line-input hover:border-ink aria-pressed:bg-ink aria-pressed:border-ink aria-pressed:text-surface-raised inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 font-medium whitespace-nowrap transition-colors"
            >
              {chip.label}
              <span className="tabular-nums opacity-70">{chip.count}</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Ruled like a timetable: a line above the list and under every course. */}
      <ul
        ref={list}
        data-testid="course-list"
        className="border-line-strong relative flex flex-col border-t"
      >
        {rows.map((row) => (
          <li
            key={row.id}
            data-course-row
            data-category={row.category}
            data-filtered-out={shows(row.category) ? undefined : ''}
            className="border-line-strong border-b"
          >
            {row.node}
          </li>
        ))}
      </ul>
    </div>
  );
}
