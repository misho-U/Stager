'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { useAdminTeamForm } from '@/modules/admin-team-form/admin-team-form.service';
import { Button } from '@/shared/components/button';
import {
  ContentLocaleProvider,
  ContentLocaleToggle,
  TranslatedFields,
} from '@/shared/components/content-locale';
import { SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel } from '@/shared/components/panel';
import { useStatusOptions } from '@/shared/lib/use-enum-options';
import type { DbLocale } from '@/shared/types/enums';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

export function AdminTeamFormModule({ memberId }: { memberId?: string }) {
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
  } = useAdminTeamForm({ memberId });

  const { errors, submitCount } = form.formState;

  if (isLoading) return <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>;

  return (
    <ContentLocaleProvider errors={errors} submitCount={submitCount}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <PageHeader
          title={isEdit ? t('team.form.titleEdit') : t('team.form.titleNew')}
          actions={
            <>
              <Link href="/admin/team">
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

        <Panel title={t('team.form.profilePanel')}>
          <TranslatedFields>
            {(locale: DbLocale) => (
              <>
                <TextField
                  label={t('team.form.name')}
                  required
                  error={errors.translations?.[locale]?.name?.message}
                  {...form.register(`translations.${locale}.name`, {
                    onChange: locale === 'EN' ? slugAutofill.followTitle : undefined,
                  })}
                />
                <TextField
                  label={t('team.form.position')}
                  error={errors.translations?.[locale]?.position?.message}
                  {...form.register(`translations.${locale}.position`)}
                />
                <TextField
                  label={t('team.form.expertise')}
                  error={errors.translations?.[locale]?.expertise?.message}
                  {...form.register(`translations.${locale}.expertise`)}
                />
                <TextAreaField
                  label={t('team.form.bio')}
                  rows={5}
                  error={errors.translations?.[locale]?.bio?.message}
                  {...form.register(`translations.${locale}.bio`)}
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
                  : `${t('fields.slug.hint')} ${t('fields.slug.autoFromName')}`
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
              label={t('team.form.email')}
              type="email"
              error={errors.email?.message}
              {...form.register('email')}
            />
            <TextField
              label={t('team.form.linkedin')}
              error={errors.linkedinUrl?.message}
              {...form.register('linkedinUrl')}
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
              name="photoMediaId"
              render={({ field }) => (
                <MediaPicker
                  label={t('team.form.photo')}
                  value={field.value ?? null}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </Panel>

        <div className="flex justify-end gap-2">
          <Link href="/admin/team">
            <Button variant="ghost">{t('common.cancel')}</Button>
          </Link>
          <Button type="submit" loading={isSubmitting}>
            {t('team.form.submit')}
          </Button>
        </div>
      </form>
    </ContentLocaleProvider>
  );
}
