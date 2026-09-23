/**
 * `pnpm admin:set-password` — make the admin account usable, in one step.
 *
 * Signing in needs two systems to agree, and reconciling them by hand through
 * the Supabase dashboard is what has gone wrong repeatedly:
 *
 *   1. a Supabase Auth account with a known password and a confirmed email
 *   2. an active row in our own AdminUser allowlist
 *
 * This creates or repairs both. It is the escape hatch for "the account exists
 * but sign-in says the password is wrong" — whatever the underlying cause
 * (never confirmed, invited without a password, or simply forgotten).
 *
 * Local operator tool. It uses the service-role key, which is already in
 * .env.local, and is never imported by application code.
 */
import { createInterface } from 'node:readline';

import {
  CHECK,
  createAdminSupabase,
  createScriptPrisma,
  dim,
  findSupabaseUserByEmail,
  green,
  red,
  yellow,
} from './lib/setup';

/**
 * Read a password without echoing it.
 *
 * Deliberately not taken from argv: command-line arguments land in shell
 * history and in the process list, where a password does not belong.
 * ADMIN_PASSWORD is honoured for non-interactive use (CI, scripted setup).
 */
function promptForPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

    // readline has no built-in masking, so suppress its echo and print the
    // prompt ourselves.
    const instance = rl as unknown as { _writeToOutput: (chunk: string) => void };
    let prompted = false;
    instance._writeToOutput = (chunk: string) => {
      if (!prompted) {
        process.stdout.write(question);
        prompted = true;
        return;
      }
      if (chunk.includes('\n')) process.stdout.write('\n');
    };

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error('ADMIN_EMAIL is not set in .env.local.');
  }

  console.warn(`Setting up the admin account for ${email}\n`);

  const password = process.env.ADMIN_PASSWORD ?? (await promptForPassword('New password: '));

  if (password.length < 8) {
    // Matches loginInputSchema, so a password accepted here always satisfies
    // the login form too.
    throw new Error('Password must be at least 8 characters.');
  }

  const supabase = createAdminSupabase();
  const existing = await findSupabaseUserByEmail(supabase, email);

  let supabaseUserId: string;

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      // Confirming here is the point: an unconfirmed account cannot sign in,
      // and that is invisible from the login form.
      email_confirm: true,
    });

    if (error) throw error;
    supabaseUserId = data.user.id;

    console.warn(`${green(CHECK)} Supabase account updated (password set, email confirmed)`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) throw error;
    supabaseUserId = data.user.id;

    console.warn(`${green(CHECK)} Supabase account created (email confirmed)`);
  }

  const prisma = createScriptPrisma();

  try {
    const adminUser = await prisma.adminUser.upsert({
      where: { email },
      update: { isActive: true, supabaseUserId },
      create: {
        email,
        name: process.env.ADMIN_NAME ?? 'Site Owner',
        role: 'OWNER',
        isActive: true,
        supabaseUserId,
      },
      select: { role: true },
    });

    console.warn(
      `${green(CHECK)} AdminUser allowlist row active (${adminUser.role}), linked to the Supabase account`,
    );
  } finally {
    await prisma.$disconnect();
  }

  console.warn(`\n${green('Done.')} Sign in at /admin/login with ${email}.`);
  if (process.env.ADMIN_PASSWORD) {
    console.warn(
      dim('Note: the password came from ADMIN_PASSWORD. Unset it so it does not linger in your shell.'),
    );
  }
}

main().catch((error: unknown) => {
  console.error(`\n${red('Failed:')} ${error instanceof Error ? error.message : String(error)}`);
  console.error(yellow('Run `pnpm doctor` to see which part of the setup is wrong.'));
  process.exitCode = 1;
});
