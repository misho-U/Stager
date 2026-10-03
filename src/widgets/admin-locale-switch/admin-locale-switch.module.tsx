'use client';

// Per-icon import: the package root re-exports all ~1,500 icons.
import { TranslateIcon } from '@phosphor-icons/react/dist/csr/Translate';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/cn';
import { INTERFACE_LOCALES } from '@/widgets/admin-locale-switch/admin-locale-switch.constants';
import { useAdminLocaleSwitch } from '@/widgets/admin-locale-switch/admin-locale-switch.service';

/**
 * ქა | EN: the language of the dashboard itself, on the sidebar's account row
 * and on the sign-in form.
 *
 * Deliberately unlike the content toggle at the top of each form
 * ("რედაქტირება: ქართული | English"), which picks the language of the copy
 * being edited: a different place, short codes, and a translate icon.
 */
export function AdminLocaleSwitch() {
  const t = useTranslations('admin.interfaceLanguage');
  const { current, choose, isSwitching } = useAdminLocaleSwitch();

  return (
    <div
      role="group"
      aria-label={t('label')}
      title={t('label')}
      className="flex shrink-0 items-center rounded-md border border-line p-0.5 text-caption"
    >
      <TranslateIcon aria-hidden size="1.25em" className="mx-1 text-ink-subtle" />
      {INTERFACE_LOCALES.map(({ value, code, name }) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-pressed={current === value}
          aria-label={name}
          disabled={isSwitching}
          onClick={() => choose(value)}
          className={cn(
            'flex h-7 min-w-7 items-center justify-center rounded-sm px-1 font-medium transition-colors',
            current === value ? 'bg-surface-muted text-ink' : 'text-ink-subtle hover:text-ink',
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
