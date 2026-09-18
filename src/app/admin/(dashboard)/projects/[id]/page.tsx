import { AdminProjectFormModule } from '@/modules/admin-project-form/admin-project-form.module';

export const dynamic = 'force-dynamic';

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminProjectFormModule projectId={id} />;
}
