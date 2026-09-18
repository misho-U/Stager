'use client';

import { useState, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import type { DbLocale } from '@/shared/types/enums';

const TAB_LABELS: Record<DbLocale, string> = { KA: 'ქართული', EN: 'English' };

type LocaleTabsProps = {
  /** Locales whose fields currently fail validation, marked in the tab strip. */
  invalidLocales?: DbLocale[];
  children: (locale: DbLocale) => ReactNode;
};

/**
 * KA/EN tabs for a translated form.
 *
 * Both panels stay mounted and are hidden with CSS rather than unmounted. React
 * Hook Form would otherwise drop the inactive locale's registered fields, and
 * submitting would silently wipe the copy in the language the editor was not
 * looking at.
 */
export function LocaleTabs({ invalidLocales = [], children }: LocaleTabsProps) {
  const [active, setActive] = useState<DbLocale>('KA');

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-1 border-b border-line">
        {(['KA', 'EN'] as const).map((locale) => {
          const isActive = locale === active;
          const isInvalid = invalidLocales.includes(locale);

          return (
            <button
              key={locale}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(locale)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-body-sm font-medium transition-colors',
                isActive
                  ? 'border-brand-teal text-ink'
                  : 'border-transparent text-ink-subtle hover:text-ink-muted',
              )}
            >
              {TAB_LABELS[locale]}
              {isInvalid ? (
                <span className="ml-1.5 text-danger" aria-label="has errors">
                  •
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {(['KA', 'EN'] as const).map((locale) => (
        <div
          key={locale}
          role="tabpanel"
          hidden={locale !== active}
          className="flex flex-col gap-4"
        >
          {children(locale)}
        </div>
      ))}
    </div>
  );
}
