'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';

import {
  adminTeamMembersQuery,
  useDeleteTeamMember,
} from '@/entity/team-member/api/team-member.query';
import type { AdminTeamMember } from '@/entity/team-member/model/team-member.model';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel, StatusBadge } from '@/shared/components/panel';
import { useFormErrors } from '@/shared/lib/form-errors';

export function AdminTeamModule() {
  const t = useTranslations('admin');
  const formErrors = useFormErrors();
  const { data, isLoading, error } = useQuery(adminTeamMembersQuery());
  const deleteMember = useDeleteTeamMember();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setDeleteError(null);
    try {
      await deleteMember.mutateAsync(id);
    } catch (caught) {
      setDeleteError(formErrors.message(caught));
    }
  };

  const columns: Array<Column<AdminTeamMember>> = [
    {
      key: 'name',
      header: t('team.columns.name'),
      render: (member) => (
        <Link
          href={`/admin/team/${member.id}`}
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          {member.translations.KA.name || member.translations.EN.name || member.slug}
        </Link>
      ),
    },
    {
      key: 'position',
      header: t('team.columns.position'),
      secondary: true,
      render: (member) => (
        <span className="text-ink-muted">
          {member.translations.KA.position || member.translations.EN.position || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (member) => <StatusBadge status={member.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (member) => (
        <ConfirmButton
          label={t('common.delete')}
          confirmLabel={t('common.confirm')}
          loading={deleteMember.isPending && deleteMember.variables === member.id}
          onConfirm={() => remove(member.id)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('team.title')}
        description={t('team.description')}
        actions={
          <Link href="/admin/team/new">
            <Button>{t('team.new')}</Button>
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
            rowKey={(member) => member.id}
            emptyTitle={t('team.emptyTitle')}
          />
        )}
      </Panel>
    </>
  );
}
