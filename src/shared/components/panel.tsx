import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

type PanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** A titled card. The dashboard's only container. */
export function Panel({ title, description, actions, children, className }: PanelProps) {
  return (
    <section
      className={cn('rounded-lg border border-line bg-surface-raised', className)}
    >
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex flex-col gap-1">
            {title ? <h2 className="text-title-sm font-semibold text-ink">{title}</h2> : null}
            {description ? <p className="text-body-sm text-ink-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-line px-6 py-10 text-center">
      <p className="text-body-sm font-medium text-ink">{title}</p>
      {description ? <p className="text-caption text-ink-subtle">{description}</p> : null}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: 'bg-success/12 text-success',
  DRAFT: 'bg-ink-subtle/20 text-ink-muted',
  ARCHIVED: 'bg-warning/12 text-warning',
  NEW: 'bg-primary/12 text-primary',
  READ: 'bg-ink-subtle/20 text-ink-muted',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium tracking-wide uppercase',
        STATUS_STYLES[status] ?? 'bg-ink-subtle/20 text-ink-muted',
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}

/** Inline error banner for a failed mutation. */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-body-sm text-danger"
    >
      {message}
    </p>
  );
}

/** Inline success banner. */
export function SuccessNotice({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="rounded-md border border-success/30 bg-success/8 px-3 py-2 text-body-sm text-success"
    >
      {message}
    </p>
  );
}
