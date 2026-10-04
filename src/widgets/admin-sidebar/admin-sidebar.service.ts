'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

import { unreadInquiriesQuery } from '@/entity/contact-inquiry/api/contact-inquiry.query';
import { useLogout } from '@/entity/session/api/session.query';

export function useAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logoutMutation = useLogout();
  // A failed count shows no badge: the inquiries page itself says what failed.
  const { data: unreadInquiries = 0 } = useQuery(unreadInquiriesQuery());

  /** A nav item is active for its own page and anything nested under it. */
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const signOut = async () => {
    await logoutMutation.mutateAsync();
    router.replace('/admin/login');
    router.refresh();
  };

  return { isActive, signOut, isSigningOut: logoutMutation.isPending, unreadInquiries };
}
