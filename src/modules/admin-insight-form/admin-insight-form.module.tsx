'use client';

import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { useAdminInsightForm } from '@/modules/admin-insight-form/admin-insight-form.service';
import { Button } from '@/shared/components/button';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { LocaleTabs } from '@/shared/components/locale-tabs';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel } from '@/shared/components/panel';
import { SeoFields } from '@/shared/components/seo-fields';
import { slugify, STATUS_OPTIONS } from '@/shared/constants/content';
import type { DbLocale } from '@/shared/types/enums';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

export function AdminInsightFormModule({ insightId }: { insightId?: string }) {
  const {
    form,
    onSubmit,
    isEdit,
    isLoading,
    isSubmitting,
    submitError,
    categoryOptions,
    authorOptions,
  } = useAdminInsightForm({ insightId });

  const { errors } = form.formState;
  const invalidLocales = (['KA', 'EN'] as const).filter(
    (locale) => errors.translations?.[locale] !== undefined,
  );

  if (isLoading) return <p className="text-body-sm text-ink-subtle">Loading…</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <PageHeader
        title={isEdit ? 'Edit article' : 'New article'}
        actions={
          <>
            <Link href="/admin/insights">
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
                {...form.register(`translations.${locale}.title`, {
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                    if (!isEdit && locale === 'KA' && !form.getValues('slug')) {
                      form.setValue('slug', slugify(event.target.value));
                    }
                  },
                })}
              />
              <TextAreaField
                label="Excerpt"
                rows={2}
                hint="Shown on the Insights list and in search results."
                error={errors.translations?.[locale]?.excerpt?.message}
                {...form.register(`translations.${locale}.excerpt`)}
              />
              <TextAreaField
                label="Body"
                rows={14}
                hint="Basic HTML is allowed; scripts are stripped on save."
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

      <Panel title="Publishing">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Slug"
            required
            error={errors.slug?.message}
            {...form.register('slug')}
          />
          <SelectField label="Status" options={STATUS_OPTIONS} {...form.register('status')} />
          <SelectField
            label="Category"
            placeholder="No category"
            options={categoryOptions}
            {...form.register('categoryId')}
          />
          <SelectField
            label="Author"
            placeholder="No author"
            options={authorOptions}
            hint="Pick from the Team list."
            {...form.register('authorId')}
          />
          <TextField
            label="Reading time (minutes)"
            type="number"
            error={errors.readingMinutes?.message}
            {...form.register('readingMinutes', {
              setValueAs: (value: string) => (value === '' ? null : Number(value)),
            })}
          />
        </div>

        <div className="mt-4">
          <CheckboxField
            label="Show the author on the article"
            hint="Turn this off to publish without naming anyone. The author is then hidden from the API too, not just the page."
            {...form.register('showAuthor')}
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
                hint="Also used as the social sharing image unless one is set per language."
              />
            )}
          />
        </div>
      </Panel>

      <div className="flex justify-end gap-2">
        <Link href="/admin/insights">
          <Button variant="ghost">Cancel</Button>
        </Link>
        <Button type="submit" loading={isSubmitting}>
          Save article
        </Button>
      </div>
    </form>
  );
}
