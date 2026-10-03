'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { useAdminInsightForm } from '@/modules/admin-insight-form/admin-insight-form.service';
import { Button } from '@/shared/components/button';
import {
  ContentLocaleProvider,
  ContentLocaleToggle,
  TranslatedFields,
} from '@/shared/components/content-locale';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, LoadFailed, Panel } from '@/shared/components/panel';
import { SeoFields } from '@/shared/components/seo-fields';
import { toOptionalNumber } from '@/shared/lib/form-values';
import { useStatusOptions } from '@/shared/lib/use-enum-options';
import type { DbLocale } from '@/shared/types/enums';
import { useUnsavedChangesGuard } from '@/shared/lib/use-unsaved-changes-guard';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

export function AdminInsightFormModule({ insightId }: { insightId?: string }) {
  const t = useTranslations('admin');
  const statusOptions = useStatusOptions();
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
    authorOptions,
    slugAutofill,
  } = useAdminInsightForm({ insightId });

  const { errors, submitCount, isDirty } = form.formState;
  useUnsavedChangesGuard(isDirty, t('common.unsavedChanges'));

  if (isLoading) return <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>;
  // Its blank fields would be saved over the record: no form until it loads.
  if (loadError) return <LoadFailed message={loadError} onRetry={retry} />;

  return (
    <ContentLocaleProvider errors={errors} submitCount={submitCount}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <PageHeader
          title={isEdit ? t('insights.form.titleEdit') : t('insights.form.titleNew')}
          actions={
            <>
              <Link href="/admin/insights">
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
                  label={t('insights.form.excerpt.label')}
                  rows={2}
                  hint={t('insights.form.excerpt.hint')}
                  error={errors.translations?.[locale]?.excerpt?.message}
                  {...form.register(`translations.${locale}.excerpt`)}
                />
                <TextAreaField
                  label={t('fields.body')}
                  rows={14}
                  hint={t('fields.bodyHint')}
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

        <Panel title={t('insights.form.publishingPanel')}>
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
              label={t('insights.form.category.label')}
              placeholder={t('insights.form.category.none')}
              options={categoryOptions}
              {...form.register('categoryId')}
            />
            <SelectField
              label={t('insights.form.author.label')}
              placeholder={t('insights.form.author.none')}
              options={authorOptions}
              hint={t('insights.form.author.hint')}
              {...form.register('authorId')}
            />
            <TextField
              label={t('insights.form.readingMinutes')}
              type="number"
              error={errors.readingMinutes?.message}
              {...form.register('readingMinutes', { setValueAs: toOptionalNumber })}
            />
          </div>

          <div className="mt-4">
            <CheckboxField
              label={t('insights.form.showAuthor.label')}
              hint={t('insights.form.showAuthor.hint')}
              {...form.register('showAuthor')}
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
                  hint={t('insights.form.coverHint')}
                />
              )}
            />
          </div>
        </Panel>

        <div className="flex justify-end gap-2">
          <Link href="/admin/insights">
            <Button variant="ghost">{t('common.cancel')}</Button>
          </Link>
          <Button type="submit" loading={isSubmitting}>
            {t('insights.form.submit')}
          </Button>
        </div>
      </form>
    </ContentLocaleProvider>
  );
}
