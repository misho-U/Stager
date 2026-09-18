import { createNavigation } from 'next-intl/navigation';

import { routing } from '@pkg/i18n/routing';

/**
 * Locale-aware replacements for next/link and next/navigation.
 *
 * Always import Link, redirect, usePathname and useRouter from here in public
 * (`[locale]`) routes — the plain next/navigation versions drop the locale
 * prefix and send visitors to a 404.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
