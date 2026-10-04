'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { describeIssue } from '@/shared/lib/validation-message';
import { isApiError } from '@pkg/http/api-error';

/** next-intl's translator for the `admin` namespace, narrowed to what these helpers use. */
type Translate = {
  (key: string, values?: Record<string, string | number>): string;
  has(key: string): boolean;
};

export type ErrorContext = 'dashboard' | 'signin';

/**
 * Turn a thrown mutation error into something a person can act on, in the
 * dashboard's language.
 *
 * Worded from the error's code and, where one code covers several cases, its
 * `reason` — never from the server's English message, which stays for logs.
 * Route handlers return a bare "Something went wrong" for anything unexpected
 * (see handleRouteError), so this never risks surfacing internals either way.
 */
export function toFormErrorMessage(
  error: unknown,
  t: Translate,
  context: ErrorContext = 'dashboard',
): string {
  if (isApiError(error)) {
    if (error.reason && t.has(`errors.reasons.${error.reason}`)) {
      return t(`errors.reasons.${error.reason}`);
    }

    switch (error.code) {
      // On the sign-in form, "your session has expired" would be nonsense.
      case 'UNAUTHENTICATED':
        return context === 'signin'
          ? t('errors.reasons.INVALID_CREDENTIALS')
          : t('errors.sessionExpired');
      case 'FORBIDDEN':
        return t('errors.forbidden');
      case 'RATE_LIMITED':
        return t('errors.rateLimited');
      case 'NOT_FOUND':
        return t('errors.notFound');
      case 'CONFLICT':
        return error.fields?.slug ? t('errors.slugTaken') : t('errors.conflict');
      case 'VALIDATION_FAILED':
        return t('errors.validationFailed');
      case 'PAYLOAD_TOO_LARGE':
        return t('errors.tooLarge');
      case 'UNSUPPORTED_MEDIA_TYPE':
        return t('errors.unsupportedType');
      case 'BAD_REQUEST':
        return t('errors.badRequest');
      default:
        return t('errors.unexpected');
    }
  }

  // Anything else is not ours to word (a library's English, say). Keep the
  // detail for whoever debugs it; show the person something they can act on.
  console.error(error);
  // fetch() rejects with a TypeError when the request never got an answer.
  return error instanceof TypeError ? t('errors.network') : t('errors.unexpected');
}

/**
 * Field-level messages from a failed save, keyed by the form field path, so
 * each appears under the input it belongs to.
 */
export function toFieldErrors(error: unknown, t: Translate): Record<string, string> {
  if (!isApiError(error)) return {};

  // A clash on a unique field: today only ever the slug.
  if (error.code === 'CONFLICT' && error.fields) {
    return Object.fromEntries(
      Object.keys(error.fields).map((field) => [field, t('errors.slugTaken')]),
    );
  }

  // The server's checks are the form's own schema, so word them the same way.
  const fields = new Set([...Object.keys(error.issues ?? {}), ...Object.keys(error.fields ?? {})]);

  return Object.fromEntries(
    [...fields].map((field) => {
      const issue = error.issues?.[field]?.[0];
      if (!issue) return [field, t('validation.invalid')];
      const { key, values } = describeIssue(issue);
      return [field, t(`validation.${key}`, values)];
    }),
  );
}

/** Both helpers, bound to the dashboard's current language. */
export function useFormErrors(context: ErrorContext = 'dashboard') {
  const t = useTranslations('admin');

  return useMemo(
    () => ({
      message: (error: unknown) => toFormErrorMessage(error, t, context),
      fields: (error: unknown) => toFieldErrors(error, t),
      /** The form's own checks stopped a save: said above the form. */
      invalid: () => t('errors.validationFailed'),
    }),
    [t, context],
  );
}
