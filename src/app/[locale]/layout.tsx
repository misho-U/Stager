import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';

import { routing } from '@pkg/i18n/routing';

/**
 * Public site shell: validates the locale and mounts the i18n provider.
 *
 * Header, navigation and footer belong to each page's design (the home page
 * renders its own), so a page supplies its own <header>, <main> and <footer>
 * landmarks.
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

  return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
