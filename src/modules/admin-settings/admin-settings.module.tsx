'use client';

import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';

import { useAdminSettings } from '@/modules/admin-settings/admin-settings.service';
import { Button } from '@/shared/components/button';
import {
  ContentLocaleProvider,
  ContentLocaleToggle,
  TranslatedFields,
} from '@/shared/components/content-locale';
import { TextAreaField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel, SuccessNotice } from '@/shared/components/panel';
import { SeoFields } from '@/shared/components/seo-fields';
import type { DbLocale } from '@/shared/types/enums';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

export function AdminSettingsModule() {
  const t = useTranslations('admin');
  const { form, onSubmit, isLoading, loadError, isSubmitting, submitError, isSaved } =
    useAdminSettings();

  const { errors, submitCount } = form.formState;

  if (isLoading) return <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>;

  return (
    <ContentLocaleProvider errors={errors} submitCount={submitCount}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <PageHeader
          title={t('settings.title')}
          description={t('settings.description')}
          actions={
            <Button type="submit" loading={isSubmitting}>
              {t('common.save')}
            </Button>
          }
        />

        <ContentLocaleToggle />

        {loadError ? <ErrorNotice message={loadError} /> : null}
        {submitError ? <ErrorNotice message={submitError} /> : null}
        {isSaved && !submitError ? <SuccessNotice message={t('settings.saved')} /> : null}

        <Panel title={t('settings.identityPanel')}>
          <div className="flex flex-col gap-4">
            <TranslatedFields>
              {(locale: DbLocale) => (
                <>
                  <TextField
                    label={t('settings.siteName')}
                    error={errors.translations?.[locale]?.siteName?.message}
                    {...form.register(`translations.${locale}.siteName`)}
                  />
                  <TextField
                    label={t('settings.tagline')}
                    error={errors.translations?.[locale]?.tagline?.message}
                    {...form.register(`translations.${locale}.tagline`)}
                  />
                  <TextField
                    label={t('settings.address')}
                    error={errors.translations?.[locale]?.address?.message}
                    {...form.register(`translations.${locale}.address`)}
                  />
                  <TextAreaField
                    label={t('settings.footerText')}
                    rows={3}
                    error={errors.translations?.[locale]?.footerText?.message}
                    {...form.register(`translations.${locale}.footerText`)}
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
          </div>
        </Panel>

        <Panel title={t('settings.logoPanel')}>
          <div className="flex flex-col gap-5">
            <Controller
              control={form.control}
              name="logoMediaId"
              render={({ field }) => (
                <MediaPicker
                  label={t('settings.logo.label')}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  hint={t('settings.logo.hint')}
                />
              )}
            />
            <Controller
              control={form.control}
              name="logoLightMediaId"
              render={({ field }) => (
                <MediaPicker
                  label={t('settings.logoLight.label')}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  hint={t('settings.logoLight.hint')}
                />
              )}
            />
          </div>
        </Panel>

        <Panel title={t('settings.contactPanel')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('settings.contactEmail')}
              type="email"
              error={errors.contactEmail?.message}
              {...form.register('contactEmail')}
            />
            <TextField
              label={t('settings.phone')}
              error={errors.phone?.message}
              {...form.register('phone')}
            />
            <TextField
              label={t('settings.inquiryInbox.label')}
              type="email"
              hint={t('settings.inquiryInbox.hint')}
              error={errors.inquiryInboxEmail?.message}
              {...form.register('inquiryInboxEmail')}
            />
          </div>
        </Panel>

        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting}>
            {t('settings.submit')}
          </Button>
        </div>
      </form>
    </ContentLocaleProvider>
  );
}
