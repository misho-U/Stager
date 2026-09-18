'use client';

import { Controller } from 'react-hook-form';

import { useAdminSettings } from '@/modules/admin-settings/admin-settings.service';
import { Button } from '@/shared/components/button';
import { TextAreaField, TextField } from '@/shared/components/field';
import { LocaleTabs } from '@/shared/components/locale-tabs';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel, SuccessNotice } from '@/shared/components/panel';
import { SeoFields } from '@/shared/components/seo-fields';
import type { DbLocale } from '@/shared/types/enums';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

export function AdminSettingsModule() {
  const { form, onSubmit, isLoading, loadError, isSubmitting, submitError, isSaved } =
    useAdminSettings();

  const { errors } = form.formState;

  if (isLoading) return <p className="text-body-sm text-ink-subtle">Loading…</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <PageHeader
        title="Site settings"
        description="Logo, contact details and the defaults used across the site."
        actions={
          <Button type="submit" loading={isSubmitting}>
            Save
          </Button>
        }
      />

      {loadError ? <ErrorNotice message={loadError} /> : null}
      {submitError ? <ErrorNotice message={submitError} /> : null}
      {isSaved && !submitError ? <SuccessNotice message="Settings saved." /> : null}

      <Panel title="Identity">
        <LocaleTabs>
          {(locale: DbLocale) => (
            <>
              <TextField
                label="Site name"
                {...form.register(`translations.${locale}.siteName`)}
              />
              <TextField label="Tagline" {...form.register(`translations.${locale}.tagline`)} />
              <TextField label="Address" {...form.register(`translations.${locale}.address`)} />
              <TextAreaField
                label="Footer text"
                rows={3}
                {...form.register(`translations.${locale}.footerText`)}
              />
              <SeoFields
                metaTitle={form.register(`translations.${locale}.metaTitle`)}
                metaDescription={form.register(`translations.${locale}.metaDescription`)}
              />
            </>
          )}
        </LocaleTabs>
      </Panel>

      <Panel title="Logo">
        <div className="flex flex-col gap-5">
          <Controller
            control={form.control}
            name="logoMediaId"
            render={({ field }) => (
              <MediaPicker
                label="Primary logo"
                value={field.value ?? null}
                onChange={field.onChange}
                hint="Used on light backgrounds."
              />
            )}
          />
          <Controller
            control={form.control}
            name="logoLightMediaId"
            render={({ field }) => (
              <MediaPicker
                label="Light logo"
                value={field.value ?? null}
                onChange={field.onChange}
                hint="Used on the dark teal background."
              />
            )}
          />
        </div>
      </Panel>

      <Panel title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Public contact email"
            type="email"
            error={errors.contactEmail?.message}
            {...form.register('contactEmail')}
          />
          <TextField label="Phone" {...form.register('phone')} />
          <TextField
            label="Inquiry inbox"
            type="email"
            hint="Where contact-form messages are sent. Leave blank to use the address configured in the environment."
            error={errors.inquiryInboxEmail?.message}
            {...form.register('inquiryInboxEmail')}
          />
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
