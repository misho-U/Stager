import { AdminCourseFormModule } from '@/modules/admin-course-form/admin-course-form.module';

export const dynamic = 'force-dynamic';

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminCourseFormModule courseId={id} />;
}
