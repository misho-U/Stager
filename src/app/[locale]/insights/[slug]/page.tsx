import type { Metadata } from 'next';

import { InsightPageModule } from '@/modules/insight-page/insight-page.module';
import { readInsight } from '@/modules/insight-page/insight-page.service';
import { DEFAULT_LOCALE, isAppLocale, toDbLocale } from '@pkg/i18n/routing';

/** Rendered per request, like the home page (see its page file for why). */
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ locale: string; slug: string }> };

async function resolve(params: Params['params']) {
  const { locale, slug } = await params;
  return { locale: toDbLocale(isAppLocale(locale) ? locale : DEFAULT_LOCALE), slug };
}

/** The article's own search title and description, written with it in the dashboard. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await resolve(params);
  const article = await readInsight(locale, slug).catch(() => null);
  return {
    title: article?.metaTitle || article?.title,
    description: article?.metaDescription || article?.excerpt || undefined,
    openGraph: article?.ogImageUrl ? { images: [article.ogImageUrl] } : undefined,
    // Not for search engines until launch, like the rest of the preview.
    robots: { index: false, follow: false },
  };
}

export default async function InsightPage({ params }: Params) {
  const { locale, slug } = await resolve(params);
  return <InsightPageModule locale={locale} slug={slug} />;
}
