import { createItemRoutes } from '@/app/api/_lib/crud-route';
import {
  deleteProject,
  getAdminProject,
  updateProject,
} from '@/app/api/_lib/repositories/project.repository';
import {
  projectUpdateInputSchema,
  type AdminProject,
  type ProjectUpdateInput,
} from '@/entity/project/model/project.model';

export const dynamic = 'force-dynamic';

export const { GET, PATCH, DELETE } = createItemRoutes<AdminProject, ProjectUpdateInput>({
  entity: 'project',
  entityType: 'Project',
  updateSchema: projectUpdateInputSchema,
  get: getAdminProject,
  update: updateProject,
  remove: deleteProject,
  cacheKeyOf: (project) => project.slug,
  auditSummary: (project) => ({ slug: project.slug, status: project.status }),
  notFoundMessage: 'Project not found',
  conflict: { field: 'slug', message: 'A project with this slug already exists' },
});
