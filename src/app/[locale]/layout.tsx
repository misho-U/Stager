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

/**
 * A reload starts at the top of the page. Browsers put a reloaded page back
 * where it was scrolled to, and a `#section` left in the address (a shared
 * link, a menu jump) took a reload back to that section. Only for a reload:
 * a link opened fresh to `/en#academy` still lands on the Academy, and Back
 * still returns to where the visitor was.
 *
 * Runs before the first paint. Chrome decides to restore the old position
 * from the page being left, so switching its restore off here comes too late
 * on its own: the page goes back to the top once more after `load`, when the
 * restore has happened, unless the visitor has started scrolling by then.
 */
const RELOAD_AT_TOP = `(function(){try{var n=performance.getEntriesByType('navigation')[0];if(!n||n.type!=='reload')return;history.scrollRestoration='manual';if(location.hash)history.replaceState(history.state,'',location.pathname+location.search);var top=function(){window.scrollTo(0,0);};top();var moved=false;var mark=function(){moved=true;};['wheel','touchstart','keydown','pointerdown'].forEach(function(t){addEventListener(t,mark,{capture:true,passive:true,once:true});});addEventListener('load',function(){requestAnimationFrame(function(){if(!moved)top();});},{once:true});}catch(e){}})();`;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = await rootLocale();

  // A request for /de would otherwise render the default locale's copy under a
  // URL that should not exist.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // `data-scroll-behavior`: Next turns smooth scrolling off while it moves to
  // the top of a newly opened page. The public site no longer glides native
  // jumps (globals.css), but when it did, the move to the top glided too,
  // and the page's scroll scenes, measuring as they set up, put the old
  // position back: a link at the foot of a page opened the next one at the
  // same depth. Kept so that can never come back.
  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="bg-surface text-ink min-h-svh antialiased">
        <script dangerouslySetInnerHTML={{ __html: RELOAD_AT_TOP }} />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
