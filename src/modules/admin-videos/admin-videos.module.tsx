'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';

import { adminVideosQuery, useDeleteVideo } from '@/entity/video/api/video.query';
import type { AdminVideo } from '@/entity/video/model/video.model';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel, StatusBadge } from '@/shared/components/panel';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useAdminFormat } from '@/shared/lib/use-admin-format';

export function AdminVideosModule() {
  const t = useTranslations('admin');
  const format = useAdminFormat();
  const formErrors = useFormErrors();
  const { data, isLoading, error } = useQuery(adminVideosQuery());
  const deleteVideo = useDeleteVideo();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setDeleteError(null);
    try {
      await deleteVideo.mutateAsync(id);
    } catch (caught) {
      setDeleteError(formErrors.message(caught));
    }
  };

  const columns: Array<Column<AdminVideo>> = [
    {
      key: 'title',
      header: t('videos.columns.video'),
      render: (video) => (
        <span className="flex flex-col">
          <Link
            href={`/admin/videos/${video.id}`}
            className="font-medium text-ink underline-offset-4 hover:underline"
          >
            {video.translations.KA.title || video.translations.EN.title || video.slug}
          </Link>
          {video.youtubeUrl ? null : (
            <span className="text-caption text-ink-subtle">{t('videos.noLink')}</span>
          )}
        </span>
      ),
    },
    {
      key: 'date',
      header: t('videos.columns.date'),
      render: (video) => <span className="text-ink-muted">{format.date(video.publishedAt)}</span>,
    },
    {
      key: 'kind',
      header: t('videos.columns.kind'),
      secondary: true,
      render: (video) => (
        <span className="text-ink-muted">{video.kind ? t(`videoKinds.${video.kind}`) : '—'}</span>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (video) => <StatusBadge status={video.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (video) => (
        <ConfirmButton
          label={t('common.delete')}
          confirmLabel={t('common.confirm')}
          loading={deleteVideo.isPending && deleteVideo.variables === video.id}
          onConfirm={() => remove(video.id)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('videos.title')}
        description={t('videos.description')}
        actions={
          <Link href="/admin/videos/new">
            <Button>{t('videos.new')}</Button>
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
            rowKey={(video) => video.id}
            emptyTitle={t('videos.emptyTitle')}
          />
        )}
      </Panel>
    </>
  );
}
