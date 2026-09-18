import { AdminServiceFormModule } from '@/modules/admin-service-form/admin-service-form.module';

export const dynamic = 'force-dynamic';

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminServiceFormModule serviceId={id} />;
}
