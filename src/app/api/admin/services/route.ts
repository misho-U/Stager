import { createCollectionRoutes } from '@/app/api/_lib/crud-route';
import { createService, listAdminServices } from '@/app/api/_lib/repositories/service.repository';
import {
  serviceInputSchema,
  type AdminService,
  type ServiceInput,
} from '@/entity/service/model/service.model';

export const dynamic = 'force-dynamic';

export const { GET, POST } = createCollectionRoutes<AdminService, ServiceInput>({
  entity: 'service',
  entityType: 'Service',
  inputSchema: serviceInputSchema,
  list: listAdminServices,
  create: createService,
  idOf: (service) => service.id,
  cacheKeyOf: (service) => service.slug,
  auditSummary: (service) => ({ slug: service.slug, status: service.status }),
  conflict: { field: 'slug', message: 'A service with this slug already exists' },
});
