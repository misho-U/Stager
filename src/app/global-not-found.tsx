import type { Metadata } from 'next';

import './globals.css';

import en from '@pkg/i18n/messages/en.json';
import ka from '@pkg/i18n/messages/ka.json';
import { routing } from '@pkg/i18n/routing';

/**
 * Every address no route answers: /en/no-such-page as much as a mistyped
 * /api path. Next builds it once, as a static page with no URL to go by, so
 * it says it in both languages, Georgian first — which is what a visitor
 * without scripts, and a crawler, read.
 *
 * Before the first paint, PICK_LANGUAGE reads the language from the address
 * and keeps only that one (and sets `<html lang>` to it), so a visitor at
 * /en/… sees one English page. Under neither language (/api/…) both stay.
 * A page that calls notFound() itself (an unknown article) gets
 * app/[locale]/not-found.tsx instead, already in its language.
 */
const COPY = [
  { lang: 'ka', messages: ka, hideWhenOnly: 'group-data-[only=en]/doc:hidden' },
  { lang: 'en', messages: en, hideWhenOnly: 'group-data-[only=ka]/doc:hidden' },
] as const;

const PICK_LANGUAGE = `(function(){var d=document.documentElement,l=location.pathname.split('/')[1];if(${JSON.stringify(routing.locales)}.indexOf(l)>-1){d.lang=l;d.setAttribute('data-only',l);}})();`;

export const metadata: Metadata = { title: 'STAGER' };

export default function GlobalNotFound() {
  return (
    // The script changes lang and data-only before React hydrates.
    <html lang={routing.defaultLocale} className="group/doc" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PICK_LANGUAGE }} />
      </head>
      <body className="bg-surface text-ink min-h-dvh antialiased">
        <main className="px-gutter mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-8 text-center">
          <p className="text-caption tracking-label text-ink-subtle uppercase">404</p>
          {COPY.map(({ lang, messages, hideWhenOnly }) => (
            <div key={lang} lang={lang} className={`flex flex-col gap-2 ${hideWhenOnly}`}>
              <h1 className="text-title font-semibold">{messages.common.notFound}</h1>
              <a
                href={`/${lang}`}
                className="text-body-sm text-ink-muted underline underline-offset-4"
              >
                {messages.common.backHome}
              </a>
            </div>
          ))}
        </main>
      </body>
    </html>
  );
}
