import 'server-only';

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
 * Resolve the current admin, or null.
 *
 * Two independent conditions must both hold:
 *
 *   1. Supabase verifies the JWT in the request cookies (`getUser`, not
 *      `getSession` — the latter does not check the signature).
 *   2. That user's email appears in the AdminUser allowlist with isActive.
 *
 * Condition 2 is what makes a Supabase account worthless on its own. Public
 * signup is disabled in the Supabase dashboard, but this check is what holds
 * if that setting is ever flipped back on by accident.
 *
 * This runs in the Node runtime only — Prisma cannot run on Edge, which is
 * exactly why middleware performs a weaker check and defers to this.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const user = await getSupabaseUser();
  if (!user?.email) return null;

  const email = user.email.toLowerCase();

  const adminUser = await prisma.adminUser.findFirst({
    where: {
      isActive: true,
      OR: [{ supabaseUserId: user.id }, { email }],
    },
    select: { id: true, email: true, name: true, role: true, supabaseUserId: true },
  });

  if (!adminUser) return null;

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
    adminUserId: adminUser.id,
    supabaseUserId: user.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role,
  };
}

/** Same as getAdminSession, but throws. Use in route handlers. */
export async function requireAdmin(): Promise<AdminSession> {
  const user = await getSupabaseUser();
  if (!user) throw new UnauthenticatedError();

  const session = await getAdminSession();
  if (!session) throw new ForbiddenError('This account is not permitted to use the dashboard');

  return session;
}

/** Guards the few actions only the owner may perform (managing admins). */
export function requireOwner(session: AdminSession): AdminSession {
  if (session.role !== 'OWNER') {
    throw new ForbiddenError('This action requires the owner role');
  }
  return session;
}
