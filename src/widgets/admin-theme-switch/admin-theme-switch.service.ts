'use client';

import { useSyncExternalStore } from 'react';

import { useAdminTheme } from '@/shared/components/admin-theme-provider';

const OS_PREFERS_DARK = '(prefers-color-scheme: dark)';

function subscribeToOsTheme(onChange: () => void) {
  const query = window.matchMedia(OS_PREFERS_DARK);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Which of the two modes the switch shows as selected, and how to pick one.
 *
 * Until a mode is picked the dashboard follows the operating system, so the
 * switch shows whichever mode that currently is. The server cannot know it and
 * renders light; the browser corrects that as it hydrates. Only this indicator
 * can change then: the page's own colours come from CSS and are right from the
 * first paint.
 */
export function useAdminThemeSwitch() {
  const { theme, setTheme } = useAdminTheme();
  const osPrefersDark = useSyncExternalStore(
    subscribeToOsTheme,
    () => window.matchMedia(OS_PREFERS_DARK).matches,
    () => false,
  );

  return {
    shown: theme === 'system' ? (osPrefersDark ? 'dark' : 'light') : theme,
    choose: setTheme,
  };
}
