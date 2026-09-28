'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';

import type { AdminService } from '@/entity/service/model/service.model';
import { adminServicesQuery, useDeleteService } from '@/entity/service/api/service.query';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel, StatusBadge } from '@/shared/components/panel';
import { useFormErrors } from '@/shared/lib/form-errors';

export function AdminServicesModule() {
  const t = useTranslations('admin');
  const formErrors = useFormErrors();
  const { data, isLoading, error } = useQuery(adminServicesQuery());
  const deleteService = useDeleteService();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setDeleteError(null);
    try {
      await deleteService.mutateAsync(id);
    } catch (caught) {
      setDeleteError(formErrors.message(caught));
    }
  };

  const columns: Array<Column<AdminService>> = [
    {
      key: 'title',
      header: t('services.columns.service'),
      render: (service) => (
        <Link
          href={`/admin/services/${service.id}`}
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          {service.translations.KA.title || service.translations.EN.title || service.slug}
        </Link>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (service) => <StatusBadge status={service.status} />,
    },
    {
      key: 'order',
      header: t('columns.order'),
      secondary: true,
      render: (service) => <span className="text-ink-muted">{service.order}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (service) => (
        <ConfirmButton
          label={t('common.delete')}
          confirmLabel={t('common.confirm')}
          loading={deleteService.isPending && deleteService.variables === service.id}
          onConfirm={() => remove(service.id)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('services.title')}
        description={t('services.description')}
        actions={
          <Link href="/admin/services/new">
            <Button>{t('services.new')}</Button>
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
            rowKey={(service) => service.id}
            emptyTitle={t('services.emptyTitle')}
          />
        )}
      </Panel>
    </>
  );
}
