import { createItemRoutes } from '@/app/api/_lib/crud-route';
import {
  deleteCourseCategory,
  getAdminCourseCategory,
  updateCourseCategory,
} from '@/app/api/_lib/repositories/course-category.repository';
import {
  courseCategoryUpdateInputSchema,
  type AdminCourseCategory,
  type CourseCategoryUpdateInput,
} from '@/entity/course-category/model/course-category.model';

export const dynamic = 'force-dynamic';

export const { GET, PATCH, DELETE } = createItemRoutes<
  AdminCourseCategory,
  CourseCategoryUpdateInput
>({
  entity: 'courseCategory',
  entityType: 'CourseCategory',
  updateSchema: courseCategoryUpdateInputSchema,
  get: getAdminCourseCategory,
  update: updateCourseCategory,
  remove: deleteCourseCategory,
  cacheKeyOf: (category) => category.slug,
  auditSummary: (category) => ({ slug: category.slug }),
  notFoundMessage: 'Course category not found',
  conflict: { field: 'slug', message: 'A course category with this slug already exists' },
});
