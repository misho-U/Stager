import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { getFormatter, getTranslations } from 'next-intl/server';

import { insightPath, type PublicInsightListItem } from '@/entity/insight/model/insight.model';
import { joinMeta } from '@/shared/lib/content';

type InsightRowsProps = {
  items: readonly PublicInsightListItem[];
  /** The locale's root (`/ka`), which an article's path goes under. */
  base: string;
  /** The level of each article's title, under the heading of what lists them. */
  headingLevel: 'h2' | 'h3';
};

/**
 * Articles as rows between hairlines: the category and date, the title and
 * its excerpt, an arrow. The title is the row's one link, stretched over the
 * whole row, so the row is one Tab stop and its name is the title.
 */
export async function InsightRows({ items, base, headingLevel: Heading }: InsightRowsProps) {
  const [format, t] = await Promise.all([getFormatter(), getTranslations('insights')]);

  return (
    <ul data-testid="insight-list" className="border-line border-t">
      {items.map((insight) => (
        <li
          key={insight.id}
          data-reveal
          className="ct-spot border-line group relative grid gap-3 border-b py-8 lg:grid-cols-12 lg:items-center lg:gap-10"
        >
          <p className="text-body-sm text-ink-muted lg:col-span-3">
            {joinMeta([
              insight.category?.name,
              insight.publishedAt
                ? format.dateTime(new Date(insight.publishedAt), { day: 'numeric', month: 'long' })
                : null,
              insight.readingMinutes ? t('minutes', { count: insight.readingMinutes }) : null,
            ])}
          </p>
          <div className="flex flex-col gap-2 lg:col-span-8">
            <Heading className="text-title font-heading stretch-heading text-balance">
              <a
                href={`${base}${insightPath(insight.slug)}`}
                data-testid="insight-link"
                className="group-hover:text-accent transition-colors after:absolute after:inset-0"
              >
                {insight.title}
              </a>
            </Heading>
            {insight.excerpt ? (
              <p className="text-body text-ink-muted max-w-3xl text-pretty">{insight.excerpt}</p>
            ) : null}
          </div>
          <ArrowRightIcon
            aria-hidden
            className="text-accent ease-brand text-title hidden transition-transform duration-300 group-hover:translate-x-2 lg:col-span-1 lg:block lg:justify-self-end"
          />
        </li>
      ))}
    </ul>
  );
}
