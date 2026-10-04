'use client';

import { useTranslations } from 'next-intl';

import { useAdminCourseCategories } from '@/modules/admin-course-categories/admin-course-categories.service';
import { Button, ButtonLink } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, LoadFailed, Panel } from '@/shared/components/panel';
import type { AdminCourseCategory } from '@/entity/course-category/model/course-category.model';

export function AdminCourseCategoriesModule() {
  const t = useTranslations('admin');
  const {
    categories,
    isLoading,
    loadError,
    retry,
    form,
    onSubmit,
    editingId,
    startCreate,
    startEdit,
    remove,
    isSubmitting,
    isDeleting,
    deletingId,
    formError,
    slugAutofill,
  } = useAdminCourseCategories();

  const { errors } = form.formState;

  const columns: Array<Column<AdminCourseCategory>> = [
    {
      key: 'name',
      header: t('categories.columns.nameKa'),
      render: (category) => (
        <span className="text-ink font-medium">{category.translations.KA.name || '—'}</span>
      ),
    },
    {
      key: 'nameEn',
      header: t('categories.columns.nameEn'),
      secondary: true,
      render: (category) => (
        <span className="text-ink-muted">{category.translations.EN.name || '—'}</span>
      ),
    },
    {
      key: 'slug',
      header: t('fields.slug.label'),
      secondary: true,
      render: (category) => <code className="text-caption text-ink-subtle">{category.slug}</code>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (category) => (
        <span className="inline-flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => startEdit(category)}>
            {t('common.edit')}
          </Button>
          <ConfirmButton
            label={t('common.delete')}
            confirmLabel={t('common.confirm')}
            loading={isDeleting && deletingId === category.id}
            onConfirm={() => remove(category.id)}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('courseCategories.title')}
        description={t('courseCategories.description')}
        actions={
          <ButtonLink href="/admin/courses" variant="ghost">
            {t('courseCategories.back')}
          </ButtonLink>
        }
      />

      <Panel
        title={editingId ? t('courseCategories.editTitle') : t('courseCategories.addTitle')}
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
              label={t('categories.nameKa')}
              required
              error={errors.translations?.KA?.name?.message}
              {...form.register('translations.KA.name')}
            />
            <TextField
              label={t('categories.nameEn')}
              required
              error={errors.translations?.EN?.name?.message}
              {...form.register('translations.EN.name', { onChange: slugAutofill.followTitle })}
            />
            <TextField
              label={t('fields.slug.label')}
              required
              hint={
                editingId
                  ? t('fields.slug.hint')
                  : `${t('fields.slug.hint')} ${t('fields.slug.autoFromName')}`
              }
              error={errors.slug?.message}
              {...form.register('slug', { onChange: slugAutofill.slugEdited })}
            />
            <TextField
              label={t('fields.sortOrder.label')}
              hint={t('fields.sortOrder.hint')}
              type="number"
              {...form.register('order', {
                setValueAs: (value: string) => (value === '' ? 0 : Number(value)),
              })}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              {editingId ? t('common.saveChanges') : t('courseCategories.add')}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title={t('courseCategories.allTitle')}>
        {loadError ? (
          <LoadFailed message={loadError} onRetry={retry} />
        ) : isLoading ? (
          <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>
        ) : (
          <DataTable
            rows={categories}
            columns={columns}
            rowKey={(category) => category.id}
            emptyTitle={t('courseCategories.emptyTitle')}
            emptyDescription={t('courseCategories.emptyDescription')}
          />
        )}
      </Panel>
    </>
  );
}
