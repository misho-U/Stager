import {
  adminCourseCategorySchema,
  type AdminCourseCategory,
  type CourseCategoryInput,
  type CourseCategoryUpdateInput,
} from '@/entity/course-category/model/course-category.model';
import { createCrudApi } from '@/shared/lib/crud-resource';

export const courseCategoryApi = createCrudApi<
  AdminCourseCategory,
  CourseCategoryInput,
  CourseCategoryUpdateInput
>({
  basePath: '/api/admin/course-categories',
  recordSchema: adminCourseCategorySchema,
});
