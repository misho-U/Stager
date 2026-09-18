import { z } from 'zod';

import { dbLocaleSchema } from '@/shared/types/enums';

/**
 * Public endpoints are always locale-scoped.
 *
 * The locale is a required parameter rather than something inferred from an
 * Accept-Language header, because these responses are cached: a response that
 * varied by header would be served to the wrong language's visitors.
 */
export const localeQuerySchema = z.object({ locale: dbLocaleSchema });

export const listQuerySchema = z.object({
  locale: dbLocaleSchema,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const insightListQuerySchema = listQuerySchema.extend({
  category: z.string().min(1).optional(),
});
