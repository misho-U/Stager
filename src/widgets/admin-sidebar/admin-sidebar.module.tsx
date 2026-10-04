'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Button } from '@/shared/components/button';
import { SkipLink } from '@/shared/components/skip-link';
import { cn } from '@/shared/lib/cn';
import { AdminLocaleSwitch } from '@/widgets/admin-locale-switch/admin-locale-switch.module';
import { ADMIN_NAV, ADMIN_NAV_GROUPS } from '@/widgets/admin-sidebar/admin-sidebar.constants';
import { useAdminSidebar } from '@/widgets/admin-sidebar/admin-sidebar.service';
import { AdminThemeSwitch } from '@/widgets/admin-theme-switch/admin-theme-switch.module';

type AdminSidebarProps = {
  email: string;
  name: string | null;
  role: string;
};

export function AdminSidebar({ email, name, role }: AdminSidebarProps) {
  const t = useTranslations('admin');
  const { isActive, signOut, isSigningOut, unreadInquiries } = useAdminSidebar();

  return (
    <>
      {/* First on every page, so a keyboard need not walk the whole menu. */}
      <SkipLink label={t('common.skipToContent')} />
      {/* On wide screens: pinned to the window while the page scrolls, and
          spaced to fit a 1366×768 laptop without a scrollbar. It can still
          scroll, with a thin bar, in a window too short for it. */}
      <nav
        aria-label={t('sidebar.label')}
        className="scrollbar-subtle border-line bg-surface-raised flex shrink-0 flex-col gap-6 border-b p-4 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:gap-4 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:py-3"
      >
        <div className="flex items-center justify-between gap-2">
          <Link href="/admin" className="px-2">
            <span className="text-body-lg tracking-wordmark text-ink font-semibold">STAGER</span>
            <span className="text-caption text-ink-subtle block tracking-wide uppercase">
              {t('sidebar.caption')}
            </span>
          </Link>
          <AdminThemeSwitch />
        </div>

        <div className="flex flex-1 flex-col gap-5 lg:gap-3">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group} className="flex flex-col gap-0.5 lg:gap-0">
              <p className="text-caption text-ink-subtle px-2 pb-1 font-medium tracking-wider uppercase lg:pb-0.5">
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
                    'text-body-sm flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors lg:py-0.75',
                    isActive(item.href)
                      ? 'bg-primary text-on-primary'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                  )}
                >
                  {t(`sidebar.nav.${item.labelKey}`)}
                  {/* New leads, while email notifications may be off: the
                      one place they show without opening the inbox. */}
                  {item.labelKey === 'inquiries' && unreadInquiries > 0 ? (
                    <span
                      data-testid="unread-inquiries"
                      className={cn(
                        'text-caption min-w-5 rounded-full px-1.5 text-center font-semibold tabular-nums',
                        isActive(item.href)
                          ? 'bg-on-primary text-primary'
                          : 'bg-primary text-on-primary',
                      )}
                    >
                      <span aria-hidden>{unreadInquiries}</span>
                      <span className="sr-only">
                        {t('sidebar.unread', { count: unreadInquiries })}
                      </span>
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="border-line flex flex-col gap-2 border-t pt-4">
          {/* The interface language sits beside the account, so it adds no row
            to a sidebar already sized to fit a laptop screen. */}
          <div className="flex items-center justify-between gap-2 pl-2">
            <div className="min-w-0">
              <p className="text-body-sm text-ink truncate">{name ?? email}</p>
              <p className="text-caption text-ink-subtle truncate" title={email}>
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
    </>
  );
}
