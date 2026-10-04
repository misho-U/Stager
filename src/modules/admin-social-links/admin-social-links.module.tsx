'use client';

import { useTranslations } from 'next-intl';

import type { AdminSocialLink } from '@/entity/social-link/model/social-link.model';
import { useAdminSocialLinks } from '@/modules/admin-social-links/admin-social-links.service';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { CheckboxField, SelectField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, LoadFailed, Panel } from '@/shared/components/panel';
import { useSocialPlatformOptions } from '@/shared/lib/use-enum-options';

export function AdminSocialLinksModule() {
  const t = useTranslations('admin');
  const platformOptions = useSocialPlatformOptions();
  const {
    links,
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
  } = useAdminSocialLinks();

  const { errors } = form.formState;

  const columns: Array<Column<AdminSocialLink>> = [
    {
      key: 'platform',
      header: t('socialLinks.columns.platform'),
      render: (link) => (
        <span className="text-ink font-medium">{t(`platforms.${link.platform}`)}</span>
      ),
    },
    {
      key: 'url',
      header: t('socialLinks.columns.url'),
      secondary: true,
      render: (link) => (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-muted underline underline-offset-4"
        >
          {link.url}
        </a>
      ),
    },
    {
      key: 'active',
      header: t('socialLinks.columns.shown'),
      render: (link) => (
        <Button variant="ghost" size="sm" onClick={() => void toggleActive(link)}>
          {link.isActive ? t('common.yes') : t('common.no')}
        </Button>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (link) => (
        <span className="inline-flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => startEdit(link)}>
            {t('common.edit')}
          </Button>
          <ConfirmButton
            label={t('common.delete')}
            confirmLabel={t('common.confirm')}
            loading={isDeleting && deletingId === link.id}
            onConfirm={() => remove(link.id)}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t('socialLinks.title')} description={t('socialLinks.description')} />

      <Panel
        title={editingId ? t('socialLinks.editTitle') : t('socialLinks.addTitle')}
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
            <SelectField
              label={t('socialLinks.platform')}
              options={platformOptions}
              {...form.register('platform')}
            />
            <TextField
              label={t('socialLinks.url')}
              required
              placeholder={t('socialLinks.urlPlaceholder')}
              error={errors.url?.message}
              {...form.register('url')}
            />
            <TextField
              label={t('socialLinks.label.label')}
              hint={t('socialLinks.label.hint')}
              error={errors.label?.message}
              {...form.register('label')}
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
          </div>

          <CheckboxField label={t('socialLinks.isActive')} {...form.register('isActive')} />

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              {editingId ? t('common.saveChanges') : t('socialLinks.add')}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title={t('socialLinks.allTitle')}>
        {loadError ? (
          <LoadFailed message={loadError} onRetry={retry} />
        ) : isLoading ? (
          <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>
        ) : (
          <DataTable
            rows={links}
            columns={columns}
            rowKey={(link) => link.id}
            emptyTitle={t('socialLinks.emptyTitle')}
          />
        )}
      </Panel>
    </>
  );
}
