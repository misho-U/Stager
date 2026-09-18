import { AdminInsightFormModule } from '@/modules/admin-insight-form/admin-insight-form.module';

export const dynamic = 'force-dynamic';

export default async function EditInsightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminInsightFormModule insightId={id} />;
}
