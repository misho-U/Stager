'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { adminCategoriesQuery } from '@/entity/category/api/category.query';
import {
  inquiriesQuery,
  unreadInquiriesQuery,
} from '@/entity/contact-inquiry/api/contact-inquiry.query';
import { adminCourseCategoriesQuery } from '@/entity/course-category/api/course-category.query';
import { adminCoursesQuery } from '@/entity/course/api/course.query';
import { dashboardCountsQuery } from '@/entity/dashboard/api/dashboard.query';
import { adminInsightsQuery } from '@/entity/insight/api/insight.query';
import { mediaListQuery } from '@/entity/media/api/media.query';
import { adminPagesQuery } from '@/entity/page/api/page.query';
import { adminProjectsQuery } from '@/entity/project/api/project.query';
import { adminServicesQuery } from '@/entity/service/api/service.query';
import { useLogout } from '@/entity/session/api/session.query';
import { siteSettingsQuery } from '@/entity/site-setting/api/site-setting.query';
import { adminSocialLinksQuery } from '@/entity/social-link/api/social-link.query';
import { adminStatsQuery } from '@/entity/stat/api/stat.query';
import { adminTeamMembersQuery } from '@/entity/team-member/api/team-member.query';
import { adminVideosQuery } from '@/entity/video/api/video.query';
import { ADMIN_SUBPAGES } from '@/widgets/admin-sidebar/admin-sidebar.constants';

export function useAdminSidebar() {
  const pathname = usePathname();
  const logoutMutation = useLogout();
  // A failed count shows no badge: the inquiries page itself says what failed.
  const { data: unreadInquiries = 0 } = useQuery(unreadInquiriesQuery());
  const warm = useAdminPrefetch();

  /** A nav item is active for its own page and anything nested under it. */
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  /**
   * Leaves by a full page load, not a client navigation: that drops every page
   * the router kept (for minutes, so the dashboard moves instantly), as
   * useLogout drops every list, so Back after signing out can never show the
   * dashboard as it was.
   */
  const signOut = async () => {
    await logoutMutation.mutateAsync();
    window.location.replace('/admin/login');
  };

  return {
    isActive,
    signOut,
    isSigningOut: logoutMutation.isPending,
    unreadInquiries,
    warm,
  };
}

/** How long a page has been open before the dashboard warms the rest. */
const SETTLE_MS = 1_000;

/**
 * After sign-in, warm every page and list the dashboard has, so opening one is
 * instant: the menu's links fetch their pages whole (`prefetch={warm}`,
 * admin-sidebar.module.tsx), this adds the pages reached from other screens
 * (ADMIN_SUBPAGES), and the data every page shows first.
 *
 * Not at once: a full load of a dashboard page warms everything, about fifty
 * requests that each check the session. So it waits until the page has been
 * open a second and the browser is idle (a reload or a quick hop never pays
 * for it, and the page being opened is never slowed by it), then fetches the
 * data one request at a time. Data loaded here stays current for five
 * minutes (shared/components/query-provider.tsx); a list already current is
 * not asked for again. Returns whether warming has begun.
 */
function useAdminPrefetch(): boolean {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    // Safari has no requestIdleCallback: the settle time alone stands in.
    let idleHandle: number | undefined;
    const settle = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        idleHandle = window.requestIdleCallback(() => setWarm(true), { timeout: 2_000 });
      } else {
        setWarm(true);
      }
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(settle);
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
    };
  }, []);

  useEffect(() => {
    if (!warm) return;
    let cancelled = false;
    const steps: Array<() => Promise<void>> = [
      () => queryClient.prefetchQuery(dashboardCountsQuery()),
      () => queryClient.prefetchQuery(adminProjectsQuery()),
      () => queryClient.prefetchQuery(adminInsightsQuery()),
      () => queryClient.prefetchQuery(adminServicesQuery()),
      () => queryClient.prefetchQuery(adminCoursesQuery()),
      () => queryClient.prefetchQuery(adminVideosQuery()),
      () => queryClient.prefetchQuery(adminTeamMembersQuery()),
      () => queryClient.prefetchQuery(mediaListQuery()),
      () => queryClient.prefetchQuery(adminPagesQuery()),
      () => queryClient.prefetchQuery(adminSocialLinksQuery()),
      () => queryClient.prefetchQuery(siteSettingsQuery()),
      () => queryClient.prefetchQuery(inquiriesQuery('inbox')),
      // What the edit forms and the other lists read beside their own record.
      () => queryClient.prefetchQuery(adminCategoriesQuery()),
      () => queryClient.prefetchQuery(adminCourseCategoriesQuery()),
      () => queryClient.prefetchQuery(adminStatsQuery()),
    ];

    void (async () => {
      for (const href of ADMIN_SUBPAGES) router.prefetch(href);
      for (const step of steps) {
        if (cancelled) return;
        // prefetchQuery never throws: a failed list is asked for again when
        // its page opens, which then says what failed.
        await step();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [warm, router, queryClient]);

  return warm;
}
