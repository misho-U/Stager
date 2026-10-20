'use client';

import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { useId, type ReactNode } from 'react';

import { useProjectSheet } from '@/modules/home-page/elements/chefs-table/elements/project-sheet/project-sheet.service';

type ProjectSheetProps = {
  title: string;
  /** Client, place and year, as the card writes them; empty for none. */
  meta: string;
  summary: string;
  labels: { open: string; close: string };
  /** The card's photo and title, server-rendered. */
  children: ReactNode;
};

/**
 * A project card. On a touch screen only the photo and title show, and the
 * card opens a sheet that reads what the project was about; with a mouse the
 * summary rises over the photo under the pointer, as before (site.css,
 * .ct-project). A project with no summary has nothing to open.
 */
export function ProjectSheet({ title, meta, summary, labels, children }: ProjectSheetProps) {
  const { dialog, open, onCardClick, onClose, requestClose } = useProjectSheet();
  const titleId = useId();

  if (!summary) return <article className="ct-project">{children}</article>;

  return (
    // The whole card is the tap target for a finger; the button below is the
    // one a keyboard and a screen reader use.
    <article className="ct-project" data-project-sheet onClick={onCardClick}>
      {children}
      <p data-testid="project-summary" className="ct-project-summary">
        {summary}
      </p>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={open}
        data-testid="project-open"
        className="ct-project-open"
      >
        {labels.open}
        <ArrowUpRightIcon aria-hidden weight="bold" />
      </button>
      <dialog
        ref={dialog}
        onClose={onClose}
        // A tap on the dimmed page around the sheet closes it, like Escape.
        onClick={(event) => {
          if (event.target === event.currentTarget) requestClose();
        }}
        aria-labelledby={titleId}
        data-lenis-prevent
        data-testid="project-sheet"
        className="registration-dialog ct-project-sheet bg-surface text-ink"
      >
        <div className="flex flex-col gap-6 p-6 sm:p-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-2">
              {meta ? <p className="text-body-sm text-ink-muted">{meta}</p> : null}
              <h2 id={titleId} className="text-title font-heading text-balance">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label={labels.close}
              className="border-line-input hover:bg-surface-muted inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors"
            >
              <XIcon aria-hidden weight="bold" />
            </button>
          </div>
          <p className="text-body-lg text-ink-muted text-pretty whitespace-pre-line">{summary}</p>
        </div>
      </dialog>
    </article>
  );
}
