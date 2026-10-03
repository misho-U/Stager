'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Button } from '@/shared/components/button';
import { cn } from '@/shared/lib/cn';
import { AdminLocaleSwitch } from '@/widgets/admin-locale-switch/admin-locale-switch.module';
import {
  ADMIN_NAV,
  ADMIN_NAV_GROUPS,
} from '@/widgets/admin-sidebar/admin-sidebar.constants';
import { useAdminSidebar } from '@/widgets/admin-sidebar/admin-sidebar.service';
import { AdminThemeSwitch } from '@/widgets/admin-theme-switch/admin-theme-switch.module';

type AdminSidebarProps = {
  email: string;
  name: string | null;
  role: string;
};

export function AdminSidebar({ email, name, role }: AdminSidebarProps) {
  const t = useTranslations('admin');
  const { isActive, signOut, isSigningOut } = useAdminSidebar();

  return (
    // On wide screens: pinned to the window while the page scrolls, and spaced
    // to fit a 1366×768 laptop without a scrollbar. It can still scroll, with a
    // thin bar, in a window too short for it.
    <nav
      aria-label={t('sidebar.label')}
      className="scrollbar-subtle flex shrink-0 flex-col gap-6 border-line bg-surface-raised p-4 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:gap-4 lg:overflow-y-auto lg:py-3 lg:border-r border-b lg:border-b-0"
    >
      <div className="flex items-center justify-between gap-2">
        <Link href="/admin" className="px-2">
          <span className="text-body-lg font-semibold tracking-wordmark text-ink">STAGER</span>
          <span className="block text-caption tracking-wide text-ink-subtle uppercase">
            {t('sidebar.caption')}
          </span>
        </Link>
        <AdminThemeSwitch />
      </div>

      <div className="flex flex-1 flex-col gap-5 lg:gap-3">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group} className="flex flex-col gap-0.5 lg:gap-0">
            <p className="px-2 pb-1 text-caption font-medium tracking-wider text-ink-subtle uppercase lg:pb-0.5">
              {t(`sidebar.groups.${group}`)}
            </p>
            {ADMIN_NAV.filter((item) => item.group === group).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  // 3px on wide screens: eleven rows still fit a 1366×600
                  // window, and each stays taller than the 24px minimum target.
                  'rounded-md px-2 py-1.5 text-body-sm transition-colors lg:py-0.75',
                  isActive(item.href)
                    ? 'bg-primary text-on-primary'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                )}
              >
                {t(`sidebar.nav.${item.labelKey}`)}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        {/* The interface language sits beside the account, so it adds no row
            to a sidebar already sized to fit a laptop screen. */}
        <div className="flex items-center justify-between gap-2 pl-2">
          <div className="min-w-0">
            <p className="truncate text-body-sm text-ink">{name ?? email}</p>
            <p className="truncate text-caption text-ink-subtle" title={email}>
              {t.has(`roles.${role}`) ? t(`roles.${role}`) : role.toLowerCase()} · {email}
            </p>
          </div>
          <AdminLocaleSwitch />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void signOut()}
            loading={isSigningOut}
            className="flex-1"
          >
            {t('sidebar.signOut')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            // Opens the live site so an edit can be checked immediately.
            onClick={() => window.open('/ka', '_blank', 'noopener,noreferrer')}
          >
            {t('sidebar.viewSite')}
          </Button>
        </div>
      </div>
    </nav>
  );
}
