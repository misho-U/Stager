import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Panel } from '@/shared/components/panel';
import { DASHBOARD_SHORTCUTS } from '@/modules/admin-dashboard/admin-dashboard.constants';

type AdminDashboardModuleProps = {
  name: string | null;
  counts: {
    projects: number;
    insights: number;
    services: number;
    courses: number;
    videos: number;
    teamMembers: number;
    newInquiries: number;
  };
};

/**
 * Dashboard landing page.
 *
 * A server component: the counts come from the layout's already-authenticated
 * request, so there is nothing to fetch on the client and no loading state to
 * design around.
 */
export function AdminDashboardModule({ name, counts }: AdminDashboardModuleProps) {
  const t = useTranslations('admin');

  // The same words as the sidebar, so a count and its screen match.
  const stats = [
    { label: t('sidebar.nav.projects'), value: counts.projects, href: '/admin/projects' },
    { label: t('sidebar.nav.insights'), value: counts.insights, href: '/admin/insights' },
    { label: t('sidebar.nav.services'), value: counts.services, href: '/admin/services' },
    { label: t('sidebar.nav.courses'), value: counts.courses, href: '/admin/courses' },
    { label: t('sidebar.nav.videos'), value: counts.videos, href: '/admin/videos' },
    { label: t('sidebar.nav.team'), value: counts.teamMembers, href: '/admin/team' },
  ];

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-headline font-semibold">
          {name ? t('dashboard.greeting', { name }) : t('dashboard.title')}
        </h1>
        <p className="text-body-sm text-ink-muted">{t('dashboard.intro')}</p>
      </header>

      {counts.newInquiries > 0 ? (
        <Link
          href="/admin/inquiries"
          className="rounded-lg border border-primary/30 bg-primary/8 px-5 py-4 transition-colors hover:bg-primary/12"
        >
          <p className="text-body-sm font-medium text-primary">
            {t('dashboard.newInquiries', { count: counts.newInquiries })}
          </p>
          <p className="text-caption text-ink-muted">{t('dashboard.openInbox')}</p>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-lg border border-line bg-surface-raised px-4 py-3 transition-colors hover:border-line-strong"
          >
            <p className="text-title font-semibold text-ink">{stat.value}</p>
            <p className="text-caption text-ink-subtle">{stat.label}</p>
          </Link>
        ))}
      </div>

      <Panel title={t('dashboard.shortcutsTitle')}>
        <ul className="flex flex-col gap-2">
          {DASHBOARD_SHORTCUTS.map((shortcut) => (
            <li key={shortcut.href}>
              <Link
                href={shortcut.href}
                className="flex flex-col rounded-md px-2 py-2 transition-colors hover:bg-surface-muted"
              >
                <span className="text-body-sm text-ink">
                  {t(`dashboard.shortcuts.${shortcut.key}.label`)}
                </span>
                <span className="text-caption text-ink-subtle">
                  {t(`dashboard.shortcuts.${shortcut.key}.description`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
