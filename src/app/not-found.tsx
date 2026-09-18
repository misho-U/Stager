import Link from 'next/link';

/** Root-level 404, for paths outside any locale (e.g. a bad /admin URL). */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 px-gutter text-center">
      <p className="text-caption tracking-[0.2em] text-ink-subtle uppercase">404</p>
      <h1 className="text-title font-semibold">Page not found</h1>
      <Link href="/" className="text-body-sm text-ink-muted underline underline-offset-4">
        Go to the homepage
      </Link>
    </main>
  );
}
