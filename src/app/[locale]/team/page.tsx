import type { Metadata } from 'next';

import { TeamPageModule } from '@/modules/team-page/team-page.module';
import { loadTeamPageMetadata } from '@/modules/team-page/team-page.service';
import { DEFAULT_LOCALE, isAppLocale, toDbLocale } from '@pkg/i18n/routing';

/** Rendered per request, like the home page (see its page file for why). */
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ locale: string }> };

async function resolve(params: Params['params']) {
  const { locale } = await params;
  return toDbLocale(isAppLocale(locale) ? locale : DEFAULT_LOCALE);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return loadTeamPageMetadata(await resolve(params));
}

export default async function TeamPage({ params }: Params) {
  return <TeamPageModule locale={await resolve(params)} />;
}
