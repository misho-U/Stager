import {
  adminServiceSchema,
  type AdminService,
  type ServiceInput,
  type ServiceUpdateInput,
} from '@/entity/service/model/service.model';
import { createCrudApi } from '@/shared/lib/crud-resource';

export const serviceApi = createCrudApi<AdminService, ServiceInput, ServiceUpdateInput>({
  basePath: '/api/admin/services',
  recordSchema: adminServiceSchema,
});
