'use client';

import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { useAdminPageEditor } from '@/modules/admin-page-editor/admin-page-editor.service';
import { Button } from '@/shared/components/button';
import { CheckboxField, TextAreaField, TextField } from '@/shared/components/field';
import { LocaleTabs } from '@/shared/components/locale-tabs';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel, SuccessNotice } from '@/shared/components/panel';
import { SeoFields } from '@/shared/components/seo-fields';
import type { DbLocale, PageKey } from '@/shared/types/enums';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

/** Turns a stored section key into a readable heading: "why-stager" → "Why stager". */
function humanise(key: string): string {
  const spaced = key.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function AdminPageEditorModule({ pageKey }: { pageKey: PageKey }) {
  const { form, onSubmit, sections, isLoading, loadError, isSubmitting, submitError, isSaved } =
    useAdminPageEditor(pageKey);

  if (isLoading) return <p className="text-body-sm text-ink-subtle">Loading…</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <PageHeader
        title={`${humanise(pageKey.toLowerCase())} page`}
        description="Edit the copy and SEO. Sections cannot be added or removed here — they are part of the layout."
        actions={
          <>
            <Link href="/admin/pages">
              <Button variant="ghost">Back</Button>
            </Link>
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </>
        }
      />

      {loadError ? <ErrorNotice message={loadError} /> : null}
      {submitError ? <ErrorNotice message={submitError} /> : null}
      {isSaved && !submitError ? <SuccessNotice message="Saved. The site is updated." /> : null}

      <Panel title="Page title and SEO">
        <LocaleTabs>
          {(locale: DbLocale) => (
            <>
              <TextField
                label="Page title"
                {...form.register(`translations.${locale}.title`)}
              />
              <SeoFields
                metaTitle={form.register(`translations.${locale}.metaTitle`)}
                metaDescription={form.register(`translations.${locale}.metaDescription`)}
              />
            </>
          )}
        </LocaleTabs>
      </Panel>

      {sections.map((section, index) => (
        <Panel
          key={section.id}
          title={humanise(section.key)}
          description={`Section key: ${section.key}`}
        >
          <div className="flex flex-col gap-4">
            <CheckboxField
              label="Show this section"
              {...form.register(`sections.${index}.isVisible`)}
            />

            <LocaleTabs>
              {(locale: DbLocale) => (
                <>
                  <TextField
                    label="Heading"
                    {...form.register(`sections.${index}.translations.${locale}.heading`)}
                  />
                  <TextAreaField
                    label="Subheading"
                    rows={2}
                    {...form.register(`sections.${index}.translations.${locale}.subheading`)}
                  />
                  <TextAreaField
                    label="Body"
                    rows={6}
                    hint="Basic HTML is allowed; scripts are stripped on save."
                    {...form.register(`sections.${index}.translations.${locale}.body`)}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="Button label"
                      {...form.register(`sections.${index}.translations.${locale}.ctaLabel`)}
                    />
                    <TextField
                      label="Button link"
                      placeholder="/contact"
                      {...form.register(`sections.${index}.translations.${locale}.ctaHref`)}
                    />
                  </div>
                </>
              )}
            </LocaleTabs>

            <Controller
              control={form.control}
              name={`sections.${index}.mediaId`}
              render={({ field }) => (
                <MediaPicker
                  label="Section image"
                  value={field.value ?? null}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </Panel>
      ))}

      <div className="flex justify-end gap-2">
        <Link href="/admin/pages">
          <Button variant="ghost">Back</Button>
        </Link>
        <Button type="submit" loading={isSubmitting}>
          Save page
        </Button>
      </div>
    </form>
  );
}
