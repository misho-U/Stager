'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { adminPagesQuery } from '@/entity/page/api/page.query';
import { ButtonLink } from '@/shared/components/button';
import { PageHeader } from '@/shared/components/page-header';
import { LoadFailed, Panel } from '@/shared/components/panel';
import { useFormErrors } from '@/shared/lib/form-errors';

export function AdminPagesModule() {
  const t = useTranslations('admin');
  const formErrors = useFormErrors();
  const { data, isLoading, error, refetch } = useQuery(adminPagesQuery());
  // Only while nothing has loaded; a failed refresh keeps the list on screen.
  const loadFailed = error && !data ? formErrors.message(error) : null;

  return (
    <>
      <PageHeader
        title={t('pages.title')}
        description={t('pages.description')}
        actions={
          // Home page content too, kept off the sidebar (admin-sidebar.constants.ts).
          <ButtonLink href="/admin/company-stats" variant="secondary">
            {t('pages.companyStatsLink')}
          </ButtonLink>
        }
      />

      <Panel>
        {loadFailed ? (
          <LoadFailed message={loadFailed} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>
        ) : (
          <ul className="divide-line flex flex-col divide-y">
            {(data?.items ?? []).map((page) => (
              <li key={page.id}>
                <Link
                  href={`/admin/pages/${page.key}`}
                  className="hover:text-ink flex items-center justify-between gap-3 py-3 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-body-sm text-ink font-medium">
                      {t(`pages.keys.${page.key}`)}
                    </span>
                    <span className="text-caption text-ink-subtle">
                      {t('pages.sectionCount', { count: page.sections.length })}
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
