import type { Metadata } from 'next';

import { InsightPageModule } from '@/modules/insight-page/insight-page.module';
import {
  builtInsightSlugs,
  loadInsightPageMetadata,
} from '@/modules/insight-page/insight-page.service';
import { DEFAULT_LOCALE, isAppLocale, toDbLocale } from '@pkg/i18n/routing';

/**
 * Every published article is built at build time, in both languages. One
 * published after the build is built on its first visit. Never empty: with
 * no article at all, a placeholder address is built as a 404.
 */
export async function generateStaticParams() {
  return (await builtInsightSlugs()).map((slug) => ({ slug }));
}

type Params = { params: Promise<{ locale: string; slug: string }> };

async function resolve(params: Params['params']) {
  const { locale, slug } = await params;
  return { locale: toDbLocale(isAppLocale(locale) ? locale : DEFAULT_LOCALE), slug };
}

/** The article's own search title and description, written with it in the dashboard. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await resolve(params);
  return loadInsightPageMetadata(locale, slug);
}

export default async function InsightPage({ params }: Params) {
  const { locale, slug } = await resolve(params);
  return <InsightPageModule locale={locale} slug={slug} />;
}
