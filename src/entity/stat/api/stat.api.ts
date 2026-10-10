import {
  adminStatSchema,
  type AdminStat,
  type StatInput,
  type StatUpdateInput,
} from '@/entity/stat/model/stat.model';
import { createCrudApi } from '@/shared/lib/crud-resource';

export const statApi = createCrudApi<AdminStat, StatInput, StatUpdateInput>({
  basePath: '/api/admin/company-stats',
  recordSchema: adminStatSchema,
});
