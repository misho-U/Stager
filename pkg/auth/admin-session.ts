import 'server-only';

import { cache } from 'react';

import { ForbiddenError, UnauthenticatedError } from '@pkg/auth/errors';
import { prisma } from '@pkg/db/prisma';
import { getSupabaseUser } from '@pkg/supabase/server';

export type AdminRole = 'OWNER' | 'EDITOR';

export type AdminSession = {
  adminUserId: string;
  supabaseUserId: string;
  email: string;
  name: string | null;
  role: AdminRole;
};

/**
 * Who is asking, as far as the dashboard is concerned:
 *
 *  - `anonymous`: no valid Supabase session. Sign in.
 *  - `denied`: a valid Supabase session for an account that may not use the
 *    dashboard: never on the allowlist, or switched off since. Signing in
 *    again cannot help, so it must not be sent to the login page (which sends
 *    anyone with a session straight back here).
 *  - `admin`: both conditions hold.
 */
export type AdminAccess =
  | { state: 'anonymous' }
  | { state: 'denied'; email: string | null }
  | { state: 'admin'; session: AdminSession };

/**
 * Resolve the current visitor's access. One Supabase round trip and one query,
 * shared by everything that asks during a render (React `cache`).
 *
 * Two independent conditions make an admin:
 *
 *   1. Supabase verifies the JWT in the request cookies (`getUser`, not
 *      `getSession` — the latter does not check the signature).
 *   2. That user is on the AdminUser allowlist, active.
 *
 * Condition 2 is what makes a Supabase account worthless on its own. Public
 * signup is disabled in the Supabase dashboard, but this check is what holds
 * if that setting is ever flipped back on by accident.
 *
 * This runs in the Node runtime only — Prisma cannot run on Edge, which is
 * exactly why middleware performs a weaker check and defers to this.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  const user = await getSupabaseUser();
  if (!user) return { state: 'anonymous' };
  if (!user.email) return { state: 'denied', email: null };

  const email = user.email.toLowerCase();

  // A row is found by its Supabase user once linked. By email only while it
  // has never been linked, and only for a confirmed address: matching a
  // linked row by email would hand it to whoever holds that address next, such
  // as a new sign-up after the admin changed their Supabase email.
  const adminUser = await prisma.adminUser.findFirst({
    where: {
      isActive: true,
      OR: [
        { supabaseUserId: user.id },
        ...(user.email_confirmed_at ? [{ email, supabaseUserId: null }] : []),
      ],
    },
    select: { id: true, email: true, name: true, role: true, supabaseUserId: true },
  });

  if (!adminUser) return { state: 'denied', email };

  // The allowlist is seeded by email before the Supabase user exists. Bind the
  // two the first time they meet, so access can later be revoked by user id
  // even if the address changes.
  if (adminUser.supabaseUserId !== user.id) {
    await prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { supabaseUserId: user.id, lastLogin: new Date() },
    });
  }

  return {
    state: 'admin',
    session: {
      adminUserId: adminUser.id,
      supabaseUserId: user.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
    },
  };
});

/** The current admin, or null for anyone else. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const access = await getAdminAccess();
  return access.state === 'admin' ? access.session : null;
}

/** Same as getAdminSession, but throws. Use in route handlers. */
export async function requireAdmin(): Promise<AdminSession> {
  const access = await getAdminAccess();
  if (access.state === 'anonymous') throw new UnauthenticatedError();
  if (access.state === 'denied') {
    throw new ForbiddenError('This account is not permitted to use the dashboard');
  }
  return access.session;
}

/** Guards what only the owner may do: settings that decide where leads go. */
export function requireOwner(session: AdminSession): AdminSession {
  if (session.role !== 'OWNER') {
    throw new ForbiddenError('This action requires the owner role');
  }
  return session;
}
