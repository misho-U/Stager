import {
  adminProjectSchema,
  type AdminProject,
  type ProjectInput,
  type ProjectUpdateInput,
} from '@/entity/project/model/project.model';
import { createCrudApi } from '@/shared/lib/crud-resource';

/**
 * HTTP calls for projects.
 *
 * Only project.query.ts may import this. Components use the query hooks, so a
 * write can never bypass cache invalidation.
 */
export const projectApi = createCrudApi<AdminProject, ProjectInput, ProjectUpdateInput>({
  basePath: '/api/admin/projects',
  recordSchema: adminProjectSchema,
});
