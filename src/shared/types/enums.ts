import { z } from 'zod';

/**
 * Content enums, defined independently of Prisma.
 *
 * The frontend must never import @prisma/client — that would pull the database
 * client into the browser bundle and couple every component to the ORM. These
 * mirror the enums in prisma/schema.prisma as plain string unions.
 *
 * Drift is caught at compile time, not at runtime: route handlers assign these
 * values to Prisma's own enum types, so renaming a member in the schema without
 * updating this file fails `pnpm typecheck`.
 */

export const contentStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

export const dbLocaleSchema = z.enum(['KA', 'EN']);
export type DbLocale = z.infer<typeof dbLocaleSchema>;

export const adminRoleSchema = z.enum(['OWNER', 'EDITOR']);
export type AdminRole = z.infer<typeof adminRoleSchema>;

export const pageKeySchema = z.enum([
  'HOME',
  'ABOUT',
  'SERVICES',
  'PROJECTS',
  'TEAM',
  'INSIGHTS',
  'CONTACT',
]);
export type PageKey = z.infer<typeof pageKeySchema>;

export const inquiryInterestSchema = z.enum([
  'NEW_FOOD_BUSINESS',
  'MENU_DEVELOPMENT',
  'KITCHEN_OPERATIONS',
  'TRAINING',
  'HACCP_FOOD_SAFETY',
  'CONSULTING',
  'OTHER',
]);
export type InquiryInterest = z.infer<typeof inquiryInterestSchema>;

export const inquiryStatusSchema = z.enum(['NEW', 'READ', 'ARCHIVED']);
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

export const socialPlatformSchema = z.enum([
  'FACEBOOK',
  'INSTAGRAM',
  'LINKEDIN',
  'YOUTUBE',
  'TIKTOK',
  'X',
  'OTHER',
]);
export type SocialPlatform = z.infer<typeof socialPlatformSchema>;

/** Ordered for admin dropdowns. */
export const CONTENT_STATUSES = contentStatusSchema.options;
export const DB_LOCALES = dbLocaleSchema.options;
export const INQUIRY_INTERESTS = inquiryInterestSchema.options;
export const SOCIAL_PLATFORMS = socialPlatformSchema.options;
