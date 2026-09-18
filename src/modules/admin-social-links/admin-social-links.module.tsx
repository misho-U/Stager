'use client';

import type { AdminSocialLink } from '@/entity/social-link/model/social-link.model';
import { useAdminSocialLinks } from '@/modules/admin-social-links/admin-social-links.service';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { CheckboxField, SelectField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel } from '@/shared/components/panel';
import { SOCIAL_PLATFORM_OPTIONS } from '@/shared/constants/content';

export function AdminSocialLinksModule() {
  const {
    links,
    isLoading,
    loadError,
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
      header: 'Platform',
      render: (link) => <span className="font-medium text-ink">{link.platform}</span>,
    },
    {
      key: 'url',
      header: 'URL',
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
      header: 'Shown',
      render: (link) => (
        <Button variant="ghost" size="sm" onClick={() => void toggleActive(link)}>
          {link.isActive ? 'Yes' : 'No'}
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
            Edit
          </Button>
          <ConfirmButton
            label="Delete"
            confirmLabel="Confirm"
            loading={isDeleting && deletingId === link.id}
            onConfirm={() => remove(link.id)}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Social links"
        description="Shown in the footer. Turn one off instead of deleting it if the account is only paused."
      />

      {loadError ? <ErrorNotice message={loadError} /> : null}

      <Panel
        title={editingId ? 'Edit link' : 'Add a link'}
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
            <SelectField
              label="Platform"
              options={SOCIAL_PLATFORM_OPTIONS}
              {...form.register('platform')}
            />
            <TextField
              label="URL"
              required
              placeholder="https://instagram.com/stager"
              error={errors.url?.message}
              {...form.register('url')}
            />
            <TextField
              label="Label"
              hint="Optional. Falls back to the platform name."
              {...form.register('label')}
            />
            <TextField
              label="Sort order"
              type="number"
              {...form.register('order', {
                setValueAs: (value: string) => (value === '' ? 0 : Number(value)),
              })}
            />
          </div>

          <CheckboxField label="Show on the site" {...form.register('isActive')} />

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              {editingId ? 'Save changes' : 'Add link'}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="All links">
        {isLoading ? (
          <p className="text-body-sm text-ink-subtle">Loading…</p>
        ) : (
          <DataTable
            rows={links}
            columns={columns}
            rowKey={(link) => link.id}
            emptyTitle="No social links yet"
          />
        )}
      </Panel>
    </>
  );
}
