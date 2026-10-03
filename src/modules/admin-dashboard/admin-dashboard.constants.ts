/** Each key names its label and description under `admin.dashboard.shortcuts`. */
export const DASHBOARD_SHORTCUTS = [
  { href: '/admin/projects/new', key: 'addProject' },
  { href: '/admin/insights/new', key: 'writeArticle' },
  { href: '/admin/courses/new', key: 'addCourse' },
  { href: '/admin/pages', key: 'editPages' },
  { href: '/admin/settings', key: 'settings' },
] as const;
