import { z } from 'zod';

import { emailInput, isoDateTime, listResponseSchema } from '@/shared/types/api';
import { dbLocaleSchema, inquiryInterestSchema, inquiryStatusSchema } from '@/shared/types/enums';

export const adminContactInquirySchema = z.object({
  id: z.string(),
  name: z.string(),
  company: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  interest: inquiryInterestSchema,
  message: z.string(),
  locale: dbLocaleSchema,
  status: inquiryStatusSchema,
  /** Null when Resend rejected the notification — the record is still safe here. */
  notifiedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
});

export type AdminContactInquiry = z.infer<typeof adminContactInquirySchema>;

/**
 * The two halves of the inbox: what still needs handling (new and read), and
 * what has been put away (archived).
 */
export const INQUIRY_VIEWS = ['inbox', 'archived'] as const;
export const inquiryViewSchema = z.enum(INQUIRY_VIEWS);
export type InquiryView = z.infer<typeof inquiryViewSchema>;

/** How many the list holds at most; `total` says how many there are. */
export const INQUIRY_LIST_LIMIT = 500;

export const adminContactInquiryListResponseSchema = listResponseSchema(
  adminContactInquirySchema,
).extend({
  /** For the view switch: how many each half holds, and how many are new. */
  counts: z.object({
    inbox: z.number().int().nonnegative(),
    archived: z.number().int().nonnegative(),
    unread: z.number().int().nonnegative(),
  }),
  /**
   * Whether new inquiries are emailed at all. Until email is set up none is,
   * and the page says so once, instead of "could not be sent" on every one.
   */
  emailOn: z.boolean(),
});

export type AdminContactInquiryList = z.infer<typeof adminContactInquiryListResponseSchema>;

/** The sidebar's badge: inquiries no one has marked read yet. */
export const unreadInquiriesSchema = z.object({ count: z.number().int().nonnegative() });

/**
 * Public submission payload.
 *
 * `website` is a honeypot: it is rendered off-screen and hidden from assistive
 * technology, so a human never fills it in and a naive bot always does. Paired
 * with `elapsedMs`, which catches anything that submits faster than a person
 * could read the form.
 */
export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(160),
  company: z.string().trim().max(160).nullish(),
  email: emailInput('Enter a valid email address'),
  phone: z.string().trim().max(60).nullish(),
  interest: inquiryInterestSchema,
  message: z.string().trim().min(10, 'Please tell us a little more').max(5000),
  locale: dbLocaleSchema,
  // Any value is accepted here and dropped by the route: refusing it with a
  // 422 named the field, which tells a bot exactly what tripped it.
  website: z.string().max(500).optional(),
  elapsedMs: z
    .number()
    .int()
    .nonnegative()
    .max(2 ** 31 - 1)
    .optional(),
});

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;

export const contactSubmissionResponseSchema = z.object({
  ok: z.literal(true),
  id: z.string(),
});

export const inquiryStatusUpdateSchema = z.object({
  status: inquiryStatusSchema,
});

export type InquiryStatusUpdate = z.infer<typeof inquiryStatusUpdateSchema>;

/** Anything faster than this is not a person reading and filling a form. */
export const MIN_FORM_FILL_MS = 3000;
