'use client';

import { useAdminLoginForm } from '@/modules/admin-login/admin-login.service';
import { Button } from '@/shared/components/button';
import { TextField } from '@/shared/components/field';
import { ErrorNotice } from '@/shared/components/panel';
import { BRAND } from '@/shared/brandbook/tokens';

/** Markup only — all behaviour lives in admin-login.service.ts. */
export function AdminLoginModule() {
  const { form, onSubmit, isSubmitting, errorMessage } = useAdminLoginForm();
  const { errors } = form.formState;

  return (
    <main className="flex min-h-dvh items-center justify-center px-gutter py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-title font-semibold tracking-[0.18em] text-ink">{BRAND.name}</p>
          <p className="mt-1 text-caption tracking-wide text-ink-subtle uppercase">
            {BRAND.positioning}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-4 rounded-lg border border-line bg-surface-raised p-6"
        >
          <h1 className="text-title-sm font-semibold">Sign in</h1>

          {errorMessage ? <ErrorNotice message={errorMessage} /> : null}

          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            error={errors.email?.message}
            {...form.register('email')}
          />

          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...form.register('password')}
          />

          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-4 text-center text-caption text-ink-subtle">
          Access is limited to approved accounts.
        </p>
      </div>
    </main>
  );
}
