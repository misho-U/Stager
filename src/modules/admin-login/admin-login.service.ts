'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { useLogin } from '@/entity/session/api/session.query';
import { loginInputSchema, type LoginInput } from '@/entity/session/model/session.model';
import { safeRedirectTarget } from '@/modules/admin-login/admin-login.constants';
import { toFormErrorMessage } from '@/shared/lib/form-errors';

/** Everything the login form needs; the module file only renders. */
export function useAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginMutation = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await loginMutation.mutateAsync(values);

      const target = safeRedirectTarget(searchParams.get('next'));
      router.replace(target);
      // The dashboard layout reads the session on the server, so the tree has
      // to be re-fetched for it to see the new cookie.
      router.refresh();
    } catch {
      // Surfaced through loginMutation.error below; nothing to do here.
    }
  });

  return {
    form,
    onSubmit,
    isSubmitting: loginMutation.isPending || form.formState.isSubmitting,
    errorMessage: loginMutation.error
      ? toFormErrorMessage(loginMutation.error, 'signin')
      : null,
  };
}
