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
next-intl · sanitize-html · Phosphor icons · GSAP · Lenis · Sentry · Playwright ·
pnpm.

Do not add a library outside this list without raising it first.

## Ten rules that break things when broken

1. **Only `src/app/api/**` and `src/server/published` may touch the database.**
   The published layer is server-only, read-only and published-only: public
   pages read through it at build time. The browser and the dashboard go
   through an entity `.api.ts` → `/api`. ESLint enforces all of it.
2. **Imports point one way**: `app → modules → widgets → server → entity → shared → pkg`.
   A module's `elements/` may never import from its parent module.
3. **Every published read is cached and tagged, every write revalidates.**
   `'use cache'` + `cacheTag` + `cacheLife` in `src/server/published`; tags
   come from `pkg/cache/tags.ts`, never inline strings. An untagged read cannot
   be invalidated, and the dashboard will look broken.
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
  after an admin saves. Keep the second, delayed purge in `revalidateEntity()`:
  a page that was rendering when the save landed is otherwise stored as fresh
  and keeps the old content for an hour.
- **A new page needs a data migration**: the dashboard cannot create pages or
  sections, and the seed never runs in production. A new `PageKey` value goes
  in a migration of its own (AGENTS.md § Version traps). Previews run before
  that migration, against the live database: a lookup by the new key must
  read "no page", not fail (`byKey`, `isUnknownEnumValue`), or every preview
  page says content failed to load.
- **The public pages are built at build time (Cache Components).** No
  `export const dynamic`/`revalidate`/`dynamicParams` (the build rejects
  them); `generateStaticParams` never returns `[]`; no `new Date()`,
  `Date.now()` or `Math.random()` outside a `'use cache'` function or
  `connection()`; anything reading the request sits in Suspense. **Never set
  `htmlLimitedBots`**: a matching visitor skips the built page, and `/.*/`
  made every visit a full render. No catch-all page under `[locale]`: it
  caught `/api/…` as a locale and shipped an empty 404; an address no route
  answers gets `app/global-not-found.tsx`. AGENTS.md § Static public pages
  lists every Suspense boundary and why.
- **The dashboard keeps pages and lists for minutes, so it moves instantly**
  (AGENTS.md § A dashboard that moves instantly). A new dashboard page gets
  its own `loading.tsx` beside its `page.tsx` (`admin-speed.spec.ts` checks);
  a list page lives in a `(list)` group so its skeleton never covers the edit
  form. Never `router.refresh()` after a save: every save already marks every
  query stale, and a refresh throws away every prefetched page. Signing out
  is a full page load.
- **A link to another public page is a `SiteLink`**, which opens it without
  a reload (a `#section` of the same page stays a plain `<a>`). Next then
  keeps the last three pages in the document, hidden: ids repeat, so find
  elements by id or ref, never a document-wide `querySelector`, and tests
  take the visible match. The public site never sets the browser's
  `scroll-behavior: smooth` (Lenis glides, and GSAP writes the value back
  inline), and `<html>` keeps `data-scroll-behavior="smooth"`: either
  slipping opened a new page part-way down. AGENTS.md § Moving between the
  public pages.
- **Never let a failed read fall back to content-shaped copy.** A placeholder
  that reads like the real thing turns an outage into a page that merely looks
  fine, and hid a dead API for days. On a public page a failed read is not
  caught at all: the build fails, or the last good page stays up, or the
  error page says so. A built page must never hold the failure.
- `NEXT_PUBLIC_SITE_URL` is only for canonical tags, OG URLs and the sitemap.
  The server never fetches its own API, so it may point at a domain whose DNS
  has not propagated yet.
- **Never add a jsdom-based dependency** (`isomorphic-dompurify`, `jsdom`). It
  crashes at import inside Vercel functions — every route importing it returned
  an empty 500 in production while passing every local test.
- **Env validation runs during `next build`.** A rule that fails there takes the
  whole site down. Only require what the deployed app genuinely cannot run
  without; report optional misconfiguration in `pnpm setup:check` instead.
- Where a zod schema uses `.default()`, react-hook-form needs both types:
  `useForm<z.input<S>, unknown, z.output<S>>`.
- **Update schemas are `partialUpdate(schema)`, never `.partial()`.** zod 4
  applies defaults inside `.partial()`, so a one-field PATCH reset the rest:
  hiding a social link reordered it. Optional dropdowns and links read "" as
  none through `optionalChoice()` / `optionalYoutubeUrlInput()`.
- **An optional number input uses `setValueAs: toOptionalNumber`**
  (`shared/lib/form-values.ts`). react-hook-form also runs `setValueAs` on the
  stored value, and `Number(null)` is 0 — which blocked saving a project with
  no year.
- **Trim typed input in the schema — and never as `z.email().trim()`.** zod 4
  validates the format before a chained trim runs, so that still rejects
  " me@x.com ". Use `emailInput()` / `urlInput()` from `shared/types/api.ts`.
  Never trim passwords.
- **The typefaces are self-hosted**, declared with `@font-face` in
  `brandbook.css` (files in `src/shared/brandbook/fonts/`): Georgian letters
  in BPG Nino Mtavruli (all capital-style, the client's choice), the rest in
  Noto Sans Georgian. Do not switch to `next/font/google`: it downloads at
  build time, so a machine that cannot reach Google silently ships a system
  fallback — which is worst for Georgian. Do not bring back `next/font/local`
  either: its per-face "Fallback" family rendered all Latin text in Arial.
  **The Mtavruli licence is unconfirmed** (`fonts/BPG-NINO-MTAVRULI.txt`);
  never modify those files. BPG sits its letters above the baseline, so on
  the site's Georgian pages Latin is Noto raised to match (`Stager Latin`,
  `--font-sans-ka`), or a Latin word in a Georgian line looks a step lower.
  Never swap the English letters for another design: the client likes them
  as they are.
- **`pkg/brand/hex.generated.ts` is generated** from `brandbook.css` on install,
  dev and build, for the email and the theme-color meta tag. Never edit it.
  Brand colours must be hex, or the build fails.
- **Dashboard wording lives in `pkg/i18n/messages/admin.ka.json` and
  `admin.en.json`, never in code** — the dashboard is Georgian until the admin
  picks English. Shared schemas carry no messages: validation is worded from
  the zod issue (`shared/lib/validation-message.ts`), server errors from
  `code`/`reason`. `admin-i18n.spec.ts` fails on a hard-coded string.
- **`pnpm dev` and Vercel previews refuse contact submissions** (403,
  reason `DELIVERY_OFF`): they share the live database and inbox, and a test
  would reach the client as a real lead. `INQUIRY_DELIVERY=on` lifts it, against
  a local database only. The live site always delivers.
- **The design skill (`design-taste-frontend`) is direction only.** AGENTS.md
  § Design skill lists what it may not change — dependencies, tokens, images
  and the CSP, folder structure, CMS copy — and the Georgian checks.
- **Motion (GSAP + Lenis) lives in one client leaf per design, never leaves
  content hidden, and does nothing under reduced motion.** Decoration takes no
  clicks, SplitText masks are loosened or they clip Georgian letters, text is
  split only through `splitReveal` (or a screen reader hears nothing), and the
  hero never waits for the script. AGENTS.md § Motion has the rules and the
  traps behind them.
- **Search engines see nothing until `OPEN_TO_SEARCH` is true**
  (`widgets/seo/seo.constants.ts`): the launch commit flips it, and only on
  the owner's word. Every public page builds its metadata with
  `pageMetadata()` and its JSON-LD from dashboard data only, never a sample. A
  new public page also goes in the sitemap's `pages()` and in `/llms.txt`
  (AGENTS.md § Search engines).
- **Never a `<Button>` inside a `<Link>`**: use `ButtonLink`. Every page has a
  `SkipLink` and one `<main id={CONTENT_ID}>`; `keyboard.spec.ts` checks.
- **Test accounts never touch the live project.** The test admin exists only
  in CI's throwaway auth server and database, or a local one:
  `scripts/test-auth.ts` refuses a Supabase that is not on this machine, and
  writing tests and the `db:*` scripts refuse a remote database. Production
  has one admin, the owner. Never seed, sign up or write test data there.

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

CI (`.github/workflows/ci.yml`) runs the same on every push, signed-in tests
included, against a throwaway Postgres and Supabase Auth, with no secrets.
For the signed-in tests on a laptop, see AGENTS.md § Credential-gated tests.

## Where things stand

The October 2026 audit is recorded in `docs/AUDIT-HANDOFF.md`: what changed,
what was verified in production, what is still open, and what only the owner
can do in Vercel and Supabase. Read it before planning operations, security
or test work.

The client chose one design, "Chef's Table" (dark, `site.css`, `[data-site]`
on every public page). The site is the home page, the team, the articles and
each article, and a privacy policy; About, services and contact live on the
home page. Every page beside home is a `SubpageShell` (`widgets/site-chrome`),
and every public page moves through `widgets/site-motion`. Every public page
is built at build time and refreshed by tag on save; the dashboard renders per
request. AGENTS.md § 7 records the decisions and what is still open (the real
figures, the policy's text, the font licence, the noindex).
