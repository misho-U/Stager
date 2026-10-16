import { AdminServiceFormModule } from '@/modules/admin-service-form/admin-service-form.module';
import { FreshForm } from '@/shared/components/fresh-form';

export default function NewServicePage() {
  return (
    <FreshForm form="service">
      <AdminServiceFormModule />
    </FreshForm>
  );
}
