import { createItemRoutes } from '@/app/api/_lib/crud-route';
import { deleteStat, getAdminStat, updateStat } from '@/app/api/_lib/repositories/stat.repository';
import {
  statUpdateInputSchema,
  type AdminStat,
  type StatUpdateInput,
} from '@/entity/stat/model/stat.model';

export const dynamic = 'force-dynamic';

export const { GET, PATCH, DELETE } = createItemRoutes<AdminStat, StatUpdateInput>({
  entity: 'stat',
  entityType: 'Stat',
  updateSchema: statUpdateInputSchema,
  get: getAdminStat,
  update: updateStat,
  remove: deleteStat,
  cacheKeyOf: () => null,
  auditSummary: (stat) => ({ value: stat.value }),
  notFoundMessage: 'Figure not found',
});
