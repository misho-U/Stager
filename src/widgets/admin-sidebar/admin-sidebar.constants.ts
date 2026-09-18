export type AdminNavItem = {
  href: string;
  label: string;
  /** Grouping heading in the sidebar. */
  group: 'Content' | 'Site' | 'Inbox';
};

/**
 * The dashboard's navigation.
 *
 * Ordered by how often each screen is touched, not alphabetically: projects and
 * insights are the day-to-day work, settings is a once-a-quarter visit.
 */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin/projects', label: 'Projects', group: 'Content' },
  { href: '/admin/insights', label: 'Insights', group: 'Content' },
  { href: '/admin/services', label: 'Services', group: 'Content' },
  { href: '/admin/team', label: 'Team', group: 'Content' },
  { href: '/admin/categories', label: 'Categories', group: 'Content' },
  { href: '/admin/media', label: 'Media', group: 'Content' },

  { href: '/admin/pages', label: 'Page copy', group: 'Site' },
  { href: '/admin/social-links', label: 'Social links', group: 'Site' },
  { href: '/admin/settings', label: 'Settings', group: 'Site' },

  { href: '/admin/inquiries', label: 'Inquiries', group: 'Inbox' },
];

export const ADMIN_NAV_GROUPS = ['Content', 'Site', 'Inbox'] as const;
