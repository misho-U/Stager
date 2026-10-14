import type { Metadata } from 'next';

import { InsightsPageModule } from '@/modules/insights-page/insights-page.module';
import { loadInsightsPageMetadata } from '@/modules/insights-page/insights-page.service';
import { DEFAULT_LOCALE, isAppLocale, toDbLocale } from '@pkg/i18n/routing';

/** Rendered per request, like the home page (see its page file for why). */
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ locale: string }> };

async function resolve(params: Params['params']) {
  const { locale } = await params;
  return toDbLocale(isAppLocale(locale) ? locale : DEFAULT_LOCALE);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return loadInsightsPageMetadata(await resolve(params));
}

export default async function InsightsPage({ params }: Params) {
  return <InsightsPageModule locale={await resolve(params)} />;
}
