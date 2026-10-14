import type { Metadata, Viewport } from 'next';
import { getLocale } from 'next-intl/server';

import './globals.css';

import appleIcon from '@/shared/brandbook/images/apple-icon.png';
import icon from '@/shared/brandbook/images/icon.png';
import { BRAND, THEME_COLOR } from '@/shared/brandbook/tokens';
import { toCanonicalUrl } from '@pkg/http/site-url';

/**
 * The single root layout.
 *
 * `/admin` is not locale-prefixed, so the lang attribute cannot come from a
 * route param — `getLocale()` reads it from the request context that the
 * next-intl middleware sets. Admin routes have none, and resolve to the
 * dashboard's interface language, the admin's own choice (see
 * pkg/i18n/request.ts).
 */
export const metadata: Metadata = {
  metadataBase: new URL(toCanonicalUrl('/')),
  title: {
    default: `${BRAND.name} — ${BRAND.positioning}`,
    template: `%s — ${BRAND.name}`,
  },
  description: BRAND.tagline,
  // Every public page sets its own (widgets/seo), from the dashboard.
  robots: { index: true, follow: true },
  // Drawn by scripts/brand-images.ts; favicon.ico beside this file is the
  // tab's. Served from _next/static, past the locale routing.
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
