import { notFound } from 'next/navigation';

import { AdminPageEditorModule } from '@/modules/admin-page-editor/admin-page-editor.module';
import { pageKeySchema } from '@/shared/types/enums';

export const dynamic = 'force-dynamic';

export default async function AdminPageEditorPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const parsed = pageKeySchema.safeParse(key.toUpperCase());

  if (!parsed.success) notFound();

  return <AdminPageEditorModule pageKey={parsed.data} />;
}
