import { CONTENT_STATUSES, INQUIRY_INTERESTS, SOCIAL_PLATFORMS } from '@/shared/types/enums';

/** Title-cases an enum member for display: PUBLISHED → Published. */
function toLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Select options shared across admin forms.
 *
 * These live in shared rather than in one module's constants file because
 * several modules need them, and a module may not import from another module.
 */
export const STATUS_OPTIONS = CONTENT_STATUSES.map((status) => ({
  value: status,
  label: toLabel(status),
}));

export const SOCIAL_PLATFORM_OPTIONS = SOCIAL_PLATFORMS.map((platform) => ({
  value: platform,
  label: toLabel(platform),
}));

export const INQUIRY_INTEREST_OPTIONS = INQUIRY_INTERESTS.map((interest) => ({
  value: interest,
  label: toLabel(interest),
}));

export const LOCALE_OPTIONS = [
  { value: 'KA', label: 'ქართული' },
  { value: 'EN', label: 'English' },
];

/** Turns a title into a URL-safe slug. Latin only — Georgian transliterates away. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
