import { getTranslations } from 'next-intl/server';

import { ChefsTable } from '@/modules/home-page/elements/chefs-table/chefs-table.module';
import { loadHomePageData } from '@/modules/home-page/home-page.service';
import { ReadFailureNotice } from '@/shared/components/read-failure-notice';
import { SkipLink } from '@/shared/components/skip-link';
import type { DbLocale } from '@/shared/types/enums';

type HomePageModuleProps = {
  locale: DbLocale;
};

/**
 * The home page: the site's design, "Chef's Table" (./elements/chefs-table),
 * filled from the dashboard. Every read goes through home-page.service.ts.
 */
export async function HomePageModule({ locale }: HomePageModuleProps) {
  const [content, t, tCommon] = await Promise.all([
    loadHomePageData(locale),
    getTranslations('home'),
    getTranslations('common'),
  ]);

  return (
    // The site's tokens apply inside this element only (site.css).
    // `overflow-x-clip`: nothing that moves may widen the page; unlike
    // `hidden` it keeps sticky and pinned scenes working.
    <div data-site className="bg-surface text-ink overflow-x-clip">
      <SkipLink label={tCommon('skipToContent')} />
      {content.readFailed ? <ReadFailureNotice message={t('readFailed')} /> : null}
      <ChefsTable locale={locale} content={content} />
    </div>
  );
}
