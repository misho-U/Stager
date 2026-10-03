import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/shared/components/button';
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
    <section className={cn('border-line bg-surface-raised rounded-lg border', className)}>
      {title || actions ? (
        <header className="border-line flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div className="flex flex-col gap-1">
            {title ? <h2 className="text-title-sm text-ink font-semibold">{title}</h2> : null}
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
    <div className="border-line flex flex-col items-center gap-1 rounded-md border border-dashed px-6 py-10 text-center">
      <p className="text-body-sm text-ink font-medium">{title}</p>
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

/** A record's status as a label: content (draft, published…) or inquiry (new, read…). */
export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('admin.status');

  return (
    <span
      className={cn(
        'text-caption inline-flex items-center rounded-sm px-2 py-0.5 font-medium tracking-wide uppercase',
        STATUS_STYLES[status] ?? 'bg-ink-subtle/20 text-ink-muted',
      )}
    >
      {t.has(status) ? t(status) : status.toLowerCase()}
    </span>
  );
}

/** Inline error banner for a failed mutation. */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="border-danger/30 bg-danger/8 text-body-sm text-danger rounded-md border px-3 py-2"
    >
      {message}
    </p>
  );
}

/**
 * In place of something that failed to load: what went wrong, and a way to try
 * again. Never the empty state instead, which would say there is nothing when
 * there may be plenty, and never a form, whose blank fields Save would write
 * over the real record.
 */
export function LoadFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations('admin.common');

  return (
    <div
      role="alert"
      data-testid="load-failed"
      className="border-danger/30 bg-danger/8 flex flex-col items-start gap-3 rounded-md border px-4 py-4"
    >
      <p className="text-body-sm text-danger">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('retry')}
      </Button>
    </div>
  );
}

/** Inline success banner. */
export function SuccessNotice({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="border-success/30 bg-success/8 text-body-sm text-success rounded-md border px-3 py-2"
    >
      {message}
    </p>
  );
}
