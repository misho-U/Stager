'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';

import { TextAreaField, TextField } from '@/shared/components/field';

type SeoFieldsProps = {
  metaTitle: UseFormRegisterReturn;
  metaDescription: UseFormRegisterReturn;
  errors?: { metaTitle?: string | undefined; metaDescription?: string | undefined };
};

/**
 * Search and social metadata for one locale.
 *
 * Takes pre-bound register results rather than a form instance, so it stays
 * type-safe across entities whose field paths differ, without generics leaking
 * through every caller.
 */
export function SeoFields({ metaTitle, metaDescription, errors }: SeoFieldsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-surface-inset p-4">
      <p className="text-caption font-medium tracking-wide text-ink-subtle uppercase">
        Search &amp; social
      </p>

      <TextField
        label="Meta title"
        hint="Shown as the headline in search results. Leave blank to use the title above."
        error={errors?.metaTitle}
        {...metaTitle}
      />

      <TextAreaField
        label="Meta description"
        rows={2}
        hint="The grey summary under the search result. Around 150 characters reads best."
        error={errors?.metaDescription}
        {...metaDescription}
      />
    </div>
  );
}
