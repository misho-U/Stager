'use client';

import { useTranslations } from 'next-intl';

import type { AdminStat } from '@/entity/stat/model/stat.model';
import { STAT_VALUE_MAX } from '@/entity/stat/model/stat.model';
import { useAdminCompanyStats } from '@/modules/admin-company-stats/admin-company-stats.service';
import { Button, ButtonLink } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { CheckboxField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, LoadFailed, Panel } from '@/shared/components/panel';

export function AdminCompanyStatsModule() {
  const t = useTranslations('admin');
  const {
    stats,
    isLoading,
    loadError,
    retry,
    form,
    onSubmit,
    editingId,
    startCreate,
    startEdit,
    toggleActive,
    remove,
    isSubmitting,
    isDeleting,
    deletingId,
    formError,
  } = useAdminCompanyStats();

  const { errors } = form.formState;

  const columns: Array<Column<AdminStat>> = [
    {
      key: 'value',
      header: t('companyStats.columns.value'),
      render: (stat) => <span className="text-ink font-medium tabular-nums">{stat.value}</span>,
    },
    {
      key: 'label',
      header: t('companyStats.columns.labelKa'),
      render: (stat) => <span className="text-ink">{stat.translations.KA.label || '—'}</span>,
    },
    {
      key: 'labelEn',
      header: t('companyStats.columns.labelEn'),
      secondary: true,
      render: (stat) => <span className="text-ink-muted">{stat.translations.EN.label || '—'}</span>,
    },
    {
      key: 'active',
      header: t('companyStats.columns.shown'),
      render: (stat) => (
        <Button variant="ghost" size="sm" onClick={() => void toggleActive(stat)}>
          {stat.isActive ? t('common.yes') : t('common.no')}
        </Button>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (stat) => (
        <span className="inline-flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => startEdit(stat)}>
            {t('common.edit')}
          </Button>
          <ConfirmButton
            label={t('common.delete')}
            confirmLabel={t('common.confirm')}
            loading={isDeleting && deletingId === stat.id}
            onConfirm={() => remove(stat.id)}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('companyStats.title')}
        description={t('companyStats.description')}
        actions={
          <ButtonLink href="/admin/pages" variant="ghost">
            {t('companyStats.back')}
          </ButtonLink>
        }
      />

      <Panel
        title={editingId ? t('companyStats.editTitle') : t('companyStats.addTitle')}
        actions={
          editingId ? (
            <Button variant="ghost" size="sm" onClick={startCreate}>
              {t('common.cancelEdit')}
            </Button>
          ) : null
        }
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {formError ? <ErrorNotice message={formError} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('companyStats.value.label')}
              required
              maxLength={STAT_VALUE_MAX}
              placeholder={t('companyStats.value.placeholder')}
              hint={t('companyStats.value.hint')}
              error={errors.value?.message}
              {...form.register('value')}
            />
            <TextField
              label={t('fields.sortOrder.label')}
              type="number"
              hint={t('fields.sortOrder.hint')}
              error={errors.order?.message}
              {...form.register('order', {
                setValueAs: (value: string) => (value === '' ? 0 : Number(value)),
              })}
            />
            <TextField
              label={t('companyStats.labelKa')}
              required
              placeholder={t('companyStats.labelKaPlaceholder')}
              error={errors.translations?.KA?.label?.message}
              {...form.register('translations.KA.label')}
            />
            <TextField
              label={t('companyStats.labelEn')}
              required
              placeholder={t('companyStats.labelEnPlaceholder')}
              error={errors.translations?.EN?.label?.message}
              {...form.register('translations.EN.label')}
            />
          </div>

          <CheckboxField label={t('companyStats.isActive')} {...form.register('isActive')} />

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              {editingId ? t('common.saveChanges') : t('companyStats.add')}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title={t('companyStats.allTitle')}>
        {loadError ? (
          <LoadFailed message={loadError} onRetry={retry} />
        ) : isLoading ? (
          <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>
        ) : (
          <DataTable
            rows={stats}
            columns={columns}
            rowKey={(stat) => stat.id}
            emptyTitle={t('companyStats.emptyTitle')}
            emptyDescription={t('companyStats.emptyDescription')}
          />
        )}
      </Panel>
    </>
  );
}
