import type { Icon } from '@phosphor-icons/react';
// Per-icon imports: the package root re-exports all ~1,500 icons.
import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
import { SunIcon } from '@phosphor-icons/react/dist/csr/Sun';

import type { AdminTheme } from '@/shared/lib/admin-theme';

/** The two modes on offer. `system` is not one: it is the state before a pick. */
export const THEME_OPTIONS: ReadonlyArray<{
  value: Exclude<AdminTheme, 'system'>;
  label: string;
  Icon: Icon;
}> = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
];
