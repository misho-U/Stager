import {
  adminPageListResponseSchema,
  adminPageSchema,
  type AdminPage,
  type PageUpdateInput,
} from '@/entity/page/model/page.model';
import type { ListResponse } from '@/shared/types/api';
import type { PageKey } from '@/shared/types/enums';
import { clientFetch } from '@pkg/http/fetcher';

/**
 * Pages are addressed by their PageKey, not a generated id, and they cannot be
 * created or deleted — hence no CRUD factory.
 */
const BASE = '/api/admin/pages';

export async function fetchAdminPages(): Promise<ListResponse<AdminPage>> {
  const raw = await clientFetch<unknown>(BASE);
  return adminPageListResponseSchema.parse(raw);
}

export async function fetchAdminPage(key: PageKey): Promise<AdminPage> {
  const raw = await clientFetch<unknown>(`${BASE}/${key}`);
  return adminPageSchema.parse(raw);
}

export async function updateAdminPage(key: PageKey, input: PageUpdateInput): Promise<AdminPage> {
  const raw = await clientFetch<unknown>(`${BASE}/${key}`, { method: 'PATCH', body: input });
  return adminPageSchema.parse(raw);
}
