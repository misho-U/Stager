'use client';

import './globals.css';

import { useEffect } from 'react';

import { reportError } from '@pkg/monitoring/report';

/**
 * The root layout itself failed, so nothing above this exists: no language, no
 * message provider, no global styles (imported here for that reason). The
 * copy is therefore both languages, Georgian first, and written here rather
 * than imported: the message files would ship in full with every page, since
 * this boundary is part of each one.
 */
const COPY = [
  {
    lang: 'ka',
    title: 'დაფიქსირდა შეცდომა',
    body: 'გვერდის ჩვენება ვერ მოხერხდა. სცადეთ ხელახლა; თუ შეცდომა განმეორდება, დაბრუნდით რამდენიმე წუთში.',
    retry: 'ხელახლა ცდა',
  },
  {
    lang: 'en',
    title: 'Something went wrong',
    body: 'This page could not be shown. Try again; if it keeps happening, come back in a few minutes.',
    retry: 'Try again',
  },
] as const;

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportError(error);
  }, [error]);

  return (
    <html lang="ka">
      <body className="bg-surface text-ink min-h-dvh antialiased">
        <title>STAGER</title>
        <main className="px-gutter mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-8 text-center">
          {COPY.map((copy) => (
            <div key={copy.lang} lang={copy.lang} className="flex flex-col gap-2">
              <h1 className="text-title font-semibold">{copy.title}</h1>
              <p className="text-body text-ink-muted text-pretty">{copy.body}</p>
            </div>
          ))}
          <button
            type="button"
            onClick={retry}
            className="text-body-sm text-ink-muted inline-flex min-h-11 items-center underline underline-offset-4"
          >
            <span lang="ka">{COPY[0].retry}</span>
            <span aria-hidden>&nbsp;/&nbsp;</span>
            <span lang="en">{COPY[1].retry}</span>
          </button>
        </main>
      </body>
    </html>
  );
}
