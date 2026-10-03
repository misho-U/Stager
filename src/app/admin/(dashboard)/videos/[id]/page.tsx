import { AdminVideoFormModule } from '@/modules/admin-video-form/admin-video-form.module';

export const dynamic = 'force-dynamic';

export default async function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminVideoFormModule videoId={id} />;
}
