# STAGER — engineering contract

The complete rules for working in this repository. `CLAUDE.md` points here and
restates the handful of rules that cause the most damage when broken.

STAGER is a Georgian culinary & foodservice development consultancy. This is
their bilingual (KA/EN) marketing site plus the admin dashboard that edits it.

---

## 1. Stack — do not substitute

These are fixed. If a task seems to need something outside this list, raise it
rather than adding a dependency.

| Concern | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, React 19, TypeScript strict) |
| Styling | **Tailwind CSS 4** (CSS-first `@theme`, no `tailwind.config.js`) |
| Server state | **TanStack Query 5** |
| UI state | **Zustand 5** — UI only, never server data |
| Forms | **react-hook-form** + **zod 4** via `@hookform/resolvers` |
| Validation / types | **zod 4** — schemas are the source of truth, types are inferred |
| Database | **Supabase Postgres** via **Prisma 7** |
| Auth | **Supabase Auth** (email + password) + an `AdminUser` allowlist |
| Images | **Vercel Blob** |
| Video | **YouTube embeds** — never self-hosted video files |
| Email | **Resend** |
| i18n | **next-intl 4** |
| Tests | **Playwright** |
| Hosting | **Vercel** |
| Package manager | **pnpm** |

### Version traps

- **`prisma` and `@prisma/client` are pinned to `7.10.0` exactly.** npm's
  `latest` tag currently points at an `8.0.0-rc`. Never run `pnpm up prisma`
  without checking what it resolves to.
- **Prisma 7 does not accept connection URLs in `schema.prisma`.** The migration
  URL lives in `prisma.config.ts`; the runtime URL is passed to the pg driver
  adapter in `pkg/db/prisma.ts`.
- **Prisma 7 requires a driver adapter.** We use `@prisma/adapter-pg`.
- **`middleware.ts` must live at `src/middleware.ts`**, next to `src/app`. At the
  repo root it is silently ignored — no locale routing, no CSP, no session
  refresh, and no error to tell you.
- **ESLint 10 + `eslint-plugin-react`**: the plugin crashes on version
  auto-detection, so `eslint.config.mjs` declares the React version explicitly.

---

## 2. Folder architecture

```
prisma/          schema, migrations (committed SQL), seed
pkg/             framework-agnostic packages — no React, never imports src/
src/
  app/
    api/         THE ONLY PLACE THAT TOUCHES THE DATABASE
    [locale]/    public routes (KA/EN)
    admin/       dashboard (not locale-prefixed)
  modules/       one folder per page
  entity/        per-domain model + api + query
  widgets/       reusable composite UI (header, media picker, …)
  shared/        genuinely shared primitives, brandbook, types
tests/e2e/       Playwright
```

### Import direction — enforced by ESLint, not convention

```
app  →  modules  →  widgets  →  entity  →  shared  →  pkg
```

Imports only ever point **down** this list. `eslint-plugin-boundaries` fails the
build on a violation, so a mistake here is a lint error, not a review comment.

Two extra rules:

1. **A module's `elements/` may not import from its parent module.** Shared logic
   moves down into `shared/`, or is passed in as props.
2. **Only `src/app/api/**` may import `@pkg/db` or `@prisma/client`.** Everything
   else reaches data through an entity `.api.ts` that calls `/api`.

Verify the rules still bite by adding a deliberate bad import and running
`pnpm lint` — all three fire with clear messages.

### Module shape

A module is one page. Files sit at the same level:

```
src/modules/<name>/
  <name>.module.tsx      markup only
  <name>.service.ts      hooks, handlers, data wiring
  <name>.constants.ts    constants for this module
  <name>.utils.ts        only if utils outgrow the service file
  elements/<el>/         same four-file shape, recursively
```

Page files in `src/app` stay ~5 lines: resolve params, render the module.

### Entity shape

```
src/entity/<name>/
  model/<name>.model.ts   zod schemas; types are inferred, never hand-written
  api/<name>.api.ts       HTTP calls to /api — imported ONLY by the .query file
  api/<name>.query.ts     queryOptions + mutations; used everywhere else
```

`createCrudApi` / `createCrudQueries` in `src/shared/lib/crud-resource.ts` build
the standard five operations. An entity with a non-standard shape (media, pages,
settings) writes them out instead.

---

## 3. Data flow

**Reads (public):** server component → `serverFetch('/api/public/…', { tags })`
→ route handler → repository → Prisma.

**Reads (admin):** client component → TanStack Query hook → entity `.api.ts` →
route handler → repository → Prisma.

**Writes:** form → mutation hook → entity `.api.ts` → route handler → zod →
sanitize → Prisma → audit log → `revalidateEntity()`.

Yes, server components fetch their own API over HTTP. That extra hop is
deliberate: it gives one contract and one cache layer for both the server and the
browser, and it is what makes the "only api routes touch the DB" rule hold.

### Caching — the edit→live loop

- Tags live in `pkg/cache/tags.ts`. **Never write a tag as an inline string.**
- Public reads pass `tags` to `serverFetch`. An untagged read can never be
  invalidated and will serve stale copy until its TTL expires.
- Every admin write calls `revalidateEntity(entity, key)` **after** the
  transaction commits.
- `revalidateTag(tag, { expire: 0 })` — immediate purge. A non-zero profile means
  stale-while-revalidate, which would show the admin their old content right
  after they saved. (Next 16 warns if the second argument is omitted, and
  `updateTag` throws in route handlers.)
- Admin routes are `dynamic = 'force-dynamic'` and never cached.

---

## 4. Security rules

Non-negotiable. Each exists because of a specific failure mode.

1. **`getUser()`, never `getSession()`.** `getSession` does not verify the JWT
   signature. An ESLint rule bans it.
2. **Middleware is not the auth boundary.** Prisma cannot run on Edge, so
   middleware only refreshes the session and does a cheap cookie gate. The real
   check is `requireAdmin()` in the Node runtime, repeated in every admin route
   handler and in `(dashboard)/layout.tsx`.
3. **Two conditions for admin access**: a valid Supabase session AND an active
   row in `AdminUser`. A Supabase account alone grants nothing.
4. **RLS is enabled on every table with no policies.** Prisma owns the tables and
   bypasses RLS; the `anon` and `authenticated` roles read zero rows. If you add
   a table, add it to the RLS migration list.
5. **Validate at the boundary.** Every route handler parses its input with zod.
6. **Sanitize rich text on write**, never on read — the database must only ever
   hold safe HTML.
7. **`process.env` is read only in `pkg/config`.** An ESLint rule enforces it, so
   a missing variable fails loudly at boot instead of becoming `undefined` deep
   in a request.
8. **`SUPABASE_SERVICE_ROLE_KEY` and `BLOB_READ_WRITE_TOKEN` are server-only.**
   `pkg/config/env.server.ts` imports `server-only`, so a client import is a
   build error rather than a leak.
9. **Mutations assert same-origin** (`Sec-Fetch-Site` / `Origin`) on top of
   `SameSite=Lax` cookies.
10. **Never log** a request body, a token, or a raw IP. Inquiries and rate limits
    store a salted hash.
11. **Uploads**: admin-only, server-issued Blob tokens, mime allowlist, size cap,
    random suffix. No SVG — it is an executable document.
12. **Audit every mutation** via `recordAudit`.

---

## 5. Conventions

- **Files**: kebab-case. **Components**: PascalCase. **Hooks**: `useThing`.
- **Types are inferred from zod**, not declared alongside it. Where a schema has
  `.default()`, the form type is `z.input<…>` and the validated type is
  `z.output<…>` — `useForm<FormValues, unknown, Input>` needs both.
- **No hard-coded visual values.** Colours, type sizes and spacing come from the
  `@theme` block in `src/app/globals.css`. `src/shared/brandbook/tokens.ts`
  mirrors the few hexes needed outside the browser (email, OG images).
- **Bilingual content is authored in both languages at once.** Translation
  tables, `@@unique([<parent>Id, locale])`, KA/EN tabs in the admin form.
- **Comments explain why, not what.** Do not narrate the code.
- **Never edit the database by hand.** Change `schema.prisma`, run
  `pnpm db:migrate`, commit the generated SQL.

### Brand palette

`#1D464A` deep teal · `#8EA3A5` sage · `#EFEEE6` cream · `#4D6266` / `#567578`
supporting · `#F3F2EC` / `#F8F8F4` tints. Taken from the official logo artwork.

---

## 6. Commands

```bash
pnpm dev               # dev server
pnpm build             # prisma generate + next build
pnpm lint              # ESLint, including the architecture boundaries
pnpm typecheck         # tsc --noEmit
pnpm db:migrate        # create + apply a migration (writes SQL to prisma/migrations)
pnpm db:seed           # idempotent seed
pnpm db:studio         # browse the database
pnpm test:e2e          # Playwright
```

All `db:*` scripts read `.env.local` through dotenv-cli — there is one env file,
not two.

Before pushing: `pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e`.

---

## 7. Current state

Built: schema, migrations, seed, the full API, auth, the admin dashboard,
security, caching, and the Playwright suite.

**Not built: the public site design.** `src/app/[locale]/page.tsx` renders a
deliberately unstyled scaffold that proves the edit→live loop and nothing more.
The public API endpoints it needs already exist, so the design phase is frontend
work only. Delete the scaffold when the real homepage lands; keep the
data-loading pattern in `home-page.service.ts`.

Also open for the design phase: the Georgian/Latin typeface pairing (currently
Noto Sans Georgian for both scripts, so headlines match across locales), motion
language, and the YouTube facade component.
