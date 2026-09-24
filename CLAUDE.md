# CLAUDE.md

**Read `AGENTS.md` before writing code in this repository.** It holds the full
contract: stack, folder architecture, data flow, caching, security and
conventions. This file exists because Claude Code loads it automatically — it
restates only the rules that do the most damage when missed, so they are in
context even if `AGENTS.md` has not been opened yet.

Kept short on purpose. One document is the source of truth; two competing ones
drift.

---

## The stack is fixed

Next.js 16 · React 19 · TypeScript strict · Tailwind 4 · TanStack Query ·
Zustand · react-hook-form · zod 4 · Prisma 7 · Supabase · Vercel Blob · Resend ·
next-intl · sanitize-html · Playwright · pnpm.

Do not add a library outside this list without raising it first.

## Ten rules that break things when broken

1. **Only `src/app/api/**` may touch the database.** Everything else goes through
   an entity `.api.ts` → `/api`. ESLint enforces this.
2. **Imports point one way**: `app → modules → widgets → entity → shared → pkg`.
   A module's `elements/` may never import from its parent module.
3. **Every public read is tagged, every write revalidates.** Tags come from
   `pkg/cache/tags.ts`, never inline strings. An untagged read cannot be
   invalidated, and the dashboard will look broken.
4. **`getUser()`, never `getSession()`** — the latter does not verify the JWT.
5. **Middleware is not the auth boundary.** Prisma cannot run on Edge.
   `requireAdmin()` in the Node runtime is the real check, and every admin route
   handler repeats it.
6. **Admin access needs both** a valid Supabase session and an active `AdminUser`
   row. A Supabase account alone grants nothing.
7. **`process.env` is read only inside `pkg/config`**, where zod validates it.
8. **Sanitize rich text on write**, so the database only ever holds safe HTML.
9. **No hard-coded colours or sizes.** They live in ONE file,
   `src/shared/brandbook/brandbook.css` — colour, typeface, type scale,
   spacing. `globals.css` only imports it.
10. **Schema changes go through `pnpm db:migrate`** and the generated SQL is
    committed. Never edit the database by hand.

## Traps this codebase has already hit

- `prisma` / `@prisma/client` are pinned to **`7.10.0` exactly** — npm's `latest`
  tag points at an `8.0.0-rc`.
- Prisma 7 takes no connection URL in `schema.prisma` and requires a driver
  adapter.
- **The middleware file is `src/proxy.ts`** (Next 16 renamed the convention;
  default export). At the repo root it is silently ignored, taking locale
  routing, CSP and session refresh with it.
- `revalidateTag(tag, { expire: 0 })` — anything else serves stale content right
  after an admin saves.
- **Never let a failed read fall back to content-shaped copy.** A placeholder
  that reads like the real thing turns an outage into a page that merely looks
  fine, and hid a dead API for days. Log it and say so on the page.
- `NEXT_PUBLIC_SITE_URL` is **not** what the server fetches itself on — see
  `getSiteOrigin()`. It may point at a domain whose DNS has not propagated yet.
- **Never add a jsdom-based dependency** (`isomorphic-dompurify`, `jsdom`). It
  crashes at import inside Vercel functions — every route importing it returned
  an empty 500 in production while passing every local test.
- **Env validation runs during `next build`.** A rule that fails there takes the
  whole site down. Only require what the deployed app genuinely cannot run
  without; report optional misconfiguration in `pnpm setup:check` instead.
- Where a zod schema uses `.default()`, react-hook-form needs both types:
  `useForm<z.input<S>, unknown, z.output<S>>`.
- **Trim typed input in the schema — and never as `z.email().trim()`.** zod 4
  validates the format before a chained trim runs, so that still rejects
  " me@x.com ". Use `emailInput()` / `urlInput()` from `shared/types/api.ts`.
  Never trim passwords.
- **The typeface is self-hosted**, declared with `@font-face` in `brandbook.css`
  (files in `src/shared/brandbook/fonts/`). Do not switch to `next/font/google`:
  it downloads at build time, so a machine that cannot reach Google silently
  ships a system fallback — which is worst for Georgian. Do not bring back
  `next/font/local` either: its per-face "Fallback" family rendered all Latin
  text in Arial.
- **`pkg/brand/hex.generated.ts` is generated** from `brandbook.css` on install,
  dev and build, for the email and the theme-color meta tag. Never edit it.
  Brand colours must be hex, or the build fails.
- **The design skill (`design-taste-frontend`) is direction only.** AGENTS.md
  § Design skill lists what it may not change — dependencies, tokens, images
  and the CSP, folder structure, CMS copy — and the Georgian checks.

## Sign-in needs two systems to agree

A Supabase Auth account (confirmed email, known password) **and** an active
`AdminUser` row. `pnpm db:seed` only creates the second. `pnpm setup:check`
reports the state of both; `pnpm admin:set-password` creates or repairs both.
Most "wrong password" reports are actually an unconfirmed email or a project-ref
mismatch between `NEXT_PUBLIC_SUPABASE_URL` and `DATABASE_URL`.

## Before pushing

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e
```

## What is not built yet

The public site design. `src/app/[locale]/page.tsx` is an intentionally unstyled
scaffold proving that dashboard edits reach the site. Its API endpoints already
exist — the design phase is frontend work only.
