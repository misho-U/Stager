'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { useAdminCourseForm } from '@/modules/admin-course-form/admin-course-form.service';
import { Button } from '@/shared/components/button';
import {
  ContentLocaleProvider,
  ContentLocaleToggle,
  TranslatedFields,
} from '@/shared/components/content-locale';
import { SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, LoadFailed, Panel } from '@/shared/components/panel';
import { toOptionalNumber } from '@/shared/lib/form-values';
import { useCourseFormatOptions, useStatusOptions } from '@/shared/lib/use-enum-options';
import type { DbLocale } from '@/shared/types/enums';
import { useUnsavedChangesGuard } from '@/shared/lib/use-unsaved-changes-guard';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

export function AdminCourseFormModule({ courseId }: { courseId?: string }) {
  const t = useTranslations('admin');
  const statusOptions = useStatusOptions();
  const formatOptions = useCourseFormatOptions();
  const {
    form,
    onSubmit,
    isEdit,
    isLoading,
    loadError,
    retry,
    isSubmitting,
    submitError,
    categoryOptions,
    serviceOptions,
    slugAutofill,
  } = useAdminCourseForm({ courseId });

  const { errors, submitCount, isDirty } = form.formState;
  useUnsavedChangesGuard(isDirty, t('common.unsavedChanges'));

  if (isLoading) return <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>;
  // Its blank fields would be saved over the record: no form until it loads.
  if (loadError) return <LoadFailed message={loadError} onRetry={retry} />;

  return (
    <ContentLocaleProvider errors={errors} submitCount={submitCount}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <PageHeader
          title={isEdit ? t('courses.form.titleEdit') : t('courses.form.titleNew')}
          actions={
            <>
              <Link href="/admin/courses">
                <Button variant="ghost">{t('common.cancel')}</Button>
              </Link>
              <Button type="submit" loading={isSubmitting}>
                {t('common.save')}
              </Button>
            </>
          }
        />

        <ContentLocaleToggle />

        {submitError ? <ErrorNotice message={submitError} /> : null}

        <Panel title={t('fields.contentPanel')}>
          <TranslatedFields>
            {(locale: DbLocale) => (
              <>
                <TextField
                  label={t('fields.title')}
                  required
                  error={errors.translations?.[locale]?.title?.message}
                  {...form.register(`translations.${locale}.title`, {
                    onChange: locale === 'EN' ? slugAutofill.followTitle : undefined,
                  })}
                />
                <TextAreaField
                  label={t('courses.form.summary.label')}
                  rows={3}
                  hint={t('courses.form.summary.hint')}
                  error={errors.translations?.[locale]?.summary?.message}
                  {...form.register(`translations.${locale}.summary`)}
                />
                <TextField
                  label={t('courses.form.duration.label')}
                  hint={t('courses.form.duration.hint')}
                  error={errors.translations?.[locale]?.duration?.message}
                  {...form.register(`translations.${locale}.duration`)}
                />
                <TextField
                  label={t('courses.form.location.label')}
                  hint={t('courses.form.location.hint')}
                  error={errors.translations?.[locale]?.location?.message}
                  {...form.register(`translations.${locale}.location`)}
                />
              </>
            )}
          </TranslatedFields>
        </Panel>

        <Panel title={t('courses.form.schedulePanel')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('courses.form.startsAt.label')}
              type="date"
              hint={t('courses.form.startsAt.hint')}
              error={errors.startsAt?.message}
              {...form.register('startsAt')}
            />
            <SelectField
              label={t('courses.form.format')}
              options={formatOptions}
              {...form.register('format')}
            />
            <TextField
              label={t('courses.form.seatsTotal.label')}
              type="number"
              min={1}
              hint={t('courses.form.seatsTotal.hint')}
              error={errors.seatsTotal?.message}
              {...form.register('seatsTotal', { setValueAs: toOptionalNumber })}
            />
            <TextField
              label={t('courses.form.seatsLeft.label')}
              type="number"
              min={0}
              hint={t('courses.form.seatsLeft.hint')}
              error={errors.seatsLeft?.message}
              {...form.register('seatsLeft', { setValueAs: toOptionalNumber })}
            />
            <TextField
              label={t('courses.form.price.label')}
              type="number"
              min={0}
              hint={t('courses.form.price.hint')}
              error={errors.priceGel?.message}
              {...form.register('priceGel', { setValueAs: toOptionalNumber })}
            />
          </div>
        </Panel>

        <Panel title={t('fields.detailsPanel')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('fields.slug.label')}
              required
              hint={
                isEdit
                  ? t('fields.slug.hint')
                  : `${t('fields.slug.hint')} ${t('fields.slug.autoFromTitle')}`
              }
              error={errors.slug?.message}
              {...form.register('slug', { onChange: slugAutofill.slugEdited })}
            />
            <SelectField
              label={t('fields.status')}
              options={statusOptions}
              {...form.register('status')}
            />
            <SelectField
              label={t('courses.form.category.label')}
              placeholder={t('courses.form.category.none')}
              options={categoryOptions}
              hint={t('courses.form.category.hint')}
              {...form.register('categoryId')}
            />
            <SelectField
              label={t('courses.form.service.label')}
              placeholder={t('courses.form.service.none')}
              options={serviceOptions}
              hint={t('courses.form.service.hint')}
              {...form.register('serviceId')}
            />
          </div>

          <div className="mt-5">
            <Controller
              control={form.control}
              name="coverMediaId"
              render={({ field }) => (
                <MediaPicker
                  label={t('fields.coverImage')}
                  value={field.value ?? null}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </Panel>

        <div className="flex justify-end gap-2">
          <Link href="/admin/courses">
            <Button variant="ghost">{t('common.cancel')}</Button>
          </Link>
          <Button type="submit" loading={isSubmitting}>
            {t('courses.form.submit')}
          </Button>
        </div>
      </form>
    </ContentLocaleProvider>
  );
}
