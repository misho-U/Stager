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

/**
 * The shortest new password the dashboard accepts. Twelve characters: the
 * account guards the whole site, and a sentence of four words is easier to
 * remember than eight characters of symbols.
 */
export const PASSWORD_MIN = 12;

/**
 * A new password, set from Settings by whoever is signed in. The current one
 * is asked again, so a laptop left signed in cannot be used to lock the owner
 * out. Never trimmed: spaces are part of a password. Capped at 72, the most
 * Supabase Auth reads.
 */
export const passwordChangeInputSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z.string().min(PASSWORD_MIN).max(72),
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.confirmPassword === value.newPassword, {
    path: ['confirmPassword'],
    params: { key: 'passwordsDiffer' },
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    params: { key: 'passwordUnchanged' },
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeInputSchema>;

export const passwordChangeResponseSchema = z.object({ changed: z.literal(true) });

export const loginResponseSchema = z.object({
  ok: z.literal(true),
  session: adminSessionSchema,
});
