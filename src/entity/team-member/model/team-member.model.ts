import { z } from 'zod';

import { mediaSummarySchema } from '@/entity/media/model/media.model';
import {
  bothLocales,
  isoDateTime,
  listResponseSchema,
  mediaIdSchema,
  slugSchema,
} from '@/shared/types/api';
import { contentStatusSchema } from '@/shared/types/enums';

export const teamMemberTranslationSchema = z.object({
  name: z.string(),
  position: z.string(),
  bio: z.string(),
  expertise: z.string(),
});

export const adminTeamMemberSchema = z.object({
  id: z.string(),
  slug: z.string(),
  photoMediaId: z.string().nullable(),
  photoMedia: mediaSummarySchema.nullable(),
  email: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  status: contentStatusSchema,
  order: z.number().int(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  translations: bothLocales(teamMemberTranslationSchema),
});

export type AdminTeamMember = z.infer<typeof adminTeamMemberSchema>;

export const adminTeamMemberListResponseSchema = listResponseSchema(adminTeamMemberSchema);

export const publicTeamMemberSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  position: z.string(),
  bio: z.string(),
  expertise: z.string(),
  photo: mediaSummarySchema.nullable(),
  linkedinUrl: z.string().nullable(),
});

export type PublicTeamMember = z.infer<typeof publicTeamMemberSchema>;

export const publicTeamMemberListResponseSchema = listResponseSchema(publicTeamMemberSchema);

export const teamMemberTranslationInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(160),
  position: z.string().max(160).default(''),
  bio: z.string().max(4000).default(''),
  expertise: z.string().max(600).default(''),
});

export const teamMemberInputSchema = z.object({
  slug: slugSchema,
  photoMediaId: mediaIdSchema,
  email: z.email().nullish().or(z.literal('')),
  linkedinUrl: z.url().nullish().or(z.literal('')),
  status: contentStatusSchema.default('DRAFT'),
  order: z.number().int().min(0).default(0),
  translations: bothLocales(teamMemberTranslationInputSchema),
});

/** Validated values, with schema defaults applied. */
export type TeamMemberInput = z.output<typeof teamMemberInputSchema>;

/** Raw form values, before defaults are applied. See the useForm generics. */
export type TeamMemberFormValues = z.input<typeof teamMemberInputSchema>;

export const teamMemberUpdateInputSchema = teamMemberInputSchema.partial();
export type TeamMemberUpdateInput = z.output<typeof teamMemberUpdateInputSchema>;
