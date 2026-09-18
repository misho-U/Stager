'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { adminInsightsQuery, useDeleteInsight } from '@/entity/insight/api/insight.query';
import type { AdminInsight } from '@/entity/insight/model/insight.model';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel, StatusBadge } from '@/shared/components/panel';
import { toFormErrorMessage } from '@/shared/lib/form-errors';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminInsightsModule() {
  const { data, isLoading, error } = useQuery(adminInsightsQuery());
  const deleteInsight = useDeleteInsight();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setDeleteError(null);
    try {
      await deleteInsight.mutateAsync(id);
    } catch (caught) {
      setDeleteError(toFormErrorMessage(caught));
    }
  };

  const columns: Array<Column<AdminInsight>> = [
    {
      key: 'title',
      header: 'Title',
      render: (insight) => (
        <Link
          href={`/admin/insights/${insight.id}`}
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          {insight.translations.KA.title || insight.translations.EN.title || insight.slug}
        </Link>
      ),
    },
    { key: 'status', header: 'Status', render: (insight) => <StatusBadge status={insight.status} /> },
    {
      key: 'published',
      header: 'Published',
      secondary: true,
      render: (insight) => (
        <span className="text-ink-muted">{formatDate(insight.publishedAt)}</span>
      ),
    },
    {
      key: 'author',
      header: 'Author',
      secondary: true,
      render: (insight) => (
        <span className="text-ink-muted">
          {insight.showAuthor ? (insight.authorId ? 'Shown' : '—') : 'Hidden'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (insight) => (
        <ConfirmButton
          label="Delete"
          confirmLabel="Confirm"
          loading={deleteInsight.isPending && deleteInsight.variables === insight.id}
          onConfirm={() => remove(insight.id)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Insights"
        description="Articles and news."
        actions={
          <Link href="/admin/insights/new">
            <Button>New article</Button>
          </Link>
        }
      />

      {error ? <ErrorNotice message={toFormErrorMessage(error)} /> : null}
      {deleteError ? <ErrorNotice message={deleteError} /> : null}

      <Panel>
        {isLoading ? (
          <p className="text-body-sm text-ink-subtle">Loading…</p>
        ) : (
          <DataTable
            rows={data?.items ?? []}
            columns={columns}
            rowKey={(insight) => insight.id}
            emptyTitle="No articles yet"
          />
        )}
      </Panel>
    </>
  );
}
