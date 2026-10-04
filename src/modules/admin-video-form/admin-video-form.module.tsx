'use client';

import { useTranslations } from 'next-intl';

import { useAdminVideoForm } from '@/modules/admin-video-form/admin-video-form.service';
import { Button, ButtonLink } from '@/shared/components/button';
import {
  ContentLocaleProvider,
  ContentLocaleToggle,
  TranslatedFields,
} from '@/shared/components/content-locale';
import { SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, LoadFailed, Panel } from '@/shared/components/panel';
import { toOptionalNumber } from '@/shared/lib/form-values';
import { useStatusOptions, useVideoKindOptions } from '@/shared/lib/use-enum-options';
import type { DbLocale } from '@/shared/types/enums';
import { useUnsavedChangesGuard } from '@/shared/lib/use-unsaved-changes-guard';

export function AdminVideoFormModule({ videoId }: { videoId?: string }) {
  const t = useTranslations('admin');
  const statusOptions = useStatusOptions();
  const kindOptions = useVideoKindOptions();
  const {
    form,
    onSubmit,
    isEdit,
    isLoading,
    loadError,
    retry,
    isSubmitting,
    submitError,
    slugAutofill,
  } = useAdminVideoForm({ videoId });

  const { errors, submitCount, isDirty } = form.formState;
  useUnsavedChangesGuard(isDirty, t('common.unsavedChanges'));

  if (isLoading) return <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>;
  // Its blank fields would be saved over the record: no form until it loads.
  if (loadError) return <LoadFailed message={loadError} onRetry={retry} />;

  return (
    <ContentLocaleProvider errors={errors} submitCount={submitCount}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <PageHeader
          title={isEdit ? t('videos.form.titleEdit') : t('videos.form.titleNew')}
          actions={
            <>
              <ButtonLink href="/admin/videos" variant="ghost">
                {t('common.cancel')}
              </ButtonLink>
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
                  label={t('videos.form.summary.label')}
                  rows={3}
                  hint={t('videos.form.summary.hint')}
                  error={errors.translations?.[locale]?.summary?.message}
                  {...form.register(`translations.${locale}.summary`)}
                />
              </>
            )}
          </TranslatedFields>
        </Panel>

        <Panel title={t('fields.detailsPanel')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                label={t('videos.form.youtube.label')}
                placeholder={t('projects.form.youtube.placeholder')}
                hint={t('videos.form.youtube.hint')}
                error={errors.youtubeUrl?.message}
                {...form.register('youtubeUrl')}
              />
            </div>
            <TextField
              label={t('videos.form.publishedAt.label')}
              type="date"
              required
              hint={t('videos.form.publishedAt.hint')}
              error={errors.publishedAt?.message}
              {...form.register('publishedAt')}
            />
            <SelectField
              label={t('videos.form.kind.label')}
              placeholder={t('videos.form.kind.none')}
              options={kindOptions}
              {...form.register('kind')}
            />
            <TextField
              label={t('videos.form.durationMinutes')}
              type="number"
              min={1}
              error={errors.durationMinutes?.message}
              {...form.register('durationMinutes', { setValueAs: toOptionalNumber })}
            />
            <SelectField
              label={t('fields.status')}
              options={statusOptions}
              {...form.register('status')}
            />
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
          </div>
        </Panel>

        <div className="flex justify-end gap-2">
          <ButtonLink href="/admin/videos" variant="ghost">
            {t('common.cancel')}
          </ButtonLink>
          <Button type="submit" loading={isSubmitting}>
            {t('videos.form.submit')}
          </Button>
        </div>
      </form>
    </ContentLocaleProvider>
  );
}
