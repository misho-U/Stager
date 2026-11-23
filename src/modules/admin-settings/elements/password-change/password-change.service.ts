'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useChangePassword } from '@/entity/session/api/session.query';
import {
  passwordChangeInputSchema,
  type PasswordChangeInput,
} from '@/entity/session/model/session.model';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useValidationErrorMap } from '@/shared/lib/use-validation-error-map';
import { isApiError } from '@pkg/http/api-error';

const EMPTY: PasswordChangeInput = { currentPassword: '', newPassword: '', confirmPassword: '' };

/**
 * The fields a refusal belongs under: a wrong current password under the
 * current one, one Supabase calls too weak under the new one. Anything else
 * (a rate limit, an outage) is said above the form.
 */
const FIELD_OF_REASON = {
  WRONG_PASSWORD: 'currentPassword',
  WEAK_PASSWORD: 'newPassword',
} as const;

export function usePasswordChange() {
  const formErrors = useFormErrors();
  const validationErrorMap = useValidationErrorMap();
  const changePassword = useChangePassword();
  const [error, setError] = useState<string | null>(null);
  const [isChanged, setIsChanged] = useState(false);

  const form = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeInputSchema, { error: validationErrorMap }),
    defaultValues: EMPTY,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    setIsChanged(false);
    try {
      await changePassword.mutateAsync(values);
      // Passwords never linger in the form once they have done their job.
      form.reset(EMPTY);
      setIsChanged(true);
    } catch (caught) {
      const message = formErrors.message(caught);
      const reason = isApiError(caught) ? caught.reason : undefined;
      const field =
        reason === 'WRONG_PASSWORD' || reason === 'WEAK_PASSWORD' ? FIELD_OF_REASON[reason] : null;
      if (field) {
        form.setError(field, { message }, { shouldFocus: true });
      } else {
        setError(message);
      }
    }
  });

  return {
    form,
    onSubmit,
    isSubmitting: changePassword.isPending || form.formState.isSubmitting,
    error,
    isChanged,
  };
}
