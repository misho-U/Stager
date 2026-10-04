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
  email: emailInput(),
  // Capped so a megabyte "password" is refused here rather than hashed by the
  // provider. Never trimmed: spaces are part of a password.
  password: z.string().min(8).max(256),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const loginResponseSchema = z.object({
  ok: z.literal(true),
  session: adminSessionSchema,
});
