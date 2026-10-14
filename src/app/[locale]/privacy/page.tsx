import type { Metadata } from 'next';

import { PrivacyPageModule } from '@/modules/privacy-page/privacy-page.module';
import { loadPrivacyPageMetadata } from '@/modules/privacy-page/privacy-page.service';
import { DEFAULT_LOCALE, isAppLocale, toDbLocale } from '@pkg/i18n/routing';

/** Rendered per request, like the home page (see its page file for why). */
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ locale: string }> };

async function resolve(params: Params['params']) {
  const { locale } = await params;
  return toDbLocale(isAppLocale(locale) ? locale : DEFAULT_LOCALE);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return loadPrivacyPageMetadata(await resolve(params));
}

export default async function PrivacyPage({ params }: Params) {
  return <PrivacyPageModule locale={await resolve(params)} />;
}
