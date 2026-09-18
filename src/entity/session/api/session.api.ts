import {
  adminSessionSchema,
  loginResponseSchema,
  type AdminSessionView,
  type LoginInput,
} from '@/entity/session/model/session.model';
import { clientFetch } from '@pkg/http/fetcher';

/**
 * Sign-in runs through our own route, not the Supabase browser client.
 *
 * That gives one place to apply rate limiting, to check the AdminUser
 * allowlist before handing back a usable session, and to write the audit log
 * entry. A browser-side signIn would skip all three.
 */
export async function login(input: LoginInput) {
  const raw = await clientFetch<unknown>('/api/auth/login', { method: 'POST', body: input });
  return loginResponseSchema.parse(raw);
}

export async function logout(): Promise<void> {
  await clientFetch<void>('/api/auth/logout', { method: 'POST' });
}

export async function fetchCurrentSession(): Promise<AdminSessionView> {
  const raw = await clientFetch<unknown>('/api/auth/session');
  return adminSessionSchema.parse(raw);
}
