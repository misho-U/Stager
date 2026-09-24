import { z } from 'zod';

import { emailInput } from '@/shared/types/api';

import { adminRoleSchema } from '@/shared/types/enums';

/** The signed-in admin, as the dashboard sees them. */
export const adminSessionSchema = z.object({
  adminUserId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: adminRoleSchema,
});

export type AdminSessionView = z.infer<typeof adminSessionSchema>;

export const loginInputSchema = z.object({
  email: emailInput('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const loginResponseSchema = z.object({
  ok: z.literal(true),
  session: adminSessionSchema,
});
