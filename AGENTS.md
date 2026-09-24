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
| Rich-text sanitising | **sanitize-html** — DOM-free. Never a jsdom-based sanitizer (see below) |
| Icons | **@phosphor-icons/react** — per-icon imports: `…/dist/csr/<Name>` in client components, `…/dist/ssr/<Name>` in server components (the root re-exports ~1,500 icons) |
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
- **The middleware file is `src/proxy.ts`.** Next 16 renamed the convention from
  `middleware.ts` to `proxy.ts` (default export, not a named `middleware`
  export). It must sit next to `src/app`; at the repo root it is silently
  ignored — no locale routing, no CSP, no session refresh, and no error to tell
  you.
- **ESLint 10 + `eslint-plugin-react`**: the plugin crashes on version
  auto-detection, so `eslint.config.mjs` declares the React version explicitly.
- **jsdom crashes inside Vercel functions.** `isomorphic-dompurify` pulls it in
  on the server, and every route that imported the sanitizer returned an
  empty-body 500 in production — public page reads and admin saves alike —
  while the same build passed locally, on Node 24, and as a standalone build.
  The tell was the split: routes that never imported the sanitizer worked. Use
  `sanitize-html`, which parses with htmlparser2 and needs no DOM.

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
  shared/        genuinely shared primitives, types, and brandbook/
                 (brandbook.css holds every visual value — see §5)
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

   The ESLint rule is scoped to `src/**`, so three places outside the app are
   exempt by construction and use Prisma directly: `prisma/seed.ts`,
   `scripts/**` (the operator tools), and `tests/**`. That is deliberate —
   each runs outside Next.js, where `/api` is not available, and a test that
   had to go through HTTP could not set up the state it is testing. Nothing
   under `src/` gets this exemption.

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
- **A public read must never fall back to content-shaped placeholder copy.** The
  homepage once read `hero?.heading || 'Building Better Food Businesses.'` —
  the exact string the seed writes — so a completely dead API rendered a page
  that looked correct, and "my edits do not appear" could not be told apart from
  a healthy site. Failed reads are logged as `public.read_failed` and say so on
  the page.
- **Test the loop, do not reason about it.** `tests/e2e/cache-invalidation.spec.ts`
  asserts both halves: stale without revalidation, fresh on the very next
  request after it. It drives `/api/dev/revalidate-probe`, which needs no
  credentials, so unlike the admin flow spec it actually runs.

### Which origin the server calls itself on

`getSiteOrigin()` in `pkg/http/site-url.ts` picks, in order: `INTERNAL_API_ORIGIN`
→ `VERCEL_URL` → `NEXT_PUBLIC_SITE_URL`. Server-side rendering therefore does
**not** depend on the public domain resolving, which means `NEXT_PUBLIC_SITE_URL`
can be pointed at the final domain before DNS propagates. `NEXT_PUBLIC_SITE_URL`
is for canonical tags, OG URLs and the sitemap; it is not a fetch target on
Vercel.

---

## 4. Security rules

Non-negotiable. Each exists because of a specific failure mode.

1. **`getUser()`, never `getSession()`.** `getSession` does not verify the JWT
   signature. An ESLint rule bans it.
2. **`src/proxy.ts` is not the auth boundary.** Prisma cannot run on Edge, so it
   only refreshes the session and does a cheap cookie gate. The real check is
   `requireAdmin()` in the Node runtime, repeated in every admin route handler
   and in `(dashboard)/layout.tsx`.
3. **Two conditions for admin access**: a valid Supabase session AND an active
   row in `AdminUser`. A Supabase account alone grants nothing.

   The cost of that design is that setup can half-succeed, in ways the login
   form cannot distinguish from a wrong password — an unconfirmed email, an
   invited user with no password, or a `NEXT_PUBLIC_SUPABASE_URL` pointing at a
   different project than `DATABASE_URL`. `scripts/doctor.ts` (`pnpm
   setup:check`) reports all of them; `scripts/set-admin-password.ts`
   (`pnpm admin:set-password`) repairs both systems at once. Reach for those
   before debugging credentials by hand.
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
- **Input schemas trim every string a person types**: `z.string().trim()`, and
  `emailInput()` / `urlInput()` (plus `optional…` variants) from
  `shared/types/api.ts` for emails and URLs. The trim runs before validation,
  so `.min(1)` rejects whitespace-only values. Leave ids, machine-generated
  values, honeypots and passwords untrimmed. Output schemas need none of this.
- **One file holds every visual value: `src/shared/brandbook/brandbook.css`.**
  Colour, typeface, type scale, spacing, radii and motion are tokens in its
  `@theme` block; `src/app/globals.css` only imports it. Never hard-code a
  colour or size anywhere else — if a value is missing, add a token there. Its
  header comment says which parts are for hand-editing.
- **Components use colour roles, never raw brand colours.** `bg-surface`,
  `text-ink-muted`, `bg-primary`, `text-on-primary`, `bg-surface-muted` — not
  `bg-brand-teal` or `hover:bg-brand-cream-tint`. The roles are what the admin
  dark theme redefines, so a raw brand utility is a spot that stays light in
  dark mode. No arbitrary values either (`tracking-[…]`, `min-w-[…]`,
  `aspect-[…]`): use a Tailwind scale step or add a token.
- **Tailwind scans `src/` only** (`source('..')` in `globals.css`). It emits a
  utility for every class-like string it finds, and the docs and the design
  skill's examples are full of them; scanning the whole repo shipped CSS for
  classes no component uses.
- **Hex copies of the brand colours are generated, never edited.** The
  notification email and the theme-color meta tag cannot read CSS, so
  `scripts/brand-tokens.ts` writes the `--color-brand-*` values to
  `pkg/brand/hex.generated.ts` on install, dev and build (gitignored; import it
  through `src/shared/brandbook/tokens.ts`, or directly from `pkg`). Brand
  colours must therefore be hex — the script fails the build otherwise.
- **The typeface is self-hosted**, declared with `@font-face` at the bottom of
  `brandbook.css`: Noto Sans Georgian, variable, one family split into
  georgian / latin / latin-ext files by `unicode-range` (files in
  `src/shared/brandbook/fonts/`, SIL OFL 1.1 — see `fonts/OFL.txt`).
  `next/font/google` downloads at build time and degrades to a system font on
  any machine that cannot reach Google — Georgian falls back worst.
  `next/font/local` is gone too: it generated a `local(Arial)` "Fallback"
  family per face with no `unicode-range`, which rendered all Latin text in
  Arial. Playwright asserts that no request goes to Google's font hosts, that
  Georgian and Latin both load the bundled family, and that the files stay
  split by script. The CSP does not allowlist Google's font hosts.
- **Bilingual content is authored in both languages at once.** Translation
  tables, `@@unique([<parent>Id, locale])`, KA/EN tabs in the admin form.
- **Comments explain why, not what.** Do not narrate the code.
- **Never edit the database by hand.** Change `schema.prisma`, run
  `pnpm db:migrate`, commit the generated SQL.

### Brand palette

`#1D464A` deep teal · `#8EA3A5` sage · `#EFEEE6` cream · `#4D6266` / `#567578`
supporting · `#F3F2EC` / `#F8F8F4` tints. Taken from the official logo artwork;
defined as `--color-brand-*` in `brandbook.css`.

### Design skill (`design-taste-frontend`)

`.claude/skills/design-taste-frontend` is design direction for the **public
site only**: layout, type scale, spacing rhythm, hierarchy, motion. This file
and CLAUDE.md win wherever they disagree. The resolved conflicts:

- **No extra packages.** No Motion, GSAP, design system or shadcn. Motion is
  CSS only (see the dials below).
- **Its values go into `brandbook.css` first.** Its examples use raw palette
  utilities and arbitrary values (`text-gray-600`, `max-w-[1400px]`,
  `tracking-[0.18em]`, `z-[60]`); translate each into a token, never inline.
  A z-index scale is tokens too.
- **Images are CMS media only.** No generated, stock (picsum, Unsplash) or CDN
  (Simple Icons) imagery: the CSP and `next/image` allow only Vercel Blob and
  YouTube thumbnails, and invented photos of a real consultancy's work would
  misrepresent it. An empty slot is an honest empty state.
- **A skill "block" is a widget** (used on several pages, props only) **or a
  module `elements/` entry** (one page). No `blocks/` folder; data still flows
  through the module service.
- **Copy is the client's.** Never cut or rewrite CMS content to meet the
  skill's word limits — layouts must survive the schema maximums in both
  locales. The skill's em-dash ban applies only to strings written in code.
- **Georgian.** No `uppercase` as a label style: Chromium leaves Mkhedruli
  unchanged, so a label is capitals on /en and not on /ka. No italic: the faces
  are upright only, so the browser would fake the slant. No tracking or leading
  below the brandbook's values without checking /ka. A future display face
  needs a matching Georgian design. Verify every typography change on /ka as
  well as /en.
- **Dials:** DESIGN_VARIANCE 5 / MOTION_INTENSITY 3 / VISUAL_DENSITY 3. At
  MOTION 3 the skill itself prescribes CSS hover and press states only.
- **Out of scope:** the admin dashboard — the skill excludes admin panels.

### Theme

The **public site is light-only**, by decision. Only the **dashboard** has a
theme switch — System / Light / Dark, in the sidebar; System follows the OS.

- The choice is a cookie, `stager-admin-theme` (`Path=/admin`), read on the
  server in `src/app/admin/layout.tsx`, so the first byte is already themed:
  no flash, and no inline script for the nonce CSP to authorise.
- `AdminThemeProvider` renders `[data-admin-theme]`. `brandbook.css` keys off
  `:root:has([data-admin-theme=…])` and remaps the colour roles to the
  `--admin-dark-*` palette, which is mixed from the brand colours. Public
  pages never render the attribute.
- **A new colour role needs a dark value too:** a light value in the `@theme`
  block and a line in BOTH wiring blocks. A role missing from them shows its
  light colour in dark mode.
- `tests/e2e/admin-theme.spec.ts` covers the modes, checks the two wiring
  blocks have not drifted, and asserts the main text pairs stay readable in
  both themes.

---

## 6. Commands

```bash
pnpm setup:check       # diagnose env, database and the Supabase admin account
pnpm admin:set-password # create/repair the admin account in BOTH systems
pnpm dev               # dev server
pnpm build             # prisma generate + next build
pnpm lint              # ESLint, including the architecture boundaries
pnpm typecheck         # tsc --noEmit
pnpm db:migrate        # create + apply a migration (writes SQL to prisma/migrations)
pnpm db:seed           # idempotent seed
pnpm db:studio         # browse the database
pnpm test:e2e          # Playwright (loads .env.local; needs a seeded database)
pnpm brand:tokens      # regenerate the brand hex copies (runs on install/dev/build anyway)
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

Decided for the design phase: Noto Sans Georgian for both scripts, so headlines
match across locales, and CSS-only motion (dials 5/3/3 — see § Design skill).
Still open: the YouTube facade component.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
