'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { useAdminServiceForm } from '@/modules/admin-service-form/admin-service-form.service';
import { Button } from '@/shared/components/button';
import {
  ContentLocaleProvider,
  ContentLocaleToggle,
  TranslatedFields,
} from '@/shared/components/content-locale';
import { SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel } from '@/shared/components/panel';
import { SeoFields } from '@/shared/components/seo-fields';
import { useStatusOptions } from '@/shared/lib/use-enum-options';
import type { DbLocale } from '@/shared/types/enums';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

export function AdminServiceFormModule({ serviceId }: { serviceId?: string }) {
  const t = useTranslations('admin');
  const statusOptions = useStatusOptions();
  const {
    form,
    onSubmit,
    isEdit,
    isLoading,
    isSubmitting,
    submitError,
    slugAutofill,
  } = useAdminServiceForm({ serviceId });

  const { errors, submitCount } = form.formState;

  if (isLoading) return <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>;

  return (
    <ContentLocaleProvider errors={errors} submitCount={submitCount}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <PageHeader
          title={isEdit ? t('services.form.titleEdit') : t('services.form.titleNew')}
          actions={
            <>
              <Link href="/admin/services">
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
                  label={t('services.form.shortDescription.label')}
                  rows={2}
                  hint={t('services.form.shortDescription.hint')}
                  error={errors.translations?.[locale]?.shortDescription?.message}
                  {...form.register(`translations.${locale}.shortDescription`)}
                />
                <TextAreaField
                  label={t('fields.body')}
                  rows={8}
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
            <TextField
              label={t('services.form.icon.label')}
              hint={t('services.form.icon.hint')}
              {...form.register('icon')}
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
          <Link href="/admin/services">
            <Button variant="ghost">{t('common.cancel')}</Button>
          </Link>
          <Button type="submit" loading={isSubmitting}>
            {t('services.form.submit')}
          </Button>
        </div>
      </form>
    </ContentLocaleProvider>
  );
}
