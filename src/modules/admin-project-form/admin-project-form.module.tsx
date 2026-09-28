'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { useAdminProjectForm } from '@/modules/admin-project-form/admin-project-form.service';
import { slugify } from '@/shared/constants/content';
import { Button } from '@/shared/components/button';
import {
  ContentLocaleProvider,
  ContentLocaleToggle,
  TranslatedFields,
} from '@/shared/components/content-locale';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel } from '@/shared/components/panel';
import { SeoFields } from '@/shared/components/seo-fields';
import { toOptionalNumber } from '@/shared/lib/form-values';
import { useStatusOptions } from '@/shared/lib/use-enum-options';
import type { DbLocale } from '@/shared/types/enums';
import { MediaGalleryPicker } from '@/widgets/media-gallery-picker/media-gallery-picker.module';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

export function AdminProjectFormModule({ projectId }: { projectId?: string }) {
  const t = useTranslations('admin');
  const statusOptions = useStatusOptions();
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

  const { errors, submitCount } = form.formState;

  if (isLoading) {
    return <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>;
  }

  return (
    <ContentLocaleProvider errors={errors} submitCount={submitCount}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <PageHeader
          title={isEdit ? t('projects.form.titleEdit') : t('projects.form.titleNew')}
          description={t('projects.form.description')}
          actions={
            <>
              <Link href="/admin/projects">
                <Button variant="ghost">{t('common.cancel')}</Button>
              </Link>
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? t('common.saving') : t('common.save')}
              </Button>
            </>
          }
        />

        <ContentLocaleToggle />

        {loadError ? <ErrorNotice message={loadError} /> : null}
        {submitError ? <ErrorNotice message={submitError} /> : null}

        <Panel title={t('fields.contentPanel')} description={t('fields.bothLanguages')}>
          <TranslatedFields>
            {(locale: DbLocale) => (
              <>
                <TextField
                  label={t('fields.title')}
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
                  label={t('projects.form.summary.label')}
                  rows={3}
                  hint={t('projects.form.summary.hint')}
                  error={errors.translations?.[locale]?.summary?.message}
                  {...form.register(`translations.${locale}.summary`)}
                />

                <TextAreaField
                  label={t('fields.body')}
                  rows={10}
                  hint={t('projects.form.bodyHint')}
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
          </TranslatedFields>
        </Panel>

        <Panel title={t('projects.form.mediaPanel')}>
          <div className="flex flex-col gap-5">
            <Controller
              control={form.control}
              name="coverMediaId"
              render={({ field }) => (
                <MediaPicker
                  label={t('fields.coverImage')}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  hint={t('projects.form.coverHint')}
                />
              )}
            />

            <Controller
              control={form.control}
              name="galleryMediaIds"
              render={({ field }) => (
                <MediaGalleryPicker
                  label={t('projects.form.gallery')}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />

            <TextField
              label={t('projects.form.youtube.label')}
              placeholder={t('projects.form.youtube.placeholder')}
              hint={t('projects.form.youtube.hint')}
              error={errors.youtubeUrl?.message}
              {...form.register('youtubeUrl')}
            />
          </div>
        </Panel>

        <Panel title={t('fields.detailsPanel')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('fields.slug.label')}
              required
              hint={t('fields.slug.hint')}
              error={errors.slug?.message}
              {...form.register('slug')}
            />

            <SelectField
              label={t('fields.status')}
              options={statusOptions}
              error={errors.status?.message}
              {...form.register('status')}
            />

            <TextField label={t('projects.form.client')} {...form.register('client')} />
            <TextField label={t('projects.form.location')} {...form.register('location')} />

            <TextField
              label={t('projects.form.year')}
              type="number"
              error={errors.year?.message}
              {...form.register('year', { setValueAs: toOptionalNumber })}
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

          <div className="mt-4 flex flex-col gap-3">
            <CheckboxField
              label={t('projects.form.featured.label')}
              hint={t('projects.form.featured.hint')}
              {...form.register('featured')}
            />
          </div>
        </Panel>

        <Panel
          title={t('projects.form.services.title')}
          description={t('projects.form.services.description')}
        >
          {services.length === 0 ? (
            <p className="text-body-sm text-ink-subtle">{t('projects.form.services.empty')}</p>
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
            <Button variant="ghost">{t('common.cancel')}</Button>
          </Link>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('projects.form.submit')}
          </Button>
        </div>
      </form>
    </ContentLocaleProvider>
  );
}
