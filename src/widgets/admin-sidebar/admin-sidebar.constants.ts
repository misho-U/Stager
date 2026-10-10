export type AdminNavGroup = 'content' | 'site' | 'inbox';

export type AdminNavItem = {
  href: string;
  /** Key under `admin.sidebar.nav` in the dashboard's message files. */
  labelKey:
    | 'projects'
    | 'insights'
    | 'services'
    | 'courses'
    | 'videos'
    | 'team'
    | 'media'
    | 'pages'
    | 'socialLinks'
    | 'settings'
    | 'inquiries';
  /** Grouping heading in the sidebar, under `admin.sidebar.groups`. */
  group: AdminNavGroup;
};

/**
 * The dashboard's navigation.
 *
 * Ordered by how often each screen is touched, not alphabetically: projects and
 * insights are the day-to-day work, settings is a once-a-quarter visit.
 *
 * Categories are reached from the screen they sort (Insights, Courses), not
 * from here: with two kinds, a bare "Categories" would be ambiguous, and every
 * row counts against a sidebar sized to fit a laptop screen. For that reason
 * the company's figures, home page content, are reached from Page copy (and
 * the dashboard's shortcuts).
 */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin/projects', labelKey: 'projects', group: 'content' },
  { href: '/admin/insights', labelKey: 'insights', group: 'content' },
  { href: '/admin/services', labelKey: 'services', group: 'content' },
  { href: '/admin/courses', labelKey: 'courses', group: 'content' },
  { href: '/admin/videos', labelKey: 'videos', group: 'content' },
  { href: '/admin/team', labelKey: 'team', group: 'content' },
  { href: '/admin/media', labelKey: 'media', group: 'content' },

  { href: '/admin/pages', labelKey: 'pages', group: 'site' },
  { href: '/admin/social-links', labelKey: 'socialLinks', group: 'site' },
  { href: '/admin/settings', labelKey: 'settings', group: 'site' },

  { href: '/admin/inquiries', labelKey: 'inquiries', group: 'inbox' },
];

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = ['content', 'site', 'inbox'];
