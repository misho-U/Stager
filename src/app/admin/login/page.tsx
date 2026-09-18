import { Suspense } from 'react';

import { AdminLoginModule } from '@/modules/admin-login/admin-login.module';

export const dynamic = 'force-dynamic';

/**
 * Page files stay this thin by design: routing and metadata here, markup and
 * behaviour in the module. See AGENTS.md.
 *
 * Suspense is required because the module reads `next` from useSearchParams.
 */
export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginModule />
    </Suspense>
  );
}
