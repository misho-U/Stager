import { courseApi } from '@/entity/course/api/course.api';
import type {
  AdminCourse,
  CourseInput,
  CourseUpdateInput,
} from '@/entity/course/model/course.model';
import { createCrudQueries } from '@/shared/lib/crud-resource';

export const {
  keys: courseKeys,
  listQuery: adminCoursesQuery,
  detailQuery: adminCourseQuery,
  useCreate: useCreateCourse,
  useUpdate: useUpdateCourse,
  useDelete: useDeleteCourse,
} = createCrudQueries<AdminCourse, CourseInput, CourseUpdateInput>({
  resource: 'courses',
  api: courseApi,
});
