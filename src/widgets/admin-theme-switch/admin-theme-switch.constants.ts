import type { Icon } from '@phosphor-icons/react';
// Per-icon imports: the package root re-exports all ~1,500 icons.
import { DesktopIcon } from '@phosphor-icons/react/dist/csr/Desktop';
import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
import { SunIcon } from '@phosphor-icons/react/dist/csr/Sun';

import type { AdminTheme } from '@/shared/lib/admin-theme';

export const THEME_OPTIONS: ReadonlyArray<{ value: AdminTheme; label: string; Icon: Icon }> = [
  { value: 'system', label: 'Match system', Icon: DesktopIcon },
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
];
