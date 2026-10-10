import { createCollectionRoutes } from '@/app/api/_lib/crud-route';
import { createStat, listAdminStats } from '@/app/api/_lib/repositories/stat.repository';
import { statInputSchema, type AdminStat, type StatInput } from '@/entity/stat/model/stat.model';

export const dynamic = 'force-dynamic';

// "company-stats", because /api/admin/stats is the dashboard's own counts.
export const { GET, POST } = createCollectionRoutes<AdminStat, StatInput>({
  entity: 'stat',
  entityType: 'Stat',
  inputSchema: statInputSchema,
  list: listAdminStats,
  create: createStat,
  idOf: (stat) => stat.id,
  cacheKeyOf: () => null,
  auditSummary: (stat) => ({ value: stat.value }),
});
