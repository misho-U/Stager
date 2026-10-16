'use client';

import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';

import {
  useAdminVideoForm,
  type VideoSource,
} from '@/modules/admin-video-form/admin-video-form.service';
import { Button, ButtonLink } from '@/shared/components/button';
import {
  ContentLocaleProvider,
  ContentLocaleToggle,
  TranslatedFields,
} from '@/shared/components/content-locale';
import { SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, LoadFailed, Panel } from '@/shared/components/panel';
import { FormPageSkeleton } from '@/shared/components/skeleton';
import { toOptionalNumber } from '@/shared/lib/form-values';
import { useStatusOptions, useVideoKindOptions } from '@/shared/lib/use-enum-options';
import type { DbLocale } from '@/shared/types/enums';
import { useUnsavedChangesGuard } from '@/shared/lib/use-unsaved-changes-guard';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';
import { VideoUpload } from '@/widgets/video-upload/video-upload.module';
import { MAX_VIDEO_UPLOAD_BYTES } from '@pkg/blob/constraints';

const SOURCES: readonly VideoSource[] = ['YOUTUBE', 'FILE'];

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
    source,
    setSource,
    file,
    setFile,
  } = useAdminVideoForm({ videoId });

  const { errors, submitCount, isDirty } = form.formState;
  useUnsavedChangesGuard(isDirty, t('common.unsavedChanges'));

  if (isLoading) return <FormPageSkeleton />;
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

        <Panel title={t('videos.form.sourcePanel')}>
          <div className="flex flex-col gap-5">
            {/* Native radios: arrow keys move between them, and a screen
                reader names the group. */}
            <fieldset className="flex flex-col gap-2">
              <legend className="text-caption text-ink-muted mb-2 font-medium">
                {t('videos.form.source.label')}
              </legend>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map((option) => (
                  <label
                    key={option}
                    className="border-line-input has-checked:border-primary has-checked:bg-surface-muted text-body-sm text-ink inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4"
                  >
                    <input
                      type="radio"
                      name="video-source"
                      value={option}
                      checked={source === option}
                      onChange={() => setSource(option)}
                      className="accent-primary"
                    />
                    {t(`videos.form.source.${option}`)}
                  </label>
                ))}
              </div>
            </fieldset>

            {source === 'YOUTUBE' ? (
              <TextField
                label={t('videos.form.youtube.label')}
                placeholder={t('videos.form.youtube.placeholder')}
                hint={t('videos.form.youtube.hint')}
                error={errors.youtubeUrl?.message}
                {...form.register('youtubeUrl')}
              />
            ) : (
              <VideoUpload
                label={t('videos.form.file.label')}
                hint={t('videos.form.file.hint', {
                  max: MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024),
                })}
                value={file}
                onChange={setFile}
                error={errors.fileUrl?.message}
              />
            )}

            <Controller
              control={form.control}
              name="posterMediaId"
              render={({ field }) => (
                <MediaPicker
                  label={t('videos.form.poster.label')}
                  hint={
                    source === 'FILE'
                      ? t('videos.form.poster.hintFile')
                      : t('videos.form.poster.hintYoutube')
                  }
                  value={field.value ?? null}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </Panel>

        <Panel title={t('fields.detailsPanel')}>
          <div className="grid gap-4 sm:grid-cols-2">
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
