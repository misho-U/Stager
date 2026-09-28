'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('admin.seo');

  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-surface-inset p-4">
      <p className="text-caption font-medium tracking-wide text-ink-subtle uppercase">
        {t('caption')}
      </p>

      <TextField
        label={t('metaTitle.label')}
        hint={t('metaTitle.hint')}
        error={errors?.metaTitle}
        {...metaTitle}
      />

      <TextAreaField
        label={t('metaDescription.label')}
        rows={2}
        hint={t('metaDescription.hint')}
        error={errors?.metaDescription}
        {...metaDescription}
      />
    </div>
  );
}
