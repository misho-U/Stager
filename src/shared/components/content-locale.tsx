'use client';

import { useTranslations } from 'next-intl';
import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import type { FieldErrors } from 'react-hook-form';

import { LOCALE_NAMES } from '@/shared/constants/content';
import { cn } from '@/shared/lib/cn';
import { localesWithErrors } from '@/shared/lib/locale-errors';
import { DB_LOCALES, type DbLocale } from '@/shared/types/enums';

/*
 * The language of the copy being edited, chosen once per form.
 *
 * Not to be confused with the dashboard's own language (the ქა | EN switch in
 * the sidebar). This one decides which half of a bilingual form is on screen;
 * the other decides what the labels around it say.
 */

type ContentLocaleState = {
  active: DbLocale;
  setActive: (locale: DbLocale) => void;
  invalidLocales: DbLocale[];
};

const ContentLocaleContext = createContext<ContentLocaleState | null>(null);

/** The language of the fields around a component, when it is inside one half of a form. */
const FieldLanguageContext = createContext<DbLocale | null>(null);

function useContentLocale(): ContentLocaleState {
  const state = useContext(ContentLocaleContext);
  if (!state) throw new Error('TranslatedFields and ContentLocaleToggle need a ContentLocaleProvider');
  return state;
}

/** For field components: tags a control with the language of the text typed into it. */
export function useFieldLanguage(): DbLocale | null {
  return useContext(FieldLanguageContext);
}

type ContentLocaleProviderProps = {
  /** The form's errors, to mark a language that has a problem the editor cannot see. */
  errors: FieldErrors;
  /** The form's submit count, to react to a failed save. */
  submitCount: number;
  children: ReactNode;
};

/**
 * Wraps a bilingual form. Starts on Georgian every time the form opens.
 */
export function ContentLocaleProvider({ errors, submitCount, children }: ContentLocaleProviderProps) {
  const [active, setActive] = useState<DbLocale>('KA');
  const [seenSubmitCount, setSeenSubmitCount] = useState(submitCount);
  const invalidLocales = localesWithErrors(errors);

  // A failed save whose only problems are in the language not on screen would
  // otherwise look like Save did nothing: switch to the one that needs fixing.
  // Done while rendering, the way React derives state from a changed prop;
  // the save's errors arrive in the same update as its count.
  if (submitCount !== seenSubmitCount) {
    setSeenSubmitCount(submitCount);
    const [firstInvalid] = invalidLocales;
    if (firstInvalid && !invalidLocales.includes(active)) setActive(firstInvalid);
  }

  return (
    <ContentLocaleContext.Provider value={{ active, setActive, invalidLocales }}>
      {children}
    </ContentLocaleContext.Provider>
  );
}

/**
 * "Editing: ქართული | English" at the top of a bilingual form. Stays in view
 * while the form scrolls, and switches every translated field at once.
 *
 * Toggle buttons with aria-pressed, like the theme switch: one control drives
 * many regions of the form, which the tabs pattern cannot describe.
 */
export function ContentLocaleToggle() {
  const t = useTranslations('admin.contentLocale');
  const { active, setActive, invalidLocales } = useContentLocale();
  const labelId = useId();

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-surface py-3">
      <span id={labelId} className="text-body-sm font-medium text-ink-muted">
        {t('label')}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex rounded-md border border-line bg-surface-raised p-0.5"
      >
        {DB_LOCALES.map((locale) => {
          const isActive = locale === active;

          return (
            <button
              key={locale}
              type="button"
              lang={locale.toLowerCase()}
              aria-pressed={isActive}
              onClick={() => setActive(locale)}
              className={cn(
                'flex items-center gap-2 rounded-sm px-3 py-1 text-body-sm font-medium transition-colors',
                isActive ? 'bg-primary text-on-primary' : 'text-ink-muted hover:text-ink',
              )}
            >
              {LOCALE_NAMES[locale]}
              {invalidLocales.includes(locale) ? (
                <>
                  <span
                    aria-hidden
                    className={cn(
                      'size-2 rounded-full bg-danger',
                      isActive && 'ring-2 ring-on-primary',
                    )}
                  />
                  <span className="sr-only">{t('hasErrors')}</span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Both languages' copy of the same fields, showing the one being edited.
 *
 * Both stay mounted and the other is hidden rather than unmounted: React Hook
 * Form would otherwise drop the hidden language's registered fields, and
 * saving would silently wipe the copy the editor was not looking at.
 */
export function TranslatedFields({ children }: { children: (locale: DbLocale) => ReactNode }) {
  const { active } = useContentLocale();

  return DB_LOCALES.map((locale) => (
    <div
      key={locale}
      data-content-locale={locale}
      hidden={locale !== active}
      className="flex flex-col gap-4"
    >
      <FieldLanguageContext.Provider value={locale}>{children(locale)}</FieldLanguageContext.Provider>
    </div>
  ));
}
