import type { Icon } from '@phosphor-icons/react';
// Per-icon imports: the package root re-exports all ~1,500 icons.
import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
import { SunIcon } from '@phosphor-icons/react/dist/csr/Sun';

import type { AdminTheme } from '@/shared/lib/admin-theme';

/**
 * The two modes on offer. `system` is not one: it is the state before a pick.
 * Each value is also its label's key under `admin.theme`.
 */
export const THEME_OPTIONS: ReadonlyArray<{
  value: Exclude<AdminTheme, 'system'>;
  Icon: Icon;
}> = [
  { value: 'light', Icon: SunIcon },
  { value: 'dark', Icon: MoonIcon },
];
