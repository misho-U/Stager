'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { LoadFailed } from '@/shared/components/panel';
import { reportError } from '@pkg/monitoring/report';

/**
 * One dashboard screen failed to render. The sidebar stays, so the rest of the
 * dashboard is a click away, and Try again re-renders just this screen.
 */
export default function DashboardPageError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations('admin.errors');

  useEffect(() => {
    console.error(error);
    reportError(error);
  }, [error]);

  return <LoadFailed message={t('unexpected')} onRetry={retry} />;
}
