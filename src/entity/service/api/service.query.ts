import { serviceApi } from '@/entity/service/api/service.api';
import type {
  AdminService,
  ServiceInput,
  ServiceUpdateInput,
} from '@/entity/service/model/service.model';
import { createCrudQueries } from '@/shared/lib/crud-resource';

export const {
  keys: serviceKeys,
  listQuery: adminServicesQuery,
  detailQuery: adminServiceQuery,
  useCreate: useCreateService,
  useUpdate: useUpdateService,
  useDelete: useDeleteService,
} = createCrudQueries<AdminService, ServiceInput, ServiceUpdateInput>({
  resource: 'services',
  api: serviceApi,
});
