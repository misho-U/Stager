import Link from 'next/link';

import { Panel } from '@/shared/components/panel';
import { DASHBOARD_SHORTCUTS } from '@/modules/admin-dashboard/admin-dashboard.constants';

type AdminDashboardModuleProps = {
  name: string | null;
  counts: {
    projects: number;
    insights: number;
    services: number;
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
  const stats = [
    { label: 'Projects', value: counts.projects, href: '/admin/projects' },
    { label: 'Insights', value: counts.insights, href: '/admin/insights' },
    { label: 'Services', value: counts.services, href: '/admin/services' },
    { label: 'Team', value: counts.teamMembers, href: '/admin/team' },
  ];

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-headline font-semibold">
          {name ? `Hello, ${name}` : 'Dashboard'}
        </h1>
        <p className="text-body-sm text-ink-muted">
          Edits here appear on the public site as soon as you save.
        </p>
      </header>

      {counts.newInquiries > 0 ? (
        <Link
          href="/admin/inquiries"
          className="rounded-lg border border-brand-teal/30 bg-brand-teal/8 px-5 py-4 transition-colors hover:bg-brand-teal/12"
        >
          <p className="text-body-sm font-medium text-brand-teal">
            {counts.newInquiries} new{' '}
            {counts.newInquiries === 1 ? 'inquiry' : 'inquiries'} waiting
          </p>
          <p className="text-caption text-ink-muted">Open the inbox →</p>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      <Panel title="Common tasks">
        <ul className="flex flex-col gap-2">
          {DASHBOARD_SHORTCUTS.map((shortcut) => (
            <li key={shortcut.href}>
              <Link
                href={shortcut.href}
                className="flex flex-col rounded-md px-2 py-2 transition-colors hover:bg-brand-cream-tint"
              >
                <span className="text-body-sm text-ink">{shortcut.label}</span>
                <span className="text-caption text-ink-subtle">{shortcut.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
