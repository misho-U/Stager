import { insightApi } from '@/entity/insight/api/insight.api';
import type {
  AdminInsight,
  InsightInput,
  InsightUpdateInput,
} from '@/entity/insight/model/insight.model';
import { createCrudQueries } from '@/shared/lib/crud-resource';

export const {
  keys: insightKeys,
  listQuery: adminInsightsQuery,
  detailQuery: adminInsightQuery,
  useCreate: useCreateInsight,
  useUpdate: useUpdateInsight,
  useDelete: useDeleteInsight,
} = createCrudQueries<AdminInsight, InsightInput, InsightUpdateInput>({
  resource: 'insights',
  api: insightApi,
});
