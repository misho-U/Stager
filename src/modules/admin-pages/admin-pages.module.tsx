'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { adminPagesQuery } from '@/entity/page/api/page.query';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel } from '@/shared/components/panel';
import { toFormErrorMessage } from '@/shared/lib/form-errors';

const PAGE_LABELS: Record<string, string> = {
  HOME: 'Home',
  ABOUT: 'About',
  SERVICES: 'Services',
  PROJECTS: 'Projects',
  TEAM: 'Team',
  INSIGHTS: 'Insights',
  CONTACT: 'Contact',
};

export function AdminPagesModule() {
  const { data, isLoading, error } = useQuery(adminPagesQuery());

  return (
    <>
      <PageHeader
        title="Page copy"
        description="Change the words and SEO on each page. The sections themselves are fixed in code."
      />

      {error ? <ErrorNotice message={toFormErrorMessage(error)} /> : null}

      <Panel>
        {isLoading ? (
          <p className="text-body-sm text-ink-subtle">Loading…</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {(data?.items ?? []).map((page) => (
              <li key={page.id}>
                <Link
                  href={`/admin/pages/${page.key}`}
                  className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-ink"
                >
                  <div className="flex flex-col">
                    <span className="text-body-sm font-medium text-ink">
                      {PAGE_LABELS[page.key] ?? page.key}
                    </span>
                    <span className="text-caption text-ink-subtle">
                      {page.sections.length}{' '}
                      {page.sections.length === 1 ? 'section' : 'sections'}
                    </span>
                  </div>
                  <span aria-hidden className="text-ink-subtle">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
