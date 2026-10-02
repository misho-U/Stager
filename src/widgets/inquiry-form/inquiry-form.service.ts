'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type BaseSyntheticEvent } from 'react';
import { useForm, type FieldError } from 'react-hook-form';
import type { z } from 'zod';

import { useSubmitContactInquiry } from '@/entity/contact-inquiry/api/contact-inquiry.query';
import { contactSubmissionSchema } from '@/entity/contact-inquiry/model/contact-inquiry.model';
import type { DbLocale } from '@/shared/types/enums';
import { isApiError } from '@pkg/http/api-error';

type FormInput = z.input<typeof contactSubmissionSchema>;
type FormOutput = z.output<typeof contactSubmissionSchema>;
type FieldName = 'name' | 'company' | 'email' | 'phone' | 'interest' | 'message';

/**
 * Values to start from instead of an empty form: a course's "Register" opens
 * the form already set to Training, with a message naming the course. The
 * visitor can still change both.
 */
export type InquiryDefaults = {
  interest?: NonNullable<FormInput['interest']>;
  message?: string;
};

const isEmpty = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === '';

/**
 * Everything the inquiry form needs; the module file only renders.
 *
 * Validation runs on the same schema the API enforces, but its messages are
 * shown from the site's own message files, chosen by the kind of error rather
 * than by the schema's English text — so a visitor on /ka reads Georgian.
 */
export function useInquiryForm(locale: DbLocale, defaults: InquiryDefaults = {}) {
  const t = useTranslations();
  const submitMutation = useSubmitContactInquiry();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // How long the form was open. The API quietly drops submissions faster than
  // a person can type (MIN_FORM_FILL_MS); set in an effect, not during render.
  const openedAt = useRef<number | null>(null);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(contactSubmissionSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      // No interest is pre-selected unless the caller chose one; the empty
      // option fails validation as "required", which is the point.
      interest: defaults.interest ?? ('' as FormInput['interest']),
      message: defaults.message ?? '',
      locale,
      website: '',
    },
  });

  const fieldError = (name: FieldName): string | undefined => {
    const error: FieldError | undefined = form.formState.errors[name];
    if (!error) return undefined;

    const value = form.getValues(name);
    if (isEmpty(value)) return t('validation.required');
    if (error.type === 'invalid_format') return t('validation.email');
    if (error.type === 'too_big') return t('validation.tooLong');
    if (error.type === 'too_small') return t('validation.tooShort');
    return t('validation.required');
  };

  const submit = async (values: FormOutput) => {
    setFormError(null);
    try {
      await submitMutation.mutateAsync({
        ...values,
        locale,
        elapsedMs: openedAt.current === null ? undefined : Date.now() - openedAt.current,
      });
      setSent(true);
    } catch (error) {
      setFormError(
        isApiError(error) && error.code === 'RATE_LIMITED'
          ? t('validation.rateLimited')
          : t('contact.failure'),
      );
    }
  };

  // handleSubmit is called from the submit event rather than during render:
  // `submit` reads the clock and a ref, which must never happen while rendering.
  const onSubmit = (event?: BaseSyntheticEvent) => form.handleSubmit(submit)(event);

  return {
    form,
    onSubmit,
    fieldError,
    formError,
    sent,
    isSubmitting: submitMutation.isPending || form.formState.isSubmitting,
  };
}
