import { createCollectionRoutes } from '@/app/api/_lib/crud-route';
import { createCourse, listAdminCourses } from '@/app/api/_lib/repositories/course.repository';
import {
  courseInputSchema,
  type AdminCourse,
  type CourseInput,
} from '@/entity/course/model/course.model';

export const dynamic = 'force-dynamic';

export const { GET, POST } = createCollectionRoutes<AdminCourse, CourseInput>({
  entity: 'course',
  entityType: 'Course',
  inputSchema: courseInputSchema,
  list: listAdminCourses,
  create: createCourse,
  idOf: (course) => course.id,
  cacheKeyOf: (course) => course.slug,
  auditSummary: (course) => ({ slug: course.slug, status: course.status }),
  conflict: { field: 'slug', message: 'A course with this slug already exists' },
});
