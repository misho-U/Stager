import { courseCategoryApi } from '@/entity/course-category/api/course-category.api';
import type {
  AdminCourseCategory,
  CourseCategoryInput,
  CourseCategoryUpdateInput,
} from '@/entity/course-category/model/course-category.model';
import { createCrudQueries } from '@/shared/lib/crud-resource';

export const {
  keys: courseCategoryKeys,
  listQuery: adminCourseCategoriesQuery,
  detailQuery: adminCourseCategoryQuery,
  useCreate: useCreateCourseCategory,
  useUpdate: useUpdateCourseCategory,
  useDelete: useDeleteCourseCategory,
} = createCrudQueries<AdminCourseCategory, CourseCategoryInput, CourseCategoryUpdateInput>({
  resource: 'course-categories',
  api: courseCategoryApi,
});
