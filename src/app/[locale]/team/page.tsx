import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { TeamPageModule } from '@/modules/team-page/team-page.module';
import { DEFAULT_LOCALE, isAppLocale, toDbLocale } from '@pkg/i18n/routing';

/** Rendered per request, like the home page (see its page file for why). */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return {
    title: t('team'),
    // Not for search engines until launch, like the rest of the preview.
    robots: { index: false, follow: false },
  };
}

export default async function TeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const appLocale = isAppLocale(locale) ? locale : DEFAULT_LOCALE;

  return <TeamPageModule locale={toDbLocale(appLocale)} />;
}
