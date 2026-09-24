import { z } from 'zod';

/**
 * The dashboard's colour theme — a per-browser preference, never stored in the
 * database.
 *
 * The public site is light-only by decision; only the dashboard offers dark
 * mode. The choice lives in a cookie rather than localStorage so the SERVER can
 * render the right theme in the first byte: no flash of light before a script
 * runs, and no inline script for the admin's nonce-based CSP to authorise.
 */
export const ADMIN_THEMES = ['system', 'light', 'dark'] as const;
export type AdminTheme = (typeof ADMIN_THEMES)[number];

export const ADMIN_THEME_COOKIE = 'stager-admin-theme';

/** A cookie is user input: anything unrecognised means "follow the OS". */
const adminThemeSchema = z.enum(ADMIN_THEMES).catch('system');

export function parseAdminTheme(value: string | undefined): AdminTheme {
  return adminThemeSchema.parse(value);
}

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * The `document.cookie` string the theme switch writes. Scoped to /admin, so
 * public pages never carry it.
 */
export function adminThemeCookie(theme: AdminTheme, secure: boolean): string {
  return [
    `${ADMIN_THEME_COOKIE}=${theme}`,
    'Path=/admin',
    `Max-Age=${ONE_YEAR_IN_SECONDS}`,
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
