import type { Metadata, Viewport } from 'next';
import { getLocale } from 'next-intl/server';

import './globals.css';

import { BRAND, THEME_COLOR } from '@/shared/brandbook/tokens';
import { toCanonicalUrl } from '@pkg/http/site-url';

/**
 * The single root layout.
 *
 * `/admin` is not locale-prefixed, so the lang attribute cannot come from a
 * route param — `getLocale()` reads it from the request context that the
 * next-intl middleware sets, and falls back to the default locale for admin
 * routes.
 */
export const metadata: Metadata = {
  metadataBase: new URL(toCanonicalUrl('/')),
  title: {
    default: `${BRAND.name} — ${BRAND.positioning}`,
    template: `%s — ${BRAND.name}`,
  },
  description: BRAND.tagline,
  // Per-page metadata overrides this from the database once the public pages
  // are designed.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
