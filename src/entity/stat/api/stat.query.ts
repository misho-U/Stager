import { statApi } from '@/entity/stat/api/stat.api';
import type { AdminStat, StatInput, StatUpdateInput } from '@/entity/stat/model/stat.model';
import { createCrudQueries } from '@/shared/lib/crud-resource';

export const {
  keys: statKeys,
  listQuery: adminStatsQuery,
  useCreate: useCreateStat,
  useUpdate: useUpdateStat,
  useDelete: useDeleteStat,
} = createCrudQueries<AdminStat, StatInput, StatUpdateInput>({
  resource: 'companyStats',
  api: statApi,
});
