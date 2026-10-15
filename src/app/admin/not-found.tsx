import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** A dashboard address no screen answers, in the dashboard's own language. */
export default async function AdminNotFound() {
  const t = await getTranslations('common');

  return (
    <main className="px-gutter mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 text-center">
      <p className="text-caption tracking-label text-ink-subtle uppercase">404</p>
      <h1 className="text-title font-semibold">{t('notFound')}</h1>
      <Link href="/admin" className="text-body-sm text-ink-muted underline underline-offset-4">
        {t('backHome')}
      </Link>
    </main>
  );
}
