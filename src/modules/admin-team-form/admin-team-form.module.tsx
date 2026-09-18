'use client';

import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { useAdminTeamForm } from '@/modules/admin-team-form/admin-team-form.service';
import { Button } from '@/shared/components/button';
import { SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { LocaleTabs } from '@/shared/components/locale-tabs';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, Panel } from '@/shared/components/panel';
import { STATUS_OPTIONS } from '@/shared/constants/content';
import type { DbLocale } from '@/shared/types/enums';
import { MediaPicker } from '@/widgets/media-picker/media-picker.module';

export function AdminTeamFormModule({ memberId }: { memberId?: string }) {
  const { form, onSubmit, isEdit, isLoading, isSubmitting, submitError } = useAdminTeamForm({
    memberId,
  });

  const { errors } = form.formState;
  const invalidLocales = (['KA', 'EN'] as const).filter(
    (locale) => errors.translations?.[locale] !== undefined,
  );

  if (isLoading) return <p className="text-body-sm text-ink-subtle">Loading…</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <PageHeader
        title={isEdit ? 'Edit team member' : 'New team member'}
        actions={
          <>
            <Link href="/admin/team">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </>
        }
      />

      {submitError ? <ErrorNotice message={submitError} /> : null}

      <Panel title="Profile">
        <LocaleTabs invalidLocales={invalidLocales}>
          {(locale: DbLocale) => (
            <>
              <TextField
                label="Name"
                required
                error={errors.translations?.[locale]?.name?.message}
                {...form.register(`translations.${locale}.name`)}
              />
              <TextField
                label="Position"
                error={errors.translations?.[locale]?.position?.message}
                {...form.register(`translations.${locale}.position`)}
              />
              <TextField
                label="Area of expertise"
                error={errors.translations?.[locale]?.expertise?.message}
                {...form.register(`translations.${locale}.expertise`)}
              />
              <TextAreaField
                label="Short bio"
                rows={5}
                error={errors.translations?.[locale]?.bio?.message}
                {...form.register(`translations.${locale}.bio`)}
              />
            </>
          )}
        </LocaleTabs>
      </Panel>

      <Panel title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Slug"
            required
            error={errors.slug?.message}
            {...form.register('slug')}
          />
          <SelectField label="Status" options={STATUS_OPTIONS} {...form.register('status')} />
          <TextField
            label="Email"
            type="email"
            error={errors.email?.message}
            {...form.register('email')}
          />
          <TextField
            label="LinkedIn URL"
            error={errors.linkedinUrl?.message}
            {...form.register('linkedinUrl')}
          />
          <TextField
            label="Sort order"
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
              <MediaPicker label="Photo" value={field.value ?? null} onChange={field.onChange} />
            )}
          />
        </div>
      </Panel>

      <div className="flex justify-end gap-2">
        <Link href="/admin/team">
          <Button variant="ghost">Cancel</Button>
        </Link>
        <Button type="submit" loading={isSubmitting}>
          Save member
        </Button>
      </div>
    </form>
  );
}
