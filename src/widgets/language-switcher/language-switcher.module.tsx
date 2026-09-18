'use client';

import { useParams } from 'next/navigation';

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
 * homepage.
 */
export function LanguageSwitcher() {
  const pathname = usePathname();
  const params = useParams();
  const current = params.locale as AppLocale | undefined;

  return (
    <nav aria-label="Language" className="flex items-center gap-1 text-caption">
      {LOCALES.map((locale, index) => (
        <span key={locale} className="flex items-center gap-1">
          {index > 0 ? (
            <span aria-hidden className="text-ink-subtle">
              |
            </span>
          ) : null}
          <Link
            href={pathname}
            locale={locale}
            hrefLang={locale}
            aria-current={locale === current ? 'true' : undefined}
            className={cn(
              'tracking-wide uppercase transition-colors',
              locale === current ? 'text-ink' : 'text-ink-subtle hover:text-ink-muted',
            )}
          >
            {LABELS[locale]}
          </Link>
        </span>
      ))}
    </nav>
  );
}
