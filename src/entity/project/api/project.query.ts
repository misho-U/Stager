import { projectApi } from '@/entity/project/api/project.api';
import type {
  AdminProject,
  ProjectInput,
  ProjectUpdateInput,
} from '@/entity/project/model/project.model';
import { createCrudQueries } from '@/shared/lib/crud-resource';

export const {
  keys: projectKeys,
  listQuery: adminProjectsQuery,
  detailQuery: adminProjectQuery,
  useCreate: useCreateProject,
  useUpdate: useUpdateProject,
  useDelete: useDeleteProject,
} = createCrudQueries<AdminProject, ProjectInput, ProjectUpdateInput>({
  resource: 'projects',
  api: projectApi,
});
