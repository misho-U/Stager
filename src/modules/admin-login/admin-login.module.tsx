'use client';

import { useTranslations } from 'next-intl';

import { useAdminLoginForm } from '@/modules/admin-login/admin-login.service';
import { Button } from '@/shared/components/button';
import { TextField } from '@/shared/components/field';
import { ErrorNotice } from '@/shared/components/panel';
import { BRAND } from '@/shared/brandbook/tokens';
import { AdminLocaleSwitch } from '@/widgets/admin-locale-switch/admin-locale-switch.module';

/** Markup only — all behaviour lives in admin-login.service.ts. */
export function AdminLoginModule() {
  const t = useTranslations('admin.signIn');
  const { form, onSubmit, isSubmitting, errorMessage } = useAdminLoginForm();
  const { errors } = form.formState;

  return (
    <main className="px-gutter flex min-h-dvh items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-title tracking-wordmark text-ink font-semibold">{BRAND.name}</p>
          <p className="text-caption text-ink-subtle mt-1 tracking-wide uppercase">
            {BRAND.positioning}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="border-line bg-surface-raised flex flex-col gap-4 rounded-lg border p-6"
        >
          {/* Here as well as in the sidebar, so the language can be changed
              before signing in. */}
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-title-sm font-semibold">{t('title')}</h1>
            <AdminLocaleSwitch />
          </div>

          {errorMessage ? <ErrorNotice message={errorMessage} /> : null}

          <TextField
            label={t('email')}
            type="email"
            autoComplete="username"
            autoFocus
            required
            error={errors.email?.message}
            {...form.register('email')}
          />

          <TextField
            label={t('password')}
            type="password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...form.register('password')}
          />

          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>
        </form>

        <p className="text-caption text-ink-subtle mt-4 text-center">{t('restricted')}</p>
      </div>
    </main>
  );
}
