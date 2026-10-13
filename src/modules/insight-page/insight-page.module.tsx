import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { INSIGHTS_PATH, insightPath } from '@/entity/insight/model/insight.model';
import { loadInsightPageData } from '@/modules/insight-page/insight-page.service';
import { MediaFrame } from '@/shared/components/media-frame';
import { RichText } from '@/shared/components/rich-text';
import { isBlankHtml, joinMeta } from '@/shared/lib/content';
import type { DbLocale } from '@/shared/types/enums';
import { toAppLocale } from '@pkg/i18n/routing';
import { InsightRows } from '@/widgets/insight-list/insight-list.module';
import { PageHero, SubpageShell } from '@/widgets/site-chrome/site-chrome.module';

type InsightPageModuleProps = { locale: DbLocale; slug: string };

/**
 * One article (dashboard → Insights): the way back to all of them, its
 * category and date, the title and excerpt, the cover, the text, and three
 * more to read. An address with no published article is a 404.
 */
export async function InsightPageModule({ locale, slug }: InsightPageModuleProps) {
  const [{ chrome, article, missing, more, readFailed }, t, format] = await Promise.all([
    loadInsightPageData(locale, slug),
    getTranslations(),
    getFormatter(),
  ]);
  if (missing) notFound();

  const base = `/${toAppLocale(locale)}`;
  const allArticles = `${base}${INSIGHTS_PATH}`;

  return (
    <SubpageShell
      locale={locale}
      chrome={chrome}
      readFailed={readFailed}
      current={`${base}${insightPath(slug)}`}
    >
      {article ? (
        <article aria-labelledby="page-title">
          <PageHero
            title={article.title}
            lead={article.excerpt}
            testId="insight-title"
            meta={
              <div className="flex flex-col items-start gap-6">
                <a
                  href={allArticles}
                  className="text-ink-muted hover:text-ink inline-flex min-h-11 items-center gap-2 transition-colors"
                >
                  <ArrowLeftIcon aria-hidden />
                  {t('insights.all')}
                </a>
                <p>
                  {joinMeta([
                    article.category?.name,
                    article.publishedAt
                      ? format.dateTime(new Date(article.publishedAt), {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : null,
                    article.readingMinutes
                      ? t('insights.minutes', { count: article.readingMinutes })
                      : null,
                  ])}
                </p>
              </div>
            }
          />
          <div className="px-gutter pb-section">
            <div className="max-w-page mx-auto flex flex-col gap-12">
              {article.cover ? (
                <div data-reveal className="overflow-hidden rounded-lg">
                  <MediaFrame
                    media={article.cover}
                    ratio="16/9"
                    sizes="(min-width: 1408px) 88rem, 100vw"
                    missingLabel={t('preview.photoSection')}
                  />
                </div>
              ) : null}
              {isBlankHtml(article.body) ? null : (
                <RichText html={article.body} className="ct-prose" />
              )}
              {article.author ? (
                <p className="text-body text-ink-muted border-line max-w-(--ct-measure) border-t pt-6">
                  {t('insights.by', { name: article.author.name })}
                </p>
              ) : null}
            </div>
          </div>
        </article>
      ) : null}

      {more.length > 0 ? (
        <section
          aria-labelledby="more-title"
          className="px-gutter pb-section border-line border-t pt-16"
        >
          <div className="max-w-page mx-auto flex flex-col gap-10">
            <h2 id="more-title" data-rise className="text-title-lg font-heading stretch-heading">
              {t('insights.more')}
            </h2>
            <InsightRows items={more} base={base} headingLevel="h3" />
          </div>
        </section>
      ) : null}
    </SubpageShell>
  );
}
