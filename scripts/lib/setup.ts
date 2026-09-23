/**
 * Shared helpers for the operator scripts in this folder.
 *
 * These run under tsx, outside Next.js, so they deliberately avoid pkg/*:
 * those modules import `server-only`, which throws anywhere that is not a React
 * Server Component. Reading process.env directly here is the same exemption
 * prisma/seed.ts already has.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const CHECK = '✓';
export const CROSS = '✗';
export const WARN = '!';

export function green(text: string) {
  return `\u001b[32m${text}\u001b[0m`;
}
export function red(text: string) {
  return `\u001b[31m${text}\u001b[0m`;
}
export function yellow(text: string) {
  return `\u001b[33m${text}\u001b[0m`;
}
export function dim(text: string) {
  return `\u001b[2m${text}\u001b[0m`;
}

/**
 * The Supabase project ref, extracted from the public API URL.
 * `https://<ref>.supabase.co` → `<ref>`
 */
export function refFromApiUrl(apiUrl: string | undefined): string | null {
  if (!apiUrl) return null;
  try {
    const { hostname } = new URL(apiUrl);
    const match = hostname.match(/^([a-z0-9]+)\.supabase\./i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * The Supabase project ref, extracted from a Postgres connection string.
 *
 * Two shapes exist and both are in normal use:
 *   pooled — postgresql://postgres.<ref>:pw@aws-0-<region>.pooler.supabase.com:6543/postgres
 *   direct — postgresql://postgres:pw@db.<ref>.supabase.co:5432/postgres
 */
export function refFromDatabaseUrl(databaseUrl: string | undefined): string | null {
  if (!databaseUrl) return null;
  try {
    const url = new URL(databaseUrl);

    const fromUser = decodeURIComponent(url.username).match(/^postgres\.([a-z0-9]+)$/i);
    if (fromUser) return fromUser[1] ?? null;

    const fromHost = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\./i);
    if (fromHost) return fromHost[1] ?? null;

    return null;
  } catch {
    return null;
  }
}

export function portOf(databaseUrl: string | undefined): string | null {
  if (!databaseUrl) return null;
  try {
    return new URL(databaseUrl).port || null;
  } catch {
    return null;
  }
}

/** A Prisma client for scripts — always over the DIRECT connection. */
export function createScriptPrisma(): PrismaClient {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DIRECT_URL is not set. Copy .env.example to .env.local and fill it in.\n' +
        '  Windows: copy .env.example .env.local',
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/**
 * A Supabase client with the service-role key.
 *
 * This key bypasses every check Supabase has, so it exists only in these local
 * operator scripts and in server-side app code — never in anything that reaches
 * a browser. Session persistence is off because a script has nowhere to put one.
 */
export function createAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in .env.local.',
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type SupabaseUserSummary = {
  id: string;
  email: string;
  emailConfirmedAt: string | null;
  invitedAt: string | null;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  createdAt: string;
};

/**
 * Look up a user by email.
 *
 * The admin API has no get-by-email, so this pages through the list. A project
 * with one admin will find them on the first page; the cap stops a huge user
 * table from turning a diagnostic into a long-running job.
 */
export async function findSupabaseUserByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<SupabaseUserSummary | null> {
  const target = email.trim().toLowerCase();
  const MAX_PAGES = 10;
  const PER_PAGE = 200;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === target);

    if (match) {
      const raw = match as typeof match & { banned_until?: string | null };
      return {
        id: match.id,
        email: match.email ?? target,
        emailConfirmedAt: match.email_confirmed_at ?? null,
        invitedAt: match.invited_at ?? null,
        lastSignInAt: match.last_sign_in_at ?? null,
        bannedUntil: raw.banned_until ?? null,
        createdAt: match.created_at,
      };
    }

    if (data.users.length < PER_PAGE) return null;
  }

  return null;
}
