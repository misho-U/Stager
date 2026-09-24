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

export const adminContactInquiryListResponseSchema = listResponseSchema(adminContactInquirySchema);

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
  website: z.string().max(0, 'Unexpected value').optional(),
  elapsedMs: z.number().int().nonnegative().optional(),
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
