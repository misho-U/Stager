# STAGER

Bilingual (Georgian / English) marketing site and admin dashboard for STAGER —
Culinary & Foodservice Development.

Next.js 16 · Prisma 7 · Supabase · Vercel Blob · Resend · Tailwind 4

---

## Setup

You need a Supabase project, a Resend account and a Vercel Blob store. Steps are
in order; nothing works until `.env.local` is filled in.

### 1. Supabase

1. Create a project. Pick **EU Central (Frankfurt)** — it is the closest region
   to Georgia.
2. **Project Settings → Database → Connection string.** Copy both:
   - `DATABASE_URL` — the **pooled** string, port **6543**. Append
     `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL` — the **direct** string, port **5432**. Migrations need a real
     session, which the pooler cannot give them.
3. **Project Settings → API.** Copy `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
4. **Authentication → Providers → Email → turn OFF "Allow new users to sign
   up".** The site has no public registration.
5. **Authentication → Users → Add user.** Use your email and a strong password,
   and tick *Auto Confirm User*.

### 2. Resend

6. Add and verify the domain `stager.ge` (Resend gives you the DNS records).
7. Create an API key → `RESEND_API_KEY`.
8. Set `MAIL_FROM="STAGER <noreply@stager.ge>"` and `CONTACT_INBOX_EMAIL` to
   whichever inbox should receive enquiries.

### 3. Vercel

9. Create the project and link this repository.
10. **Storage → Create a Blob store** → copy `BLOB_READ_WRITE_TOKEN`.

### 4. Run it

```bash
cp .env.example .env.local     # then fill in everything from the steps above
                               # ADMIN_EMAIL must match the user from step 5

pnpm install
pnpm db:migrate                # creates every table from prisma/schema.prisma
pnpm db:seed                   # allowlists your admin user, seeds services and page copy
pnpm dev
```

Open <http://localhost:3000/admin/login>, sign in, change something, then reload
<http://localhost:3000/ka> — the change is already there.

There is one env file. The Prisma scripts read `.env.local` too, via dotenv-cli.

---

## Troubleshooting

```bash
pnpm setup:check
```

Run this first. It reports the real state of everything sign-in depends on and
names what is wrong — it is far faster than reading error messages on the login
form, which cannot tell most of these cases apart:

- every env var present, and no `.env.example` placeholders left
- **the API URL and the database URL point at the same Supabase project** — if
  they do not, sign-in checks a different project from the one holding your
  data, and Supabase reports that as `invalid_credentials`, indistinguishable
  from a wrong password
- database reachable, migrations applied, `AdminUser` allowlist row active
- the Supabase account for `ADMIN_EMAIL`: does it exist, is the email
  **confirmed**, is it banned, was it invited but never given a password

### Can't sign in

```bash
pnpm admin:set-password
```

This is the fix for almost every sign-in problem. It creates or repairs the
Supabase account with a password you choose, marks the email confirmed, and
activates the `AdminUser` row — all in one step.

Sign-in needs **two** things to be true, and the login form cannot tell you
which one is missing:

1. a Supabase Auth account with a confirmed email and a known password
2. an active row in our own `AdminUser` allowlist

`pnpm db:seed` only does #2. Creating a user in the Supabase dashboard only does
#1 — and only if you tick **"Auto Confirm User"**, which is easy to miss.

The terminal running `pnpm dev` also logs the precise reason
(`auth.login_rejected` with `supabaseCode`):

| `supabaseCode` | Cause |
|---|---|
| `invalid_credentials` | No such user in *this* project, or the wrong password |
| `email_not_confirmed` | User exists but was created without *Auto Confirm* |
| `over_request_rate_limit` | Supabase is throttling; wait a minute |

### Other first-run errors

**"Could not reach the authentication service"** — `NEXT_PUBLIC_SUPABASE_URL` or
`NEXT_PUBLIC_SUPABASE_ANON_KEY` is wrong or still a placeholder.

**`Cannot find module '.prisma/client/default'`** — the Prisma client has not
been generated. `pnpm install` does this automatically now; if it was skipped,
run `pnpm db:generate`.

**`The datasource.url property is required…`** — `.env.local` does not exist or
has no `DIRECT_URL`. On Windows: `copy .env.example .env.local`.

---

## Commands

```bash
pnpm dev            # dev server
pnpm build          # production build
pnpm lint           # ESLint, including the architecture boundary rules
pnpm typecheck      # tsc --noEmit
pnpm test:e2e       # Playwright
pnpm db:migrate     # create and apply a migration
pnpm db:seed        # idempotent seed — safe to re-run
pnpm db:studio      # browse the database

pnpm setup:check         # diagnose the whole setup (env, database, Supabase account)
pnpm admin:set-password  # create/repair the admin account in both systems
```

The authenticated end-to-end tests are skipped unless you supply a real account:

```bash
E2E_ADMIN_EMAIL=you@stager.ge E2E_ADMIN_PASSWORD=… pnpm test:e2e
```

---

## What the dashboard manages

Projects (case studies) · Services · Team · Insights · Categories · Page copy ·
Social links · Site settings · Media · Contact enquiries.

Everything is bilingual: each form has Georgian and English tabs, and both are
required so a record can never exist in one language only.

Images go to Vercel Blob. Video is embedded from YouTube rather than hosted —
self-hosted video is slow and expensive, and the brief asked for YouTube links.

---

## Project layout

See **`AGENTS.md`** for the full engineering contract: architecture, the import
hierarchy, the caching model and the security rules. Short version:

```
prisma/    schema, migrations, seed
pkg/       framework-agnostic packages (db, auth, cache, i18n, mail, security…)
src/app/   routes — api/ is the only place that touches the database
src/modules/  one folder per page
src/entity/   per-domain zod model + api + TanStack Query
src/widgets/  reusable composite UI
src/shared/   primitives, brandbook tokens, shared types
```

---

## Status

The foundation is complete: database schema, migrations, seed, the full API,
authentication, the admin dashboard, security hardening, caching, and the test
suite.

**The public site design is not built yet.** `/ka` and `/en` currently render an
unstyled scaffold that exists only to prove that dashboard edits reach the site.
Its API endpoints already exist, so building the real pages is frontend work.
