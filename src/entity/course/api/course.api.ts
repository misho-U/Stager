import {
  adminCourseSchema,
  type AdminCourse,
  type CourseInput,
  type CourseUpdateInput,
} from '@/entity/course/model/course.model';
import { createCrudApi } from '@/shared/lib/crud-resource';

export const courseApi = createCrudApi<AdminCourse, CourseInput, CourseUpdateInput>({
  basePath: '/api/admin/courses',
  recordSchema: adminCourseSchema,
});
