import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * Root-level 404: for paths outside any locale (a bad /admin URL), and for
 * notFound() under /ka and /en, which have no 404 of their own yet.
 *
 * The copy follows the request's language — Georgian on /ka, English on /en
 * and in the dashboard — so it always matches <html lang>. It used to be
 * English everywhere, which put English text under lang="ka" on /ka.
 */
export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations('common');

  return (
    // In the site's dark design (site.css), like every public page.
    <div data-site className="bg-surface text-ink">
      <main className="px-gutter mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 text-center">
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
