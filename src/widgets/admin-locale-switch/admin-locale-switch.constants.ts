import type { AppLocale } from '@pkg/i18n/routing';

/**
 * The interface languages, each named in its own language so the switch reads
 * the same whichever one is on. `code` is what the button shows; `name` is its
 * accessible name, and begins with the code so the two agree.
 */
export const INTERFACE_LOCALES: ReadonlyArray<{ value: AppLocale; code: string; name: string }> = [
  { value: 'ka', code: 'ქა', name: 'ქართული' },
  { value: 'en', code: 'EN', name: 'English' },
];
