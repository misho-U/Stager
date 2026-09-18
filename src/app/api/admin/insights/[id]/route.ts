import { createItemRoutes } from '@/app/api/_lib/crud-route';
import {
  deleteInsight,
  getAdminInsight,
  updateInsight,
} from '@/app/api/_lib/repositories/insight.repository';
import {
  insightUpdateInputSchema,
  type AdminInsight,
  type InsightUpdateInput,
} from '@/entity/insight/model/insight.model';

export const dynamic = 'force-dynamic';

export const { GET, PATCH, DELETE } = createItemRoutes<AdminInsight, InsightUpdateInput>({
  entity: 'insight',
  entityType: 'Insight',
  updateSchema: insightUpdateInputSchema,
  get: getAdminInsight,
  update: updateInsight,
  remove: deleteInsight,
  cacheKeyOf: (insight) => insight.slug,
  auditSummary: (insight) => ({ slug: insight.slug, status: insight.status }),
  notFoundMessage: 'Article not found',
  conflict: { field: 'slug', message: 'An article with this slug already exists' },
});
