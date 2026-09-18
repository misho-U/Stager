import { createCollectionRoutes } from '@/app/api/_lib/crud-route';
import { createProject, listAdminProjects } from '@/app/api/_lib/repositories/project.repository';
import {
  projectInputSchema,
  type AdminProject,
  type ProjectInput,
} from '@/entity/project/model/project.model';

/** Admin views always read through, never from a cache. */
export const dynamic = 'force-dynamic';

export const { GET, POST } = createCollectionRoutes<AdminProject, ProjectInput>({
  entity: 'project',
  entityType: 'Project',
  inputSchema: projectInputSchema,
  list: listAdminProjects,
  create: createProject,
  idOf: (project) => project.id,
  cacheKeyOf: (project) => project.slug,
  auditSummary: (project) => ({ slug: project.slug, status: project.status }),
  conflict: { field: 'slug', message: 'A project with this slug already exists' },
});
