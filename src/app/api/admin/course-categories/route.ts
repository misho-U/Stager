import { createCollectionRoutes } from '@/app/api/_lib/crud-route';
import {
  createCourseCategory,
  listAdminCourseCategories,
} from '@/app/api/_lib/repositories/course-category.repository';
import {
  courseCategoryInputSchema,
  type AdminCourseCategory,
  type CourseCategoryInput,
} from '@/entity/course-category/model/course-category.model';

export const dynamic = 'force-dynamic';

export const { GET, POST } = createCollectionRoutes<AdminCourseCategory, CourseCategoryInput>({
  entity: 'courseCategory',
  entityType: 'CourseCategory',
  inputSchema: courseCategoryInputSchema,
  list: listAdminCourseCategories,
  create: createCourseCategory,
  idOf: (category) => category.id,
  cacheKeyOf: (category) => category.slug,
  auditSummary: (category) => ({ slug: category.slug }),
  conflict: { field: 'slug', message: 'A course category with this slug already exists' },
});
