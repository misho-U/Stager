import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';

import { LanguageSwitcher } from '@/widgets/language-switcher/language-switcher.module';
import { routing } from '@pkg/i18n/routing';

/**
 * Public site shell.
 *
 * Intentionally unstyled beyond the brand tokens — the real header, footer and
 * navigation are part of the design phase. What matters here is that the locale
 * is validated, the i18n provider is mounted, and the language switcher works.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // A request for /de would otherwise render the default locale's copy under a
  // URL that should not exist.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <NextIntlClientProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between border-b border-line px-gutter py-4">
          <span className="text-body-lg font-semibold tracking-[0.18em]">STAGER</span>
          <LanguageSwitcher />
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line px-gutter py-6 text-caption text-ink-subtle">
          © {new Date().getFullYear()} STAGER — Culinary &amp; Foodservice Development
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
