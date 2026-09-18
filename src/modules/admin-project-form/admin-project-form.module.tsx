'use client';

import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { useAdminProjectForm } from '@/modules/admin-project-form/admin-project-form.service';
import { slugify, STATUS_OPTIONS } from '@/shared/constants/content';
import { Button } from '@/shared/components/button';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { LocaleTabs } from '@/shared/components/locale-tabs';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel } from '@/shared/components/panel';
import { SeoFields } from '@/shared/components/seo-fields';
import type { DbLocale } from '@/shared/types/enums';
import { MediaGalleryPicker } from '@/widgets/media-gallery-picker/media-gallery-picker.module';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

export function AdminProjectFormModule({ projectId }: { projectId?: string }) {
  const {
    form,
    onSubmit,
    isEdit,
    isLoading,
    loadError,
    isSubmitting,
    submitError,
    services,
  } = useAdminProjectForm({ projectId });

  const { errors } = form.formState;

  const invalidLocales = (['KA', 'EN'] as const).filter(
    (locale) => errors.translations?.[locale] !== undefined,
  );

  if (isLoading) {
    return <p className="text-body-sm text-ink-subtle">Loading…</p>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <PageHeader
        title={isEdit ? 'Edit project' : 'New project'}
        description="Case study shown in the Projects section."
        actions={
          <>
            <Link href="/admin/projects">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      />

      {loadError ? <ErrorNotice message={loadError} /> : null}
      {submitError ? <ErrorNotice message={submitError} /> : null}

      <Panel title="Content" description="Both languages are required.">
        <LocaleTabs invalidLocales={invalidLocales}>
          {(locale: DbLocale) => (
            <>
              <TextField
                label="Title"
                required
                error={errors.translations?.[locale]?.title?.message}
                {...form.register(`translations.${locale}.title`, {
                  // Auto-fill the slug from the Georgian title, but only while
                  // creating: changing it later would break existing links.
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                    if (!isEdit && locale === 'KA' && !form.getValues('slug')) {
                      form.setValue('slug', slugify(event.target.value));
                    }
                  },
                })}
              />

              <TextAreaField
                label="Summary"
                rows={3}
                hint="One or two sentences, shown on the projects grid."
                error={errors.translations?.[locale]?.summary?.message}
                {...form.register(`translations.${locale}.summary`)}
              />

              <TextAreaField
                label="Body"
                rows={10}
                hint="The full write-up. Basic HTML is allowed; scripts are stripped on save."
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

      <Panel title="Images and video">
        <div className="flex flex-col gap-5">
          <Controller
            control={form.control}
            name="coverMediaId"
            render={({ field }) => (
              <MediaPicker
                label="Cover image"
                value={field.value ?? null}
                onChange={field.onChange}
                hint="Used on the projects grid and as the social sharing image."
              />
            )}
          />

          <Controller
            control={form.control}
            name="galleryMediaIds"
            render={({ field }) => (
              <MediaGalleryPicker
                label="Gallery"
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />

          <TextField
            label="YouTube link"
            placeholder="https://www.youtube.com/watch?v=…"
            hint="Optional. Videos are embedded from YouTube rather than hosted, so pages stay fast."
            error={errors.youtubeUrl?.message}
            {...form.register('youtubeUrl')}
          />
        </div>
      </Panel>

      <Panel title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Slug"
            required
            hint="The URL for this project. Lowercase letters, numbers and hyphens."
            error={errors.slug?.message}
            {...form.register('slug')}
          />

          <SelectField
            label="Status"
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...form.register('status')}
          />

          <TextField label="Client" {...form.register('client')} />
          <TextField label="Location" {...form.register('location')} />

          <TextField
            label="Year"
            type="number"
            error={errors.year?.message}
            {...form.register('year', {
              setValueAs: (value: string) => (value === '' ? null : Number(value)),
            })}
          />

          <TextField
            label="Sort order"
            type="number"
            hint="Lower numbers appear first."
            error={errors.order?.message}
            {...form.register('order', {
              setValueAs: (value: string) => (value === '' ? 0 : Number(value)),
            })}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <CheckboxField
            label="Featured"
            hint="Featured projects are listed before the rest."
            {...form.register('featured')}
          />
        </div>
      </Panel>

      <Panel title="Services" description="Which service lines this project demonstrates.">
        {services.length === 0 ? (
          <p className="text-body-sm text-ink-subtle">No services defined yet.</p>
        ) : (
          <Controller
            control={form.control}
            name="serviceIds"
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                {services.map((service) => {
                  const selected = (field.value ?? []).includes(service.id);
                  return (
                    <CheckboxField
                      key={service.id}
                      label={
                        service.translations.KA.title ||
                        service.translations.EN.title ||
                        service.slug
                      }
                      checked={selected}
                      onChange={() =>
                        field.onChange(
                          selected
                            ? (field.value ?? []).filter((id: string) => id !== service.id)
                            : [...(field.value ?? []), service.id],
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          />
        )}
      </Panel>

      <div className="flex justify-end gap-2">
        <Link href="/admin/projects">
          <Button variant="ghost">Cancel</Button>
        </Link>
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save project'}
        </Button>
      </div>
    </form>
  );
}
