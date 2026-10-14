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
 * KEEP_ADDRESS_LANGUAGE runs as soon as both are parsed: it reads the
 * language from the address, gives the other one the `hidden` attribute and
 * sets `<html lang>`, so a visitor at /en/… sees one English page. Under
 * neither language (/api/…) both stay. It runs before the first paint: the
 * stylesheet holds the paint back, and it holds this script back no longer
 * than that (error-pages.spec.ts checks with a slow stylesheet).
 * A page that calls notFound() itself (an unknown article) gets
 * app/[locale]/not-found.tsx instead, already in its language.
 */
const COPY = [
  { lang: 'ka', messages: ka },
  { lang: 'en', messages: en },
] as const;

const KEEP_ADDRESS_LANGUAGE = `(function(){var l=location.pathname.split('/')[1];if(${JSON.stringify(routing.locales)}.indexOf(l)<0)return;document.documentElement.lang=l;document.querySelectorAll('[data-copy]').forEach(function(e){e.hidden=e.lang!==l;});})();`;

export const metadata: Metadata = { title: 'STAGER' };

export default function GlobalNotFound() {
  return (
    // KEEP_ADDRESS_LANGUAGE changes lang, and `hidden` below, before React
    // hydrates.
    <html lang={routing.defaultLocale} suppressHydrationWarning>
      <body className="bg-surface text-ink min-h-dvh antialiased">
        <main className="px-gutter mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-8 text-center">
          <p className="text-caption tracking-label text-ink-subtle uppercase">404</p>
          {COPY.map(({ lang, messages }) => (
            <div
              key={lang}
              lang={lang}
              data-copy
              className="flex flex-col gap-2"
              suppressHydrationWarning
            >
              <h1 className="text-title font-semibold">{messages.common.notFound}</h1>
              <a
                href={`/${lang}`}
                className="text-body-sm text-ink-muted underline underline-offset-4"
              >
                {messages.common.backHome}
              </a>
            </div>
          ))}
          <script dangerouslySetInnerHTML={{ __html: KEEP_ADDRESS_LANGUAGE }} />
        </main>
      </body>
    </html>
  );
}
