import { createCollectionRoutes } from '@/app/api/_lib/crud-route';
import { createInsight, listAdminInsights } from '@/app/api/_lib/repositories/insight.repository';
import {
  insightInputSchema,
  type AdminInsight,
  type InsightInput,
} from '@/entity/insight/model/insight.model';

export const dynamic = 'force-dynamic';

export const { GET, POST } = createCollectionRoutes<AdminInsight, InsightInput>({
  entity: 'insight',
  entityType: 'Insight',
  inputSchema: insightInputSchema,
  list: listAdminInsights,
  create: createInsight,
  idOf: (insight) => insight.id,
  cacheKeyOf: (insight) => insight.slug,
  auditSummary: (insight) => ({ slug: insight.slug, status: insight.status }),
  conflict: { field: 'slug', message: 'An article with this slug already exists' },
});
