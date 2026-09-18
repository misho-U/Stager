'use client';

import { useAdminCategories } from '@/modules/admin-categories/admin-categories.service';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel } from '@/shared/components/panel';
import type { AdminCategory } from '@/entity/category/model/category.model';

export function AdminCategoriesModule() {
  const {
    categories,
    isLoading,
    loadError,
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
  } = useAdminCategories();

  const { errors } = form.formState;

  const columns: Array<Column<AdminCategory>> = [
    {
      key: 'name',
      header: 'Name (KA)',
      render: (category) => (
        <span className="font-medium text-ink">{category.translations.KA.name || '—'}</span>
      ),
    },
    {
      key: 'nameEn',
      header: 'Name (EN)',
      secondary: true,
      render: (category) => (
        <span className="text-ink-muted">{category.translations.EN.name || '—'}</span>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
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
            Edit
          </Button>
          <ConfirmButton
            label="Delete"
            confirmLabel="Confirm"
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
        title="Categories"
        description="Used to file articles under Insights."
      />

      {loadError ? <ErrorNotice message={loadError} /> : null}

      <Panel
        title={editingId ? 'Edit category' : 'Add a category'}
        actions={
          editingId ? (
            <Button variant="ghost" size="sm" onClick={startCreate}>
              Cancel edit
            </Button>
          ) : null
        }
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {formError ? <ErrorNotice message={formError} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Name (Georgian)"
              required
              error={errors.translations?.KA?.name?.message}
              {...form.register('translations.KA.name')}
            />
            <TextField
              label="Name (English)"
              required
              error={errors.translations?.EN?.name?.message}
              {...form.register('translations.EN.name')}
            />
            <TextField
              label="Slug"
              required
              error={errors.slug?.message}
              {...form.register('slug')}
            />
            <TextField
              label="Sort order"
              type="number"
              {...form.register('order', {
                setValueAs: (value: string) => (value === '' ? 0 : Number(value)),
              })}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              {editingId ? 'Save changes' : 'Add category'}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="All categories">
        {isLoading ? (
          <p className="text-body-sm text-ink-subtle">Loading…</p>
        ) : (
          <DataTable
            rows={categories}
            columns={columns}
            rowKey={(category) => category.id}
            emptyTitle="No categories yet"
            emptyDescription="Articles can be published without one."
          />
        )}
      </Panel>
    </>
  );
}
