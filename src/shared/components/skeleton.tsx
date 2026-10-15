import { useTranslations } from 'next-intl';

import { Panel } from '@/shared/components/panel';
import { cn } from '@/shared/lib/cn';

/**
 * Placeholders in the shape of what is loading, so the page does not jump
 * when it arrives. The bars are decoration (hidden from screen readers); each
 * skeleton carries one status line a screen reader announces instead. They
 * pulse only where the system allows motion.
 *
 * Shown by a section's loading.tsx while its page comes from the server
 * (client-side navigation only: a full load waits for the admin's cookies
 * before anything is sent), and by the page itself while its data loads.
 */
export function Bone({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('bg-surface-muted block rounded-sm motion-safe:animate-pulse', className)}
    />
  );
}

function LoadingStatus() {
  const t = useTranslations('admin');
  return (
    <p role="status" className="sr-only">
      {t('common.loading')}
    </p>
  );
}

/** A page's title, line and buttons (PageHeader). */
export function PageHeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex w-full max-w-md flex-col gap-2">
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-full" />
      </div>
      {actions > 0 ? (
        <div className="flex gap-2">
          {Array.from({ length: actions }, (_, index) => (
            <Bone key={index} className="h-9 w-24 rounded-md" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The rows of a list (DataTable), inside the panel the page already shows. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" data-testid="skeleton" className="flex flex-col">
      <LoadingStatus />
      <div className="border-line flex gap-6 border-b pb-3">
        <Bone className="h-3 w-24" />
        <Bone className="h-3 w-16" />
        <Bone className="hidden h-3 w-16 sm:block" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="border-line flex items-center gap-6 border-b py-3.5 last:border-b-0"
        >
          <Bone className="h-4 w-2/5" />
          <Bone className="h-5 w-20" />
          <Bone className="hidden h-4 w-12 sm:block" />
          <Bone className="ml-auto h-8 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** The media library's cards: a thumbnail and two lines each. */
export function MediaGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div aria-busy="true" data-testid="skeleton">
      <LoadingStatus />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }, (_, index) => (
          <li key={index} className="border-line flex gap-3 rounded-md border p-3">
            <Bone className="size-20 shrink-0" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <Bone className="h-4 w-3/4" />
              <Bone className="h-3 w-1/2" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A list page: its header, then the list's panel (which announces the wait). */
export function ListPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <Panel>
        <TableSkeleton />
      </Panel>
    </div>
  );
}

function FieldSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <Bone className="h-3 w-28" />
      <Bone className={cn('w-full rounded-md', tall ? 'h-28' : 'h-10')} />
    </div>
  );
}

/** An edit page: its header with Cancel and Save, the language switch, and fields. */
export function FormPageSkeleton() {
  return (
    <div aria-busy="true" data-testid="skeleton" className="flex flex-col gap-6">
      <LoadingStatus />
      <PageHeaderSkeleton actions={2} />
      <Bone className="h-9 w-40 rounded-md" />
      <Panel>
        <div className="flex flex-col gap-5">
          <FieldSkeleton />
          <FieldSkeleton tall />
          <FieldSkeleton />
        </div>
      </Panel>
      <Panel>
        <div className="grid gap-5 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      </Panel>
    </div>
  );
}

/** The overview: greeting, the six counts, and the shortcuts. */
export function OverviewSkeleton() {
  return (
    <div aria-busy="true" data-testid="skeleton" className="flex flex-col gap-6">
      <LoadingStatus />
      <div className="flex flex-col gap-2">
        <Bone className="h-8 w-56" />
        <Bone className="h-4 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="border-line rounded-lg border px-4 py-3">
            <Bone className="h-7 w-10" />
            <Bone className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <Panel>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex flex-col gap-1.5 px-2">
              <Bone className="h-4 w-48" />
              <Bone className="h-3 w-72 max-w-full" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
