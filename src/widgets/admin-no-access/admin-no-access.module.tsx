'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { useLogout } from '@/entity/session/api/session.query';
import { Button } from '@/shared/components/button';

/**
 * Shown to someone signed in to Supabase whose account may not use the
 * dashboard: never on the allowlist, or switched off while signed in.
 *
 * It used to redirect to the login page, and the login page sends anyone with
 * a session back to /admin, so a deactivated admin bounced between the two
 * until the browser gave up. This says what is wrong and offers the one way
 * out: sign out, then sign in with an account that may.
 */
export function AdminNoAccess({ email }: { email: string | null }) {
  const t = useTranslations('admin.noAccess');
  const router = useRouter();
  const logout = useLogout();

  const signOut = async () => {
    await logout.mutateAsync();
    router.replace('/admin/login');
    router.refresh();
  };

  return (
    <main className="px-gutter flex min-h-dvh items-center justify-center py-12">
      <div className="border-line bg-surface-raised flex w-full max-w-md flex-col gap-4 rounded-lg border p-8">
        <h1 className="text-title font-semibold">{t('title')}</h1>
        <p className="text-body-sm text-ink-muted">
          {email ? t('body', { email }) : t('bodyNoEmail')}
        </p>
        <div>
          <Button onClick={() => void signOut()} loading={logout.isPending}>
            {t('signOut')}
          </Button>
        </div>
      </div>
    </main>
  );
}
