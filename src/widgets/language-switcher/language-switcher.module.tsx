'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { cn } from '@/shared/lib/cn';
import { Link, usePathname } from '@pkg/i18n/navigation';
import { LOCALES, type AppLocale } from '@pkg/i18n/routing';

const LABELS: Record<AppLocale, string> = { ka: 'ქარ', en: 'ENG' };

/**
 * KA | EN, as the brief specifies.
 *
 * `usePathname` here is the next-intl one, which returns the path WITHOUT the
 * locale prefix — so linking to the same path under the other locale keeps the
 * visitor on the page they were reading instead of dropping them on the
 * homepage. The query string comes along too, so anything a link encodes
 * there survives the switch.
 */
export function LanguageSwitcher() {
  // Reading the query string opts a statically rendered page out of static
  // rendering up to the nearest Suspense boundary. This one keeps that to the
  // switcher, which renders without the query until the page hydrates.
  return (
    <Suspense fallback={<LocaleLinks query={undefined} />}>
      <LocaleLinksWithQuery />
    </Suspense>
  );
}

function LocaleLinksWithQuery() {
  const searchParams = useSearchParams();
  return <LocaleLinks query={Object.fromEntries(searchParams)} />;
}

function LocaleLinks({ query }: { query: Record<string, string> | undefined }) {
  const pathname = usePathname();
  const params = useParams();
  const current = params.locale as AppLocale | undefined;

  return (
    <nav aria-label="Language" className="text-body-sm flex items-center">
      {LOCALES.map((locale, index) => (
        <span key={locale} className="flex items-center">
          {index > 0 ? (
            <span aria-hidden className="text-ink-subtle">
              |
            </span>
          ) : null}
          <Link
            href={query ? { pathname, query } : pathname}
            locale={locale}
            hrefLang={locale}
            aria-current={locale === current ? 'true' : undefined}
            className={cn(
              // A 44px square: the minimum touch target.
              'inline-flex min-h-11 min-w-11 items-center justify-center tracking-wide transition-colors',
              locale === current ? 'text-ink font-medium' : 'text-ink-subtle hover:text-ink-muted',
            )}
          >
            {LABELS[locale]}
          </Link>
        </span>
      ))}
    </nav>
  );
}
