import { createItemRoutes } from '@/app/api/_lib/crud-route';
import {
  deleteService,
  getAdminService,
  updateService,
} from '@/app/api/_lib/repositories/service.repository';
import {
  serviceUpdateInputSchema,
  type AdminService,
  type ServiceUpdateInput,
} from '@/entity/service/model/service.model';

export const dynamic = 'force-dynamic';

export const { GET, PATCH, DELETE } = createItemRoutes<AdminService, ServiceUpdateInput>({
  entity: 'service',
  entityType: 'Service',
  updateSchema: serviceUpdateInputSchema,
  get: getAdminService,
  update: updateService,
  remove: deleteService,
  cacheKeyOf: (service) => service.slug,
  auditSummary: (service) => ({ slug: service.slug, status: service.status }),
  notFoundMessage: 'Service not found',
  conflict: { field: 'slug', message: 'A service with this slug already exists' },
});
