import type { CSSProperties, ReactNode } from 'react';

import { splitStatValue, type PublicStat } from '@/entity/stat/model/stat.model';

type StatBandProps = {
  stats: readonly PublicStat[];
  /** Names the band for a screen reader: it has no visible heading. */
  label: string;
  /** "Sample", while the figures are placeholders. */
  badge?: ReactNode;
};

/**
 * The company in figures, right under the hero: a row of them between two
 * hairlines, each figure over its caption. The number in a figure counts up
 * as it comes into view (the design's motion, `data-count-to`); the full
 * value is in the page from the start, and is what a screen reader reads.
 */
export function StatBand({ stats, label, badge }: StatBandProps) {
  return (
    <section aria-label={label} className="px-gutter">
      <div className="max-w-page mx-auto flex flex-col gap-4">
        {badge ? <div className="flex justify-end">{badge}</div> : null}
        <dl
          data-testid="stat-band"
          className="ct-stats"
          style={{ '--stats': stats.length } as CSSProperties}
        >
          {stats.map((stat) => {
            const parts = splitStatValue(stat.value);
            return (
              <div key={stat.id} data-reveal className="ct-stat">
                <dt className="text-body-sm sm:text-body text-ink-muted text-pretty">
                  {stat.label}
                </dt>
                <dd className="text-headline font-heading order-first tabular-nums">
                  {parts ? (
                    <>
                      <span className="sr-only">{stat.value}</span>
                      <span aria-hidden>
                        {parts.before}
                        <span
                          data-count-to={parts.number}
                          data-grouped={parts.grouped ? '' : undefined}
                          className="inline-block text-end"
                        >
                          {parts.grouped ? parts.number.toLocaleString('en-US') : parts.number}
                        </span>
                        <span className="text-accent">{parts.after}</span>
                      </span>
                    </>
                  ) : (
                    stat.value
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
