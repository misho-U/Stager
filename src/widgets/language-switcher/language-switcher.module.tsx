'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';

import { cn } from '@/shared/lib/cn';
import { Link, usePathname, useRouter } from '@pkg/i18n/navigation';
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
 *
 * On the site (`.ct-lang`, site.css) the current language sits on a cream
 * highlight. Choosing the other one slides the highlight across first, then
 * the page changes, as the owner asked. The link is still a plain link: a
 * modified click (a new tab) or no script follows it as it is.
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
  const router = useRouter();
  const current = params.locale as AppLocale | undefined;
  const href = query ? { pathname, query } : pathname;
  // Where the highlight is sliding, and from which language: once the page's
  // language is no longer the one it left, the slide is over. (Kept as a bare
  // target, the second switch found the first one's still standing and lit
  // the wrong language.)
  const [slide, setSlide] = useState<{ from: AppLocale | undefined; to: AppLocale } | null>(null);
  const going = slide && slide.from === current ? slide.to : null;
  // Next keeps the page just left, hidden, and shows it again on the way
  // back: hiding it runs this cleanup, so the page that comes back has no
  // slide left over from the switch that left it.
  useEffect(() => () => setSlide(null), []);
  const thumb = useRef<HTMLSpanElement>(null);
  const active = going ?? current;

  const choose = (locale: AppLocale) => (event: MouseEvent<HTMLAnchorElement>) => {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (locale === current || modified || event.button !== 0 || going) return;
    event.preventDefault();
    setSlide({ from: current, to: locale });
    // The page changes once the highlight has landed: at the end of its
    // slide, or at once where nothing slides (reduced motion, no highlight
    // drawn). The timer is the backstop if no transition ever ends.
    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      router.replace(href, { locale, scroll: false });
    };
    const slide = thumb.current;
    const sliding =
      slide && slide.getClientRects().length > 0 && getComputedStyle(slide).transitionDuration;
    if (!sliding || sliding === '0s') {
      go();
      return;
    }
    slide.addEventListener('transitionend', go, { once: true });
    window.setTimeout(go, 600);
  };

  return (
    <nav
      aria-label="Language"
      className="text-body-sm relative flex items-center"
      data-going={going ? '' : undefined}
      style={{ '--lang-at': Math.max(0, LOCALES.indexOf(active ?? LOCALES[0])) } as CSSProperties}
    >
      <span ref={thumb} aria-hidden data-lang-thumb />
      {LOCALES.map((locale, index) => (
        <span key={locale} className="flex items-center">
          {index > 0 ? (
            <span aria-hidden className="text-ink-subtle">
              |
            </span>
          ) : null}
          <Link
            href={href}
            locale={locale}
            hrefLang={locale}
            onClick={choose(locale)}
            aria-current={locale === current ? 'true' : undefined}
            data-on={locale === active ? '' : undefined}
            className={cn(
              // A 44px square: the minimum touch target.
              'inline-flex min-h-11 min-w-11 items-center justify-center tracking-wide transition-colors',
              locale === active ? 'text-ink font-medium' : 'text-ink-subtle hover:text-ink-muted',
            )}
          >
            {LABELS[locale]}
          </Link>
        </span>
      ))}
    </nav>
  );
}
