import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * A 404 under /ka or /en: an address no page answers, or notFound() from a
 * page (an article that is not published). In the visitor's language and the
 * site's dark design, inside the site's root layout.
 */
export default async function NotFound() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('common')]);

  return (
    <div data-site className="bg-surface text-ink">
      <main className="px-gutter mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <p className="text-caption tracking-label text-ink-subtle uppercase">404</p>
        <h1 className="text-title font-semibold">{t('notFound')}</h1>
        <Link
          href={`/${locale}`}
          className="text-body-sm text-ink-muted underline underline-offset-4"
        >
          {t('backHome')}
        </Link>
      </main>
    </div>
  );
}
