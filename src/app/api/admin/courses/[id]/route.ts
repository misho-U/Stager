import { createItemRoutes } from '@/app/api/_lib/crud-route';
import {
  deleteCourse,
  getAdminCourse,
  updateCourse,
} from '@/app/api/_lib/repositories/course.repository';
import {
  courseUpdateInputSchema,
  type AdminCourse,
  type CourseUpdateInput,
} from '@/entity/course/model/course.model';

export const dynamic = 'force-dynamic';

export const { GET, PATCH, DELETE } = createItemRoutes<AdminCourse, CourseUpdateInput>({
  entity: 'course',
  entityType: 'Course',
  updateSchema: courseUpdateInputSchema,
  get: getAdminCourse,
  update: updateCourse,
  remove: deleteCourse,
  cacheKeyOf: (course) => course.slug,
  auditSummary: (course) => ({ slug: course.slug, status: course.status }),
  notFoundMessage: 'Course not found',
  conflict: { field: 'slug', message: 'A course with this slug already exists' },
});
