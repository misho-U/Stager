import { AdminTeamFormModule } from '@/modules/admin-team-form/admin-team-form.module';
import { FreshForm } from '@/shared/components/fresh-form';

export default function NewTeamMemberPage() {
  return (
    <FreshForm form="team">
      <AdminTeamFormModule />
    </FreshForm>
  );
}
