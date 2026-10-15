import type { Metadata } from 'next';

import { HomePageModule } from '@/modules/home-page/home-page.module';
import { loadHomePageMetadata } from '@/modules/home-page/home-page.service';
import { isAppLocale, toDbLocale, DEFAULT_LOCALE } from '@pkg/i18n/routing';

/**
 * Built at build time, in both languages ([locale]/layout.tsx), from the
 * published layer's cached reads; a save in the dashboard purges the tags
 * this page used, and the next visit rebuilds it (AGENTS.md § Data flow).
 */

type Params = { params: Promise<{ locale: string }> };

async function resolve(params: Params['params']) {
  const { locale } = await params;
  return toDbLocale(isAppLocale(locale) ? locale : DEFAULT_LOCALE);
}

/** Search title, description and share card (widgets/seo); indexed from launch. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return loadHomePageMetadata(await resolve(params));
}

export default async function HomePage({ params }: Params) {
  return <HomePageModule locale={await resolve(params)} />;
}
