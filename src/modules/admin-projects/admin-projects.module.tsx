'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { useAdminProjects } from '@/modules/admin-projects/admin-projects.service';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, LoadFailed, Panel, StatusBadge } from '@/shared/components/panel';
import type { AdminProject } from '@/entity/project/model/project.model';

export function AdminProjectsModule() {
  const t = useTranslations('admin');
  const { projects, isLoading, loadError, retry, remove, isDeleting, deletingId, deleteError } =
    useAdminProjects();

  const columns: Array<Column<AdminProject>> = [
    {
      key: 'title',
      header: t('columns.title'),
      render: (project) => (
        <Link
          href={`/admin/projects/${project.id}`}
          className="text-ink font-medium underline-offset-4 hover:underline"
        >
          {project.translations.KA.title || project.translations.EN.title || project.slug}
        </Link>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (project) => <StatusBadge status={project.status} />,
    },
    {
      key: 'year',
      header: t('columns.year'),
      secondary: true,
      render: (project) => <span className="text-ink-muted">{project.year ?? '—'}</span>,
    },
    {
      key: 'featured',
      header: t('columns.featured'),
      secondary: true,
      render: (project) => (
        <span className="text-ink-muted">{project.featured ? t('common.yes') : '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (project) => (
        <ConfirmButton
          label={t('common.delete')}
          confirmLabel={t('common.confirm')}
          loading={isDeleting && deletingId === project.id}
          onConfirm={() => remove(project.id)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('projects.title')}
        description={t('projects.description')}
        actions={
          <Link href="/admin/projects/new">
            <Button>{t('projects.new')}</Button>
          </Link>
        }
      />

      {deleteError ? <ErrorNotice message={deleteError} /> : null}

      <Panel>
        {loadError ? (
          <LoadFailed message={loadError} onRetry={retry} />
        ) : isLoading ? (
          <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>
        ) : (
          <DataTable
            rows={projects}
            columns={columns}
            rowKey={(project) => project.id}
            emptyTitle={t('projects.emptyTitle')}
            emptyDescription={t('projects.emptyDescription')}
          />
        )}
      </Panel>
    </>
  );
}
