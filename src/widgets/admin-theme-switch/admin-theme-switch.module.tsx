'use client';

import { useAdminTheme } from '@/shared/components/admin-theme-provider';
import { cn } from '@/shared/lib/cn';
import { THEME_OPTIONS } from '@/widgets/admin-theme-switch/admin-theme-switch.constants';

/**
 * System / Light / Dark for the dashboard. The public site has no switch — it
 * is light-only by decision.
 *
 * Toggle buttons with aria-pressed rather than a radiogroup: each is a plain
 * tab stop that announces its state, with no arrow-key handling to get wrong.
 */
export function AdminThemeSwitch() {
  const { theme, setTheme } = useAdminTheme();

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="flex rounded-md border border-line p-0.5 text-body"
    >
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'flex size-7 items-center justify-center rounded-sm transition-colors',
            theme === value ? 'bg-surface-muted text-ink' : 'text-ink-subtle hover:text-ink',
          )}
        >
          {/* 1em: the icon takes its size from the text scale, not a pixel value. */}
          <Icon size="1em" aria-hidden />
        </button>
      ))}
    </div>
  );
}
