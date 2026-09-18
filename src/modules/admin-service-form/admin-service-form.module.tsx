'use client';

import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { useAdminServiceForm } from '@/modules/admin-service-form/admin-service-form.service';
import { STATUS_OPTIONS } from '@/shared/constants/content';
import { Button } from '@/shared/components/button';
import { SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { LocaleTabs } from '@/shared/components/locale-tabs';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel } from '@/shared/components/panel';
import { SeoFields } from '@/shared/components/seo-fields';
import type { DbLocale } from '@/shared/types/enums';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

export function AdminServiceFormModule({ serviceId }: { serviceId?: string }) {
  const { form, onSubmit, isEdit, isLoading, isSubmitting, submitError } = useAdminServiceForm({
    serviceId,
  });

  const { errors } = form.formState;
  const invalidLocales = (['KA', 'EN'] as const).filter(
    (locale) => errors.translations?.[locale] !== undefined,
  );

  if (isLoading) return <p className="text-body-sm text-ink-subtle">Loading…</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <PageHeader
        title={isEdit ? 'Edit service' : 'New service'}
        actions={
          <>
            <Link href="/admin/services">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </>
        }
      />

      {submitError ? <ErrorNotice message={submitError} /> : null}

      <Panel title="Content">
        <LocaleTabs invalidLocales={invalidLocales}>
          {(locale: DbLocale) => (
            <>
              <TextField
                label="Title"
                required
                error={errors.translations?.[locale]?.title?.message}
                {...form.register(`translations.${locale}.title`)}
              />
              <TextAreaField
                label="Short description"
                rows={2}
                hint="Shown on the services list."
                error={errors.translations?.[locale]?.shortDescription?.message}
                {...form.register(`translations.${locale}.shortDescription`)}
              />
              <TextAreaField
                label="Body"
                rows={8}
                error={errors.translations?.[locale]?.body?.message}
                {...form.register(`translations.${locale}.body`)}
              />
              <SeoFields
                metaTitle={form.register(`translations.${locale}.metaTitle`)}
                metaDescription={form.register(`translations.${locale}.metaDescription`)}
                errors={{
                  metaTitle: errors.translations?.[locale]?.metaTitle?.message,
                  metaDescription: errors.translations?.[locale]?.metaDescription?.message,
                }}
              />
            </>
          )}
        </LocaleTabs>
      </Panel>

      <Panel title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Slug"
            required
            error={errors.slug?.message}
            {...form.register('slug')}
          />
          <SelectField label="Status" options={STATUS_OPTIONS} {...form.register('status')} />
          <TextField
            label="Icon key"
            hint="Matches an icon component in the codebase. Leave blank for none."
            {...form.register('icon')}
          />
          <TextField
            label="Sort order"
            type="number"
            {...form.register('order', {
              setValueAs: (value: string) => (value === '' ? 0 : Number(value)),
            })}
          />
        </div>

        <div className="mt-5">
          <Controller
            control={form.control}
            name="coverMediaId"
            render={({ field }) => (
              <MediaPicker
                label="Cover image"
                value={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </Panel>

      <div className="flex justify-end gap-2">
        <Link href="/admin/services">
          <Button variant="ghost">Cancel</Button>
        </Link>
        <Button type="submit" loading={isSubmitting}>
          Save service
        </Button>
      </div>
    </form>
  );
}
