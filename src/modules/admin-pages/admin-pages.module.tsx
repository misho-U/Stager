'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { adminPagesQuery } from '@/entity/page/api/page.query';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel } from '@/shared/components/panel';
import { useFormErrors } from '@/shared/lib/form-errors';

export function AdminPagesModule() {
  const t = useTranslations('admin');
  const formErrors = useFormErrors();
  const { data, isLoading, error } = useQuery(adminPagesQuery());

  return (
    <>
      <PageHeader title={t('pages.title')} description={t('pages.description')} />

      {error ? <ErrorNotice message={formErrors.message(error)} /> : null}

      <Panel>
        {isLoading ? (
          <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>
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
