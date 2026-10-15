'use client';

import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';

import { sectionFields } from '@/entity/page/model/page.model';
import { useAdminPageEditor } from '@/modules/admin-page-editor/admin-page-editor.service';
import { Button, ButtonLink } from '@/shared/components/button';
import {
  ContentLocaleProvider,
  ContentLocaleToggle,
  TranslatedFields,
} from '@/shared/components/content-locale';
import { CheckboxField, TextAreaField, TextField } from '@/shared/components/field';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, LoadFailed, Panel, SuccessNotice } from '@/shared/components/panel';
import { SeoFields } from '@/shared/components/seo-fields';
import { FormPageSkeleton } from '@/shared/components/skeleton';
import type { DbLocale, PageKey } from '@/shared/types/enums';
import { useUnsavedChangesGuard } from '@/shared/lib/use-unsaved-changes-guard';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

/** Turns a stored section key into a readable heading: "why-stager" → "Why stager". */
function humanise(key: string): string {
  const spaced = key.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function AdminPageEditorModule({ pageKey }: { pageKey: PageKey }) {
  const t = useTranslations('admin');
  const {
    form,
    onSubmit,
    sections,
    isLoading,
    loadError,
    retry,
    isSubmitting,
    submitError,
    isSaved,
  } = useAdminPageEditor(pageKey);

  const { errors, submitCount, isDirty } = form.formState;
  useUnsavedChangesGuard(isDirty, t('common.unsavedChanges'));

  if (isLoading) return <FormPageSkeleton />;
  // Its blank fields would be saved over the record: no form until it loads.
  if (loadError) return <LoadFailed message={loadError} onRetry={retry} />;

  return (
    <ContentLocaleProvider errors={errors} submitCount={submitCount}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <PageHeader
          title={t('pageEditor.title', { page: t(`pages.keys.${pageKey}`) })}
          description={t('pageEditor.description')}
          actions={
            <>
              <ButtonLink href="/admin/pages" variant="ghost">
                {t('common.back')}
              </ButtonLink>
              <Button type="submit" loading={isSubmitting}>
                {t('common.save')}
              </Button>
            </>
          }
        />

        <ContentLocaleToggle />

        {submitError ? <ErrorNotice message={submitError} /> : null}
        {isSaved && !submitError ? <SuccessNotice message={t('pageEditor.saved')} /> : null}

        <Panel title={t('pageEditor.pagePanel')}>
          <div className="flex flex-col gap-4">
            <TranslatedFields>
              {(locale: DbLocale) => (
                <>
                  <TextField
                    label={t('pageEditor.pageTitle')}
                    error={errors.translations?.[locale]?.title?.message}
                    {...form.register(`translations.${locale}.title`)}
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

        {sections.map((section, index) => {
          const sectionErrors = errors.sections?.[index]?.translations;
          // Only the fields the site shows for this section (a policy is a
          // heading and a long text); the others' stored values are kept.
          const fields = sectionFields(pageKey, section.key);
          const bodyOnly = fields.body && !fields.subheading;

          return (
            <Panel
              key={section.id}
              title={
                t.has(`pages.sections.${section.key}`)
                  ? t(`pages.sections.${section.key}`)
                  : humanise(section.key)
              }
              description={t('pageEditor.sectionKey', { key: section.key })}
            >
              <div className="flex flex-col gap-4">
                <CheckboxField
                  label={t('pageEditor.visible')}
                  {...form.register(`sections.${index}.isVisible`)}
                />

                <TranslatedFields>
                  {(locale: DbLocale) => (
                    <>
                      <TextField
                        label={t('pageEditor.heading')}
                        error={sectionErrors?.[locale]?.heading?.message}
                        {...form.register(`sections.${index}.translations.${locale}.heading`)}
                      />
                      {fields.subheading ? (
                        <TextAreaField
                          label={t('pageEditor.subheading')}
                          rows={2}
                          error={sectionErrors?.[locale]?.subheading?.message}
                          {...form.register(`sections.${index}.translations.${locale}.subheading`)}
                        />
                      ) : null}
                      {fields.body ? (
                        <TextAreaField
                          label={t('fields.body')}
                          rows={bodyOnly ? 24 : 6}
                          hint={t('fields.bodyHint')}
                          error={sectionErrors?.[locale]?.body?.message}
                          {...form.register(`sections.${index}.translations.${locale}.body`)}
                        />
                      ) : null}
                      {fields.button ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <TextField
                            label={t('pageEditor.buttonLabel')}
                            error={sectionErrors?.[locale]?.ctaLabel?.message}
                            {...form.register(`sections.${index}.translations.${locale}.ctaLabel`)}
                          />
                          <TextField
                            label={t('pageEditor.buttonLink.label')}
                            placeholder={t('pageEditor.buttonLink.placeholder')}
                            hint={t('pageEditor.buttonLink.hint')}
                            error={sectionErrors?.[locale]?.ctaHref?.message}
                            {...form.register(`sections.${index}.translations.${locale}.ctaHref`)}
                          />
                        </div>
                      ) : null}
                    </>
                  )}
                </TranslatedFields>

                {fields.image ? (
                  <Controller
                    control={form.control}
                    name={`sections.${index}.mediaId`}
                    render={({ field }) => (
                      <MediaPicker
                        label={t('pageEditor.sectionImage')}
                        value={field.value ?? null}
                        onChange={field.onChange}
                      />
                    )}
                  />
                ) : null}
              </div>
            </Panel>
          );
        })}

        <div className="flex justify-end gap-2">
          <ButtonLink href="/admin/pages" variant="ghost">
            {t('common.back')}
          </ButtonLink>
          <Button type="submit" loading={isSubmitting}>
            {t('pageEditor.submit')}
          </Button>
        </div>
      </form>
    </ContentLocaleProvider>
  );
}
