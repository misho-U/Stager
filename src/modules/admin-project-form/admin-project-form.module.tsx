'use client';

import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';

import { useAdminProjectForm } from '@/modules/admin-project-form/admin-project-form.service';
import { Button, ButtonLink } from '@/shared/components/button';
import {
  ContentLocaleProvider,
  ContentLocaleToggle,
  TranslatedFields,
} from '@/shared/components/content-locale';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, LoadFailed, Panel } from '@/shared/components/panel';
import { toOptionalNumber } from '@/shared/lib/form-values';
import { useStatusOptions } from '@/shared/lib/use-enum-options';
import type { DbLocale } from '@/shared/types/enums';
import { useUnsavedChangesGuard } from '@/shared/lib/use-unsaved-changes-guard';
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
    retry,
    isSubmitting,
    submitError,
    services,
    slugAutofill,
  } = useAdminProjectForm({ projectId });

  const { errors, submitCount, isDirty } = form.formState;
  useUnsavedChangesGuard(isDirty, t('common.unsavedChanges'));

  if (isLoading) {
    return <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>;
  }
  // Its blank fields would be saved over the record: no form until it loads.
  if (loadError) return <LoadFailed message={loadError} onRetry={retry} />;

  return (
    <ContentLocaleProvider errors={errors} submitCount={submitCount}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <PageHeader
          title={isEdit ? t('projects.form.titleEdit') : t('projects.form.titleNew')}
          description={t('projects.form.description')}
          actions={
            <>
              <ButtonLink href="/admin/projects" variant="ghost">
                {t('common.cancel')}
              </ButtonLink>
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? t('common.saving') : t('common.save')}
              </Button>
            </>
          }
        />

        <ContentLocaleToggle />

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
                    onChange: locale === 'EN' ? slugAutofill.followTitle : undefined,
                  })}
                />

                <TextAreaField
                  label={t('projects.form.summary.label')}
                  rows={3}
                  hint={t('projects.form.summary.hint')}
                  error={errors.translations?.[locale]?.summary?.message}
                  {...form.register(`translations.${locale}.summary`)}
                />
              </>
            )}
          </TranslatedFields>
        </Panel>

        {/* A project is its card on the home page, with no page of its own:
            no write-up, search fields or video to fill in. What was saved
            in them before stays as it was. */}
        <Panel
          title={t('projects.form.mediaPanel')}
          description={t('projects.form.mediaDescription')}
        >
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
          </div>
        </Panel>

        <Panel title={t('fields.detailsPanel')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('fields.slug.label')}
              required
              hint={
                isEdit
                  ? t('projects.form.slugHint')
                  : `${t('projects.form.slugHint')} ${t('fields.slug.autoFromTitle')}`
              }
              error={errors.slug?.message}
              {...form.register('slug', { onChange: slugAutofill.slugEdited })}
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
          <ButtonLink href="/admin/projects" variant="ghost">
            {t('common.cancel')}
          </ButtonLink>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('projects.form.submit')}
          </Button>
        </div>
      </form>
    </ContentLocaleProvider>
  );
}
