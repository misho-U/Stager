import { getFormatter, getTranslations } from 'next-intl/server';

import { INSIGHTS_PATH, insightPath } from '@/entity/insight/model/insight.model';
import { pageIntro, pageName } from '@/entity/page/model/page.model';
import {
  insightsStructuredData,
  loadInsightsPageData,
} from '@/modules/insights-page/insights-page.service';
import { MediaFrame } from '@/shared/components/media-frame';
import { SiteLink } from '@/shared/components/site-link';
import { joinMeta } from '@/shared/lib/content';
import type { DbLocale } from '@/shared/types/enums';
import { toAppLocale } from '@pkg/i18n/routing';
import { InsightRows } from '@/widgets/insight-list/insight-list.module';
import { JsonLd } from '@/widgets/seo/seo.module';
import { PageHero, SubpageShell } from '@/widgets/site-chrome/site-chrome.module';

type InsightsPageModuleProps = { locale: DbLocale };

/**
 * Every published article, newest first. The newest leads, beside its cover
 * when it has one; the rest follow as rows. Each opens its own page. The
 * page's heading and the line under it are written under Page copy →
 * Insights.
 */
export async function InsightsPageModule({ locale }: InsightsPageModuleProps) {
  const [content, t, format] = await Promise.all([
    loadInsightsPageData(locale),
    getTranslations(),
    getFormatter(),
  ]);
  const { chrome, page, insights } = content;
  const base = `/${toAppLocale(locale)}`;
  const intro = pageIntro(page);
  const title = pageName(page, t('nav.insights'));
  const [lead, ...rest] = insights;
  const featured = lead?.cover ? lead : null;
  const rows = featured ? rest : insights;

  return (
    <SubpageShell locale={locale} chrome={chrome} current={`${base}${INSIGHTS_PATH}`}>
      <JsonLd
        data={insightsStructuredData(content, locale, {
          home: t('nav.home'),
          insights: t('nav.insights'),
        })}
      />
      <PageHero title={title} lead={intro.lead} testId="insights-title" />
      <div className="px-gutter pb-section">
        <div className="max-w-page mx-auto flex flex-col gap-16">
          {insights.length === 0 ? (
            <p className="text-body-lg text-ink-muted">{t('insights.empty')}</p>
          ) : null}

          {featured?.cover ? (
            <article
              data-reveal
              className="group relative grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10"
            >
              <div className="ct-spot overflow-hidden rounded-lg lg:col-span-7">
                <MediaFrame
                  media={featured.cover}
                  ratio="16/9"
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  missingLabel={t('preview.photoSection')}
                  className="ease-brand transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col gap-4 lg:col-span-5">
                <p className="text-body-sm text-ink-muted">
                  {joinMeta([
                    featured.category?.name,
                    featured.publishedAt
                      ? format.dateTime(new Date(featured.publishedAt), {
                          day: 'numeric',
                          month: 'long',
                        })
                      : null,
                    featured.readingMinutes
                      ? t('insights.minutes', { count: featured.readingMinutes })
                      : null,
                  ])}
                </p>
                <h2 className="text-title-lg font-heading stretch-heading text-balance">
                  <SiteLink
                    href={`${base}${insightPath(featured.slug)}`}
                    data-testid="insight-link"
                    className="group-hover:text-accent transition-colors after:absolute after:inset-0"
                  >
                    {featured.title}
                  </SiteLink>
                </h2>
                {featured.excerpt ? (
                  <p className="text-body-lg text-ink-muted text-pretty">{featured.excerpt}</p>
                ) : null}
              </div>
            </article>
          ) : null}

          {rows.length > 0 ? <InsightRows items={rows} base={base} headingLevel="h2" /> : null}
        </div>
      </div>
    </SubpageShell>
  );
}
