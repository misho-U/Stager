import { AdminInsightFormModule } from '@/modules/admin-insight-form/admin-insight-form.module';
import { FreshForm } from '@/shared/components/fresh-form';

export default function NewInsightPage() {
  return (
    <FreshForm form="insight">
      <AdminInsightFormModule />
    </FreshForm>
  );
}
