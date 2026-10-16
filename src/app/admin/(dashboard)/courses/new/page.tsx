import { AdminCourseFormModule } from '@/modules/admin-course-form/admin-course-form.module';
import { FreshForm } from '@/shared/components/fresh-form';

export default function NewCoursePage() {
  return (
    <FreshForm form="course">
      <AdminCourseFormModule />
    </FreshForm>
  );
}
