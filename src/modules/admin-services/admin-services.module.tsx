'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import type { AdminService } from '@/entity/service/model/service.model';
import { adminServicesQuery, useDeleteService } from '@/entity/service/api/service.query';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel, StatusBadge } from '@/shared/components/panel';
import { toFormErrorMessage } from '@/shared/lib/form-errors';

export function AdminServicesModule() {
  const { data, isLoading, error } = useQuery(adminServicesQuery());
  const deleteService = useDeleteService();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setDeleteError(null);
    try {
      await deleteService.mutateAsync(id);
    } catch (caught) {
      setDeleteError(toFormErrorMessage(caught));
    }
  };

  const columns: Array<Column<AdminService>> = [
    {
      key: 'title',
      header: 'Service',
      render: (service) => (
        <Link
          href={`/admin/services/${service.id}`}
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          {service.translations.KA.title || service.translations.EN.title || service.slug}
        </Link>
      ),
    },
    { key: 'status', header: 'Status', render: (service) => <StatusBadge status={service.status} /> },
    {
      key: 'order',
      header: 'Order',
      secondary: true,
      render: (service) => <span className="text-ink-muted">{service.order}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (service) => (
        <ConfirmButton
          label="Delete"
          confirmLabel="Confirm"
          loading={deleteService.isPending && deleteService.variables === service.id}
          onConfirm={() => remove(service.id)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Services"
        description="The service lines listed on the site. Add or edit them without a deploy."
        actions={
          <Link href="/admin/services/new">
            <Button>New service</Button>
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
            rowKey={(service) => service.id}
            emptyTitle="No services yet"
          />
        )}
      </Panel>
    </>
  );
}
