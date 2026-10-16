import { AdminVideoFormModule } from '@/modules/admin-video-form/admin-video-form.module';
import { FreshForm } from '@/shared/components/fresh-form';

export default function NewVideoPage() {
  return (
    <FreshForm form="video">
      <AdminVideoFormModule />
    </FreshForm>
  );
}
