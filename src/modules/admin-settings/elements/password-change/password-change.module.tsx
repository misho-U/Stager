'use client';

import { useTranslations } from 'next-intl';

import { PASSWORD_MIN } from '@/entity/session/model/session.model';
import { usePasswordChange } from '@/modules/admin-settings/elements/password-change/password-change.service';
import { Button } from '@/shared/components/button';
import { TextField } from '@/shared/components/field';
import { ErrorNotice, Panel, SuccessNotice } from '@/shared/components/panel';

/**
 * Settings → Password: the signed-in admin sets a new password, after typing
 * the current one. This browser stays signed in; every other device is
 * signed out (the route says how).
 */
export function PasswordChange() {
  const t = useTranslations('admin.settings.password');
  const { form, onSubmit, isSubmitting, error, isChanged } = usePasswordChange();
  const { errors } = form.formState;

  return (
    <Panel title={t('title')} description={t('description')}>
      <form
        onSubmit={onSubmit}
        noValidate
        data-testid="password-change"
        className="flex max-w-md flex-col gap-4"
      >
        {error ? <ErrorNotice message={error} /> : null}
        {isChanged ? <SuccessNotice message={t('changed')} /> : null}
        <TextField
          label={t('current')}
          type="password"
          autoComplete="current-password"
          required
          error={errors.currentPassword?.message}
          {...form.register('currentPassword')}
        />
        <TextField
          label={t('new')}
          type="password"
          autoComplete="new-password"
          required
          hint={t('newHint', { min: PASSWORD_MIN })}
          error={errors.newPassword?.message}
          {...form.register('newPassword')}
        />
        <TextField
          label={t('confirm')}
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
        <div>
          <Button type="submit" variant="secondary" loading={isSubmitting}>
            {t('submit')}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
