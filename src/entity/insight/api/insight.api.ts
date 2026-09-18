import {
  adminInsightSchema,
  type AdminInsight,
  type InsightInput,
  type InsightUpdateInput,
} from '@/entity/insight/model/insight.model';
import { createCrudApi } from '@/shared/lib/crud-resource';

export const insightApi = createCrudApi<AdminInsight, InsightInput, InsightUpdateInput>({
  basePath: '/api/admin/insights',
  recordSchema: adminInsightSchema,
});
