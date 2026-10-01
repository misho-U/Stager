'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/button';
import { SelectField, TextAreaField, TextField } from '@/shared/components/field';
import { QueryProvider } from '@/shared/components/query-provider';
import { cn } from '@/shared/lib/cn';
import type { DbLocale } from '@/shared/types/enums';
import { INTERESTS } from '@/widgets/inquiry-form/inquiry-form.constants';
import { useInquiryForm, type InquiryDefaults } from '@/widgets/inquiry-form/inquiry-form.service';

type InquiryFormProps = {
  locale: DbLocale;
  /** From the CMS call-to-action section; falls back to the site's own label. */
  submitLabel?: string;
  /** Two columns of short fields from md up, or everything in one column. */
  layout?: 'stacked' | 'two-column';
  /** Where the form starts (see InquiryDefaults); read once, when it mounts. */
  defaults?: InquiryDefaults;
};

/**
 * The inquiry form every "start a project" call to action scrolls to.
 *
 * It mounts its own query client: the public site has no other mutation, so the
 * provider lives with the one component that needs it rather than wrapping
 * every public page.
 */
export function InquiryForm(props: InquiryFormProps) {
  return (
    <QueryProvider>
      <InquiryFormFields {...props} />
    </QueryProvider>
  );
}

function InquiryFormFields({
  locale,
  submitLabel,
  layout = 'stacked',
  defaults,
}: InquiryFormProps) {
  const t = useTranslations('contact');
  const { form, onSubmit, fieldError, formError, sent, isSubmitting } = useInquiryForm(
    locale,
    defaults,
  );

  if (sent) {
    return (
      <p role="status" className="text-body-lg text-ink" data-testid="inquiry-sent">
        {t('success')}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" data-testid="inquiry-form">
      {formError ? (
        <p role="alert" className="text-body-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className={cn('grid gap-5', layout === 'two-column' && 'md:grid-cols-2')}>
        <TextField
          size="lg"
          label={t('name')}
          autoComplete="name"
          required
          error={fieldError('name')}
          {...form.register('name')}
        />
        <TextField
          size="lg"
          label={t('company')}
          autoComplete="organization"
          error={fieldError('company')}
          {...form.register('company')}
        />
        <TextField
          size="lg"
          label={t('email')}
          type="email"
          autoComplete="email"
          required
          error={fieldError('email')}
          {...form.register('email')}
        />
        <TextField
          size="lg"
          label={t('phone')}
          type="tel"
          autoComplete="tel"
          error={fieldError('phone')}
          {...form.register('phone')}
        />
      </div>

      <SelectField
        size="lg"
        label={t('interest')}
        required
        placeholder={t('choose')}
        options={INTERESTS.map((value) => ({ value, label: t(`interests.${value}`) }))}
        error={fieldError('interest')}
        {...form.register('interest')}
      />

      <TextAreaField
        size="lg"
        label={t('message')}
        rows={5}
        required
        error={fieldError('message')}
        {...form.register('message')}
      />

      {/* Honeypot: invisible and unreachable for people, filled in by bots. */}
      <div aria-hidden className="sr-only">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" {...form.register('website')} />
        </label>
      </div>

      <Button type="submit" size="lg" loading={isSubmitting} className="self-start">
        {isSubmitting ? t('submitting') : (submitLabel ?? t('submit'))}
      </Button>
    </form>
  );
}
