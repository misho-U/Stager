import { AdminTeamFormModule } from '@/modules/admin-team-form/admin-team-form.module';

export const dynamic = 'force-dynamic';

export default async function EditTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminTeamFormModule memberId={id} />;
}
