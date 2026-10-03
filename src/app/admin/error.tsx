'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { LoadFailed } from '@/shared/components/panel';

/**
 * The dashboard could not render at all: its access check failed (the
 * database is unreachable, say) or the sign-in page broke. Said plainly, with
 * a way to try again. A page failing inside the dashboard is caught closer,
 * by (dashboard)/error.tsx, which keeps the sidebar.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations('admin.errors');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="px-gutter flex min-h-dvh items-center justify-center py-12">
      <div className="w-full max-w-md">
        <LoadFailed message={t('unexpected')} onRetry={retry} />
      </div>
    </main>
  );
}
