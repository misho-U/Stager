'use client';

import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

import { useLogout } from '@/entity/session/api/session.query';

export function useAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logoutMutation = useLogout();

  /** A nav item is active for its own page and anything nested under it. */
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const signOut = async () => {
    await logoutMutation.mutateAsync();
    router.replace('/admin/login');
    router.refresh();
  };

  return { isActive, signOut, isSigningOut: logoutMutation.isPending };
}
