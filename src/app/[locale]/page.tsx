import { HomePageModule } from '@/modules/home-page/home-page.module';
import { isAppLocale, toDbLocale, DEFAULT_LOCALE } from '@pkg/i18n/routing';

/**
 * Rendered per request, never at build time.
 *
 * next-intl already makes this route dynamic, but without saying so explicitly
 * Next still ATTEMPTS a prerender to find that out — and during `next build`
 * nothing is listening on the origin, so every `serverFetch` in
 * home-page.service.ts fails and fills the build log with `fetch failed`. The
 * result of that attempt is discarded, so it was only ever noise, but noise
 * that reads exactly like a broken deployment.
 *
 * Nothing is given up here. Caching for this page lives in the Data Cache,
 * keyed by the tags `serverFetch` sends, and `revalidateEntity()` purges those
 * on every admin write — see pkg/cache/tags.ts.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const appLocale = isAppLocale(locale) ? locale : DEFAULT_LOCALE;

  return <HomePageModule locale={toDbLocale(appLocale)} />;
}
