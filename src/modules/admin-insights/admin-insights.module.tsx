'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';

import { adminInsightsQuery, useDeleteInsight } from '@/entity/insight/api/insight.query';
import type { AdminInsight } from '@/entity/insight/model/insight.model';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel, StatusBadge } from '@/shared/components/panel';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useAdminFormat } from '@/shared/lib/use-admin-format';

export function AdminInsightsModule() {
  const t = useTranslations('admin');
  const format = useAdminFormat();
  const formErrors = useFormErrors();
  const { data, isLoading, error } = useQuery(adminInsightsQuery());
  const deleteInsight = useDeleteInsight();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setDeleteError(null);
    try {
      await deleteInsight.mutateAsync(id);
    } catch (caught) {
      setDeleteError(formErrors.message(caught));
    }
  };

  const columns: Array<Column<AdminInsight>> = [
    {
      key: 'title',
      header: t('columns.title'),
      render: (insight) => (
        <Link
          href={`/admin/insights/${insight.id}`}
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          {insight.translations.KA.title || insight.translations.EN.title || insight.slug}
        </Link>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (insight) => <StatusBadge status={insight.status} />,
    },
    {
      key: 'published',
      header: t('columns.published'),
      secondary: true,
      render: (insight) => (
        <span className="text-ink-muted">{insight.publishedAt ? format.date(insight.publishedAt) : '—'}</span>
      ),
    },
    {
      key: 'author',
      header: t('columns.author'),
      secondary: true,
      render: (insight) => (
        <span className="text-ink-muted">
          {insight.showAuthor
            ? insight.authorId
              ? t('insights.authorShown')
              : '—'
            : t('insights.authorHidden')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (insight) => (
        <ConfirmButton
          label={t('common.delete')}
          confirmLabel={t('common.confirm')}
          loading={deleteInsight.isPending && deleteInsight.variables === insight.id}
          onConfirm={() => remove(insight.id)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('insights.title')}
        description={t('insights.description')}
        actions={
          <Link href="/admin/insights/new">
            <Button>{t('insights.new')}</Button>
          </Link>
        }
      />

      {error ? <ErrorNotice message={formErrors.message(error)} /> : null}
      {deleteError ? <ErrorNotice message={deleteError} /> : null}

      <Panel>
        {isLoading ? (
          <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>
        ) : (
          <DataTable
            rows={data?.items ?? []}
            columns={columns}
            rowKey={(insight) => insight.id}
            emptyTitle={t('insights.emptyTitle')}
          />
        )}
      </Panel>
    </>
  );
}
