'use client';

import Link from 'next/link';

import { useAdminProjects } from '@/modules/admin-projects/admin-projects.service';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel, StatusBadge } from '@/shared/components/panel';
import type { AdminProject } from '@/entity/project/model/project.model';

export function AdminProjectsModule() {
  const { projects, isLoading, loadError, remove, isDeleting, deletingId, deleteError } =
    useAdminProjects();

  const columns: Array<Column<AdminProject>> = [
    {
      key: 'title',
      header: 'Title',
      render: (project) => (
        <Link
          href={`/admin/projects/${project.id}`}
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          {project.translations.KA.title || project.translations.EN.title || project.slug}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (project) => <StatusBadge status={project.status} />,
    },
    {
      key: 'year',
      header: 'Year',
      secondary: true,
      render: (project) => <span className="text-ink-muted">{project.year ?? '—'}</span>,
    },
    {
      key: 'featured',
      header: 'Featured',
      secondary: true,
      render: (project) => (
        <span className="text-ink-muted">{project.featured ? 'Yes' : '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (project) => (
        <ConfirmButton
          label="Delete"
          confirmLabel="Confirm"
          loading={isDeleting && deletingId === project.id}
          onConfirm={() => remove(project.id)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Projects"
        description="Case studies shown on the public site."
        actions={
          <Link href="/admin/projects/new">
            <Button>New project</Button>
          </Link>
        }
      />

      {loadError ? <ErrorNotice message={loadError} /> : null}
      {deleteError ? <ErrorNotice message={deleteError} /> : null}

      <Panel>
        {isLoading ? (
          <p className="text-body-sm text-ink-subtle">Loading…</p>
        ) : (
          <DataTable
            rows={projects}
            columns={columns}
            rowKey={(project) => project.id}
            emptyTitle="No projects yet"
            emptyDescription="Add your first case study to show it on the site."
          />
        )}
      </Panel>
    </>
  );
}
