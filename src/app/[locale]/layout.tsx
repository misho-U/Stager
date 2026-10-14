import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { locale as rootLocale } from 'next/root-params';

import '../globals.css';

import appleIcon from '@/shared/brandbook/images/apple-icon.png';
import icon from '@/shared/brandbook/images/icon.png';
import { BRAND, THEME_COLOR } from '@/shared/brandbook/tokens';
import { toCanonicalUrl } from '@pkg/http/site-url';
import { routing } from '@pkg/i18n/routing';

/**
 * The public site's root layout: `<html lang>` comes from the URL's locale
 * (`next/root-params`), never from the request, so every page under /ka and
 * /en is built ahead of time (AGENTS.md § Data flow). The dashboard has its
 * own root layout (app/admin/layout.tsx); an address no route answers, here
 * or there, gets app/global-not-found.tsx.
 *
 * Each page renders its own landmarks: the shared header and footer
 * (widgets/site-header, widgets/site-footer) around its one <main>, inside
 * its own [data-site] wrapper, since the home page wraps them in its motion.
 */
export const metadata: Metadata = {
  metadataBase: new URL(toCanonicalUrl('/')),
  title: {
    default: `${BRAND.name} — ${BRAND.positioning}`,
    template: `%s — ${BRAND.name}`,
  },
  description: BRAND.tagline,
  // Every page sets its own (widgets/seo), from the dashboard.
  robots: { index: true, follow: true },
  // Drawn by scripts/brand-images.ts; favicon.ico in app/ is the tab's.
  // Served from _next/static, past the locale routing.
  icons: {
    icon: [{ url: icon.src, type: 'image/png', sizes: `${icon.width}x${icon.height}` }],
    apple: [{ url: appleIcon.src, sizes: `${appleIcon.width}x${appleIcon.height}` }],
  },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: 'device-width',
  initialScale: 1,
};

/** Both languages, built at build time. Never empty: Cache Components requires one. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = await rootLocale();

  // A request for /de would otherwise render the default locale's copy under a
  // URL that should not exist.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-surface text-ink min-h-dvh antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
