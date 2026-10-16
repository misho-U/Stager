import { AdminProjectFormModule } from '@/modules/admin-project-form/admin-project-form.module';
import { FreshForm } from '@/shared/components/fresh-form';

export default function NewProjectPage() {
  return (
    <FreshForm form="project">
      <AdminProjectFormModule />
    </FreshForm>
  );
}
