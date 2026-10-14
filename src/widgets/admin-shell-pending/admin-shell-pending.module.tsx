'use client';

import { useTranslations } from 'next-intl';

/**
 * What the dashboard shows for the moment between the first byte and the
 * sign-in check (Supabase, then the allowlist): the shape of the sidebar and
 * the page, so the screen does not jump when they arrive, and a line a screen
 * reader announces. Nothing here is the admin's: it is the same for anyone.
 */
export function AdminShellPending() {
  const t = useTranslations('admin');

  return (
    <div aria-busy="true" className="flex min-h-dvh flex-col lg:flex-row">
      <div className="border-line bg-surface-raised h-16 shrink-0 border-b lg:h-dvh lg:w-60 lg:border-r lg:border-b-0" />
      <div className="px-gutter min-w-0 flex-1 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <p role="status" className="text-body-sm text-ink-subtle">
            {t('common.loading')}
          </p>
        </div>
      </div>
    </div>
  );
}
