'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { reportError } from '@pkg/monitoring/report';

/**
 * A public page that failed to render: said in the visitor's language, with a
 * way to try again, instead of Next's bare error screen. Next logs the error
 * on the server, where `digest` finds it.
 */
export default function PublicError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    console.error(error);
    reportError(error);
  }, [error]);

  return (
    <main
      data-testid="page-error"
      className="px-gutter mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 text-center"
    >
      <h1 className="text-title font-semibold">{t('error')}</h1>
      <p className="text-body text-ink-muted text-pretty">{t('errorBody')}</p>
      <button
        type="button"
        onClick={retry}
        className="text-body-sm text-ink-muted inline-flex min-h-11 items-center underline underline-offset-4"
      >
        {t('retry')}
      </button>
    </main>
  );
}
