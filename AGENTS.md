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
| Motion (public site) | **GSAP 3.15** (every plugin is free) + **Lenis 1.3** smooth scroll, both pinned exactly — client leaf components only, through `shared/lib/motion` and `widgets/smooth-scroll` (§ Motion) |
| i18n | **next-intl 4** |
| Error reporting | **Sentry** (`@sentry/nextjs`, pinned exactly) — off without a DSN; § Error reporting |
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
- **A cached response can be older than the code reading it.** The data
  cache keeps a response until its tag is purged or its time runs out, and
  it is not emptied by a new deployment's code (a dev server's certainly is
  not). A field added to a public response may be missing from a cached copy
  for up to `PUBLIC_REVALIDATE_SECONDS`: the reading service fills it in
  (`withGalleries`, `home-page.service.ts`). The first projects list without
  `gallery` crashed the home page.
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
   a table, enable RLS on it in the migration that creates it, as
   `20261002092246_academy_and_videos` does: the first RLS migration has
   already run everywhere, so adding to its list would change nothing.
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
13. **Only the live site delivers contact submissions.** Every deployment
    shares one database and inbox, so a test sent from a Vercel preview
    (design.stager.ge, a branch link) or from `pnpm dev` would reach the client
    as a real lead. There, `/api/contact` validates as usual and then refuses
    with `403 FORBIDDEN`, reason `DELIVERY_OFF`, before writing anything.
    `INQUIRY_DELIVERY=on` lifts that for a preview or a dev server; nothing
    turns the live site off. `pkg/config/inquiry-delivery.ts` holds the rule,
    and `contact-form.spec.ts` pins every case.
14. **Session cookies are HttpOnly and Secure** (`pkg/supabase/cookie-options.ts`,
    passed to both server clients). Nothing in the browser reads them, and
    public pages allow inline scripts. There is no browser Supabase client;
    do not add one.
15. **The database is reached over TLS** unless it is local (`databaseSsl`,
    `pkg/db/prisma.ts`). node-postgres is plain text by default and Supabase's
    connection string has no `sslmode`; leave it out, as a URL setting
    overrides this one. `DATABASE_SSL_CA` adds certificate verification.
16. **Links an admin types are web links**: `urlInput()` / `optionalUrlInput()`
    take http(s) only, and a section button takes `pageSectionLinkInput()`
    (a site path, `#anchor`, https, `mailto:`, `tel:`). `z.url()` alone takes
    `javascript:`.
17. **Nothing the browser says about an upload is trusted**: a Media row must
    point at THIS project's store (`blobStoreHost()`, `pkg/blob/store.ts`;
    every Vercel customer's store shares the domain), under `media/`, and its
    type and size are read from the store (`head()`).
18. **JSON bodies are capped** (`readJson`, 2 MB by default; the contact form
    32 KB), and the honeypot answers like a success: a 422 would name it.
19. **Errors go into logs under `error`** (`serialiseError`), cause included,
    so they never overwrite the event name. No personal data in logs: an email
    address is logged as `hashIdentifier()`, an email by its `purpose`.
20. **A signed-in account that may not use the dashboard sees "No access"**
    with Sign out (`getAdminAccess`, `pkg/auth/admin-session.ts`). Never redirect
    it to the login page: middleware sends a session from there straight back.
    An admin row is matched by email only while unlinked.
21. **Supabase being unreachable is not a sign-out.** `isAuthOutage`
    (`pkg/supabase/outage.ts`) tells the two apart; on an outage the proxy
    does not redirect, `getSupabaseUser` throws `AuthUnavailableError`, and the
    API answers 503 `UNAVAILABLE` with reason `AUTH_UNREACHABLE`, so the
    dashboard says "try again" instead of sending an admin to a login page that
    could not sign them in either (a paused Free project does exactly this).
    Keep the check narrow: supabase-js gives some bad-session errors a 500.

---

## 5. Conventions

- **Files**: kebab-case. **Components**: PascalCase. **Hooks**: `useThing`.
- **Types are inferred from zod**, not declared alongside it. Where a schema has
  `.default()`, the form type is `z.input<…>` and the validated type is
  `z.output<…>` — `useForm<FormValues, unknown, Input>` needs both.
- **An optional number input registers with `setValueAs: toOptionalNumber`**
  (`shared/lib/form-values.ts`). react-hook-form passes the stored value
  through `setValueAs` as well as the typed text, and `Number(null)` is 0 — a
  project with no year could not be saved, because 0 fails `min(1900)`.
- **Input schemas trim every string a person types**: `z.string().trim()`, and
  `emailInput()` / `urlInput()` (plus `optional…` variants) from
  `shared/types/api.ts` for emails and URLs. The trim runs before validation,
  so `.min(1)` rejects whitespace-only values. Leave ids, machine-generated
  values, honeypots and passwords untrimmed. Output schemas need none of this.
- **An update schema is `partialUpdate(createSchema)`, never `.partial()`**
  (`shared/types/api.ts`). zod 4 applies `.default()` inside `.partial()`, so
  a one-field PATCH filled in every default it was not given: hiding a social
  link reset its order to 0, and any one-field update would have set a record
  back to DRAFT. A field left out of an update means "unchanged".
- **An optional dropdown or link reads blank as none:** `optionalChoice()`,
  `optionalYoutubeUrlInput()` (`shared/types/api.ts`). The "none" option and an
  emptied input send "", which `.min(1)` or a link check rejects, so a value
  once saved could never be removed.
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
- **A calendar day is a Postgres `date`, not a timestamp**: a course's start,
  a video's release. It crosses the API as "2026-11-15" (`calendarDate`), so it
  reads the same in every time zone, and "today" is Tbilisi's
  (`shared/lib/calendar-date.ts`): a Vercel function runs in UTC, four hours
  behind.
- **Something that failed to load gets `LoadFailed` (message + Try again),
  never the empty state and never a form** (`shared/components/panel.tsx`).
  A list that says "nothing yet" when its read failed invites duplicates; an
  edit form rendered without its record saves blanks over it. Only while
  nothing has loaded (`error && !data`): a failed background refresh must not
  take away a form someone is typing in. Every list and edit form follows this.
- **Every form passes `handleSubmit` an invalid handler**
  (`() => setSubmitError(formErrors.invalid())`): a field whose message is out
  of view (a dropdown, the other language's tab) otherwise left Save looking
  dead. Every edit form also calls `useUnsavedChangesGuard(isDirty, …)`, and a
  form that stays open after saving resets to what it saved.
- **Error boundaries**: `app/[locale]/error.tsx` (in the visitor's language),
  `app/admin/(dashboard)/error.tsx` (keeps the sidebar), `app/admin/error.tsx`
  (the dashboard itself failed, e.g. the access check with the database down),
  `app/global-error.tsx` (bilingual, self-contained). The prop is `retry`, not
  `reset`, in Next 16.
- **A keyboard reaches everything, once, and never loses its place.** Every
  page starts with a `SkipLink` and has one `<main id={CONTENT_ID}
  tabIndex={-1}>` (`shared/components/skip-link.tsx`). Anything that goes
  somewhere is a `ButtonLink`, never a `<Button>` inside a `<Link>`: invalid,
  and two Tab stops for one action. A control that replaces itself hands
  focus to its successor (`ConfirmButton`: Delete → Confirm → back, and the
  page's content once the row is gone), never to the top of the page.
  `keyboard.spec.ts` walks every dashboard page for nested controls.
- **Text reads at 4.5:1, a field's border at 3:1**, against the page and the
  cards, in both dashboard themes: `admin-theme.spec.ts` asserts every pair,
  `ink-subtle` (hints, captions, table headings) and `line-input` included.
  Brand sage is 2.3:1 on cream, so it is never a text colour on its own.
- **A database refusal is an answer, not a crash** (`pkg/db/errors.ts`,
  `handleRouteError`): P2025 → 404, P2003 → 409 `STALE_REFERENCE`, P2002 →
  409 (a slug clash only when the constraint names the slug), P2020 → 422.
  Prisma 7 behind the pg adapter reports the constraint in
  `meta.driverAdapterError.cause.constraint.index`, not `meta.target`.
- **The inquiry email is sent after the response** (`after()`,
  `app/api/_lib/notify-inquiry.ts`), with a 10 s limit and the inquiry id as
  Resend's idempotency key, so it can be retried safely. The visitor's answer
  never waits on the mail provider; an inquiry whose email never went out
  says so on its card. The sidebar counts new inquiries on every page
  (checked every minute). Archive takes an inquiry out of the inbox
  (`?view=inbox|archived`); a list shows the newest 500 and says how many
  there are in all.
- **Bilingual content is authored in both languages at once.** Translation
  tables, `@@unique([<parent>Id, locale])`, one ქართული | English toggle per
  admin form (§ Dashboard language).
- **A slug follows the English title (or name) while the item is being
  created** (`shared/lib/use-slug-autofill.ts`), until someone edits the slug
  by hand; emptying it hands it back to the title. A saved item's slug is never
  changed automatically, draft or not: links to a published page may already
  be out there, and a draft may have been published before. It follows the
  English because `slugify()` keeps Latin letters and digits only.
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

- **No extra packages.** Motion is GSAP + Lenis (§ Motion); no Motion
  (framer), design system or shadcn.
- **Its values go into `brandbook.css` first.** Its examples use raw palette
  utilities and arbitrary values (`text-gray-600`, `max-w-[1400px]`,
  `tracking-[0.18em]`, `z-[60]`); translate each into a token, never inline.
  A z-index scale is tokens too.
- **Images are CMS media only.** No generated, stock (picsum, Unsplash) or CDN
  (Simple Icons) imagery: the CSP allows only Vercel Blob and YouTube
  thumbnails, `next/image` optimizes only this project's own store, and
  invented photos of a real consultancy's work would misrepresent it. An empty
  slot is an honest empty state.
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
  needs a matching Georgian design (Noto Serif Georgian is one). Verify every
  typography change on /ka as well as /en.
- **Dials:** the site's one design, "Chef's Table" (dark), chosen by the
  client in October 2026: VARIANCE 6, MOTION 5, DENSITY 4. Calm by her
  request: no heading anywhere near the hero's size, reasons and figures set
  as lines, not slogans. The rules in § Motion hold at every setting.
- **Type sizes are the design's tokens** (`site.css`, with a smaller,
  lighter set under `:lang(ka)`), never a size picked per section. The hero's
  headline is the largest thing on the page and the only `text-display`; a
  section heading is `text-headline`; everything else is a title, lead or
  body size. Text is left-aligned, its measure capped: centred blocks of
  more than a line read badly in both scripts.
- **No custom cursors**, and no scroll cues: the skill bans both, and round 3
  showed why (a cursor disc that hid what it pointed at).
- **Sample content is TEMPORARY and says so.** While the dashboard holds no
  figures, courses or videos, `home-page.samples.ts` supplies invented
  entries, and every section showing them carries a "Sample" badge
  (`shared/components/sample-badge.tsx`). The first real entry replaces them
  all; a failed read shows the failure, never samples. They must be replaced
  by dashboard data before launch, never shipped as content.
- **Out of scope:** the admin dashboard — the skill excludes admin panels.

### Motion

Approved for the public site in round 3 of the home page designs: GSAP and
Lenis. The dashboard has none.

- **Markup stays server-rendered; motion is one client leaf per design.** A
  design marks what moves with data attributes and its leaf animates them.
  Import GSAP from `@/shared/lib/motion/gsap` (core plugins registered once,
  client-side); a design that needs a heavier plugin (Draggable, Inertia,
  Flip) registers it in its own service, so no other design downloads it. `useMotion` scopes every tween to the design and reverts it on
  unmount; Lenis comes from `widgets/smooth-scroll`.
- **Reduced motion means none.** Every effect runs under
  `(prefers-reduced-motion: no-preference)`: with reduced motion the page is
  static and fully visible and Lenis is off. Pinned and sideways scenes run
  from `lg` up, cursor effects with a mouse only; below that, scenes stack.
- **Nothing may be left hidden.** `data-enter` elements start invisible only
  when scripts run and motion is allowed, and globals.css shows them anyway
  after 1 s if the script has not taken over. The home page spec scrolls the
  page with motion on and fails on a heading left invisible, or a figure
  that stopped counting short of its number.
- **The hero never waits for the script.** On a slow phone its text is the
  page's Largest Contentful Paint. A script that arrives after the CSS
  fallback has begun (`ENTRANCE_DEADLINE_MS`, `use-motion.ts`) gets
  `entrance: false` and skips the hero's entrance, rather than hiding text
  the visitor has already seen to play it again; everything else still runs.
  The home page spec delays every script by 4 s and fails on any flicker.
- **Drawers, menus and players are native `<dialog>`s** opened with
  `showModal()`: the browser makes the page inert, holds focus inside, closes
  on Escape and returns focus. Stop Lenis while one is open (globals.css
  stops the page scrolling).
- **Decoration takes no pointer events** (`data-decorative`): a drawn frame
  over the hero once swallowed every click on its call to action.
- **Text is split only through `splitReveal`** (`shared/lib/motion/split.ts`),
  which keeps it readable to a screen reader, whole and once: a heading keeps
  its words as its accessible name; anything else is hidden from assistive
  technology and replaced, for it, by a visually hidden copy of its markup
  just before it (on a paragraph a label is ignored, and the intro was read
  as two empty paragraphs). Text holding a link or any other control is never
  split, and shows whole: split, the link would be reachable by Tab with no
  name. The home page spec compares what a screen reader is given with motion
  on and off.
- **SplitText masks are loosened** (`loosenMasks`, built into `splitReveal`):
  cut to the line box, a mask clips Georgian letters that reach below the
  baseline, during the entrance and for good after it. Loosen with a clip
  drawn past the box (`clip-path: inset(-0.2em …)`), never padding pulled
  back by negative margins: line masks are blocks, their margins collapse,
  and every line lands 0.2em lower than the text it replaced.
- **Traps met on the way:** Draggable in scroll mode wraps a scroller's
  children in a block of its own, so give the scroller its own flex track. A
  transformed ancestor becomes the box its `fixed` children are placed in, so
  a full-screen overlay cannot live inside an animated header. CSS a motion
  state switches on must beat utility classes: put it outside any
  `@layer`. A turning element widens the page on a phone: the design wrapper
  clips horizontal overflow (`overflow-x: clip`, which keeps sticky and pinned
  scenes working, unlike `hidden`). A filter or an accordion that changes the
  page's height leaves every ScrollTrigger below it measured for the old page,
  and its reveals never fire: `useMotion` re-measures when its scope's height
  settles. Flip with `absolute: true` takes rows out of the flow, so tween the
  list's own height alongside it. React must never re-render a style GSAP
  owns: give a moving element a fixed starting style and leave the rest to
  GSAP. Tween `filter` with `fromTo` and an explicit start: from the
  computed `none`, GSAP starts at `brightness(0)`, and a stacked card began
  black. A `position: sticky` element reports its stuck box, not its place
  in the page, so scroll targets and trigger positions for a sticky stack
  come from the flow (the stack's top plus the cards before it). Lenis
  glides every `#` link from the window and ignores `preventDefault()`: a
  handler that scrolls a link itself must also stop the click's propagation.
- **An in-page jump takes the keyboard with it.** Lenis cancels the browser's
  own jump, which would have moved the reading position, so "Start a Project"
  left focus in the hero and the next Tab scrolled back up. The smooth-scroll
  widget focuses every `#` link's target (`focusArrival`: tabindex -1, no
  scroll), and a menu that scrolls by itself calls `glideTo(target, { focus:
  true })`. `keyboard.spec.ts` follows the call to action by keyboard.
- **A count-up never shows a wrong number for good.** The page holds the
  real value; a figure's digits start counting only once motion takes over,
  and the full value stays in a visually hidden copy for screen readers. A
  figure already read on screen (the script came late) is not counted again,
  and one stopped half-way by a revert is put back to its number.
- **A project card's summary waits for the pointer** (by the client's
  request) only where there is one: `(hover: hover) and (pointer: fine)`.
  A touch screen has no hover, so there it reads under the project's name,
  and the photo arrows are always shown. Focus inside the card shows it too,
  and a card with no arrow to focus takes focus itself.
- **A video's poster carries its title** (`VideoCaption`, by the client's
  request): over a scrim, receding once a mouse has rested on the frame
  (`.video-caption` in globals.css), gone once it plays. Touch keeps it, so
  nothing on a timer may hide it: on a phone it is the only copy.

### Theme

The **public site is dark**, by decision: the client chose "Chef's Table" in
October 2026. It is not a theme and has no switch. `src/shared/brandbook/site.css`
remaps the colour roles, type sizes, spacing and shape inside `[data-site]`,
which every public page renders around itself (the home page, the 404, the
error page), and sets `color-scheme: dark` on the document. A new public page
wraps itself in `[data-site]` too, or it renders in the brandbook's light
roles. Only the **dashboard** has a theme switch — Light / Dark, beside the
wordmark in the sidebar. Until one is picked, the dashboard follows the OS
(the `system` cookie state).

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
  blocks have not drifted, and asserts that every text role and the field
  borders stay readable in both themes (§ 5, contrast).

### Dashboard language

The dashboard's own words are Georgian or English, the admin's choice, and
**Georgian until one is picked**. That is a different thing from the language
of the content being edited, and the two stay apart in code and in wording.

- **Interface language:** the ქა | EN switch on the sidebar's account row and
  on the sign-in form. A cookie, `stager-admin-locale` (`Path=/admin`), parsed
  by `pkg/i18n/admin-locale.ts` (anything unknown reads as Georgian) and read by
  `pkg/i18n/request.ts` for every request without a locale segment, so
  `<html lang>` follows it. Switching refreshes the page in place: a
  half-filled form survives it.
- **Content language:** "რედაქტირება: ქართული | English" at the top of each
  bilingual form (`shared/components/content-locale.tsx`). One toggle per page
  switches every translated field, and it opens on Georgian every time. Both
  languages' fields stay mounted, the other one hidden: unmounted fields drop
  out of react-hook-form, and saving would wipe the language not on screen. A
  red dot marks a language with errors, and a failed save whose problems are
  all in the hidden language switches to it. `TranslatedFields` gives each
  input the `lang` of its copy, for spellcheck and screen readers.
- **Wording lives in `pkg/i18n/messages/admin.ka.json` and `admin.en.json`,
  never in code.** Same keys and placeholders in both. Client components use
  `useTranslations('admin…')`, server components `getTranslations`. The
  site's own messages load too, so the dashboard reuses labels the site has
  (the inquiry interests).
- **Validation is worded from what failed, not from schema text.** The shared
  schemas carry no messages. `shared/lib/validation-message.ts` maps a zod
  issue (its code, limit and pattern) to a message key: live through
  `useValidationErrorMap()` → `zodResolver(schema, { error })`, and after a 422
  through the `issues` the API returns beside `fields`. A new refinement names
  its message with `params: { key }`.
- **Server errors are worded from `code` and `reason`**, never from the
  server's English `message`, which stays for logs. A service gets both helpers
  from `useFormErrors()`. Add a `reason` only where one code covers cases the
  admin must tell apart (why a sign-in failed, an image still in use).
- **The notification email is always Georgian:** it has one reader. Its wording
  is under `email` in `admin.ka.json`.
- `tests/e2e/admin-i18n.spec.ts` fails on a missing or mismatched key, a
  message that does not format, a key the code asks for that a language lacks,
  and wording written into dashboard code: JSX text, and strings given to
  label, placeholder, hint, title, aria-label and similar props or to a column
  `header`. Tests that find things by English wording pick English first
  (`setDashboardLanguage()`); tests that expect Georgian read it from
  `admin.ka.json`, so correcting a translation never breaks a test.

### Credential-gated tests

Tests that need a signed-in admin are skipped unless `E2E_ADMIN_EMAIL` and
`E2E_ADMIN_PASSWORD` are set.

- **They need no Supabase project.** CI (`.github/workflows/ci.yml`) runs
  every one of them on each push against a throwaway Supabase Auth: GoTrue,
  Supabase's own auth server, in Docker, behind `scripts/test-auth.ts proxy`,
  with a test admin made by `scripts/test-auth.ts user` and fresh secrets per
  run. No GitHub secrets, nothing live touched. The workflow's "Write
  .env.local" and "Start Supabase Auth" steps work the same on a Linux
  machine with Docker and a local database; it is also how a machine that
  cannot reach supabase.co runs them. (Docker Desktop has no `--network
  host`: publish GoTrue's port and point its `DATABASE_URL` at
  `host.docker.internal` instead.)

- **They sign in once per run, never per test.** The `setup` project
  (`tests/e2e/admin-session.setup.ts`) signs in before `chromium` and `mobile`
  start and saves the session to `tests/e2e/.auth/admin.json` (gitignored: it
  holds live tokens). A test opts in with
  `test.use({ storageState: ADMIN_SESSION })` from `tests/e2e/admin-session.ts`.
  The login route allows ten sign-ins per 15 minutes per IP, and signing in per
  test used up a whole window in a single run.
- **They run in English.** The setup project picks English before signing
  in, and the saved session keeps the choice.
- **Never sign out in one.** `signOut()` defaults to scope `global`, so it
  would end the session every other test is using.
- **A test that writes runs only against a local database** (`DB_WRITES_ALLOWED`,
  `tests/e2e/db-guard.ts`; `E2E_ALLOW_SHARED_DB=1` overrides it, deliberately).
  `.env.local` usually names the live one.
- **Name what a test creates so it can be found:** slugs start `e2e-` (the
  dashboard derives them from "E2E …" titles), contact senders are
  `e2e-…@example.com`. Each test deletes its own rows in a `finally`, and
  `tests/e2e/global-teardown.ts` removes whatever a killed run left.

The suites that need no credentials hold the boundary in place:

- **`api-auth-matrix.spec.ts` finds every route and dashboard page on disk**
  and checks it signed out: 401 for each admin method, 403 for a cross-site
  write, the login page for each dashboard page. A route outside `/api/admin`
  must be listed in its `OUTSIDE_ADMIN`, so a public one is a decision, never
  an accident; one under `/api/public/` may only read.
- **`api-contract.spec.ts` parses every public read with its entity schema**,
  in both languages, and checks the 404s, 422s, drafts and sign-in limits.
  Sign-in tests send a documentation-range `x-forwarded-for`, so they never
  use up the limit of the address the rest of the suite signs in from.

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
pnpm db:generate       # regenerate the Prisma client; run after db:migrate, which no longer does in Prisma 7
pnpm db:migrate:deploy # apply committed migrations, no prompts and no resets: how the live database is updated
pnpm db:seed           # creates what is missing; never overwrites dashboard edits
pnpm db:studio         # browse the database
pnpm test:e2e          # Playwright (loads .env.local; needs a seeded database)
pnpm brand:tokens      # regenerate the brand hex copies (runs on install/dev/build anyway)
```

All `db:*` scripts read `.env.local` through dotenv-cli — there is one env file,
not two. `db:migrate`, `db:push`, `db:seed` and `db:reset` refuse a database
that is not on this machine (`scripts/db-guard.ts`): `.env.local` usually
names the live one, and `migrate dev` can offer to reset it. `ALLOW_REMOTE_DB=1`
overrides that, deliberately. `db:migrate:deploy` is not guarded; it is how the
live database is updated.

Before pushing: `pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e`.
CI runs the same on every push, signed-in tests included, plus a check that
the migrations match `schema.prisma` (`prisma migrate diff … --exit-code`).

### Running on Vercel

- **Region `fra1`** (`vercel.json`), next to the Frankfurt database. Vercel's
  default is Washington, which put an ocean between every query and its data.
- **Migrations run on production deploys.** The build command is
  `pnpm run vercel-build` (`scripts/vercel-build.ts`): `prisma migrate deploy`
  when `VERCEL_ENV=production`, then the build. Previews never migrate: they
  share the live database, so a preview of a schema change needs its own.
- **`/api/health`** answers 200 `{ ok: true }` when `SELECT 1` returns within
  5 s, 503 otherwise, never cached. Point an uptime monitor at it.
- **`/api/cron/daily`** (03:17 UTC, production only) retries inquiry emails
  that failed (while email is set up), prunes audit entries older than a year
  and rate-limit windows older than a day, and keeps a Free Supabase project
  from pausing. Vercel calls it with `Authorization: Bearer $CRON_SECRET`;
  without the variable it refuses everyone.
- **Everything outward has a time limit:** the server's own API 10 s, mail
  10 s, health 5 s, the page editor's transaction 15 s. A slow dependency
  fails in seconds and is reported, instead of hanging until Vercel kills the
  function.
- **Lists carry no bodies.** The admin project, insight and service lists and
  the public service list omit `body`; a detail endpoint has it. A Vercel
  response over 4.5 MB fails outright, and bodies in two languages get there.
- **Images:** the optimizer fetches only this store's `media/` files
  (`storeHostFromToken`, `pkg/blob/store-host.ts`) and keeps each resized copy
  31 days. YouTube posters skip it. The dashboard shrinks uploads in the
  browser first (`prepareImage`): photos to WebP of at most 2560 px, PNGs only
  when larger.
- **`robots.txt`** lets search engines in only on production, and never into
  `/admin` or `/api`; `sitemap.xml` lists each public page per language.

### Error reporting (Sentry)

- **Off unless `NEXT_PUBLIC_SENTRY_DSN` is set, and always off in `pnpm dev`**
  (`MONITORING_ON`, `pkg/monitoring/options.ts`). Without a DSN the build is
  unchanged (`withSentryConfig` only wraps the config when one is set).
- **The SDK is only ever imported dynamically**, behind `MONITORING_ON`:
  `src/instrumentation.ts`, `src/instrumentation-client.ts`, `reportError()`
  (error boundaries) and `reportServerError()` / `reportServerEvent()`
  (`pkg/monitoring/server.ts`). A static `import * as Sentry` in client code
  would put the SDK in every visitor's download.
- **What is reported:** errors Next catches while rendering (`onRequestError`),
  unhandled route errors (`handleRouteError`, with their stack), errors the
  error boundaries catch, and every `logger.error`, grouped by its event name.
  `logger.error(…, { report: false })` only where the caller reports the
  exception itself. A known state is not an error: log it with `warn`.
- **What is never sent:** cookies, request bodies, query strings (also in
  breadcrumbs), and of a user anything but an id (`scrubEvent`,
  `scrubBreadcrumb`). No session replay, no performance tracing.
  `sendDefaultPii` stays false.
- **Browser events go through `/monitoring`** on the site itself, past ad
  blockers; the proxy matcher must keep skipping that path.
- **Server events are flushed in `after()`**: Vercel freezes a function once
  it has answered, and an event still queued then is lost.

---

## 7. Current state

Built: schema, migrations, seed, the full API, auth, the admin dashboard,
security, caching, the Playwright suite and CI. The October 2026 audit, what
it verified in production and what it left open: `docs/AUDIT-HANDOFF.md`.

Courses (with categories the owner adds) and videos have their tables,
dashboard screens and public endpoints (`/api/public/courses`, which lists a
course until its start date has passed, and `/api/public/videos`, newest
first). The home page reads them; a section the dashboard has nothing for yet
shows samples marked "Sample" (`orSamples`, `home-page.samples.ts`), and a
failed read shows the failure, never samples.

**The public site: one design, "Chef's Table" (dark)**, chosen by the client
in October 2026 (`src/modules/home-page/elements/chefs-table`, `site.css`).
After the design review: the hero is text only (no video); the company's
figures follow it (`Stat`, dashboard → "Company in figures",
`/api/public/company-stats`); the services read as a journey along a line,
with no Academy link on them; each project is one card whose photos (the
cover, then the gallery) scroll inside it, with its summary shown under the
pointer; projects have no page of their own, so the dashboard's project form
no longer asks for a write-up, search fields or a video (stored values stay);
"Why STAGER" is a heading beside numbered lines. A course's "related
service" left the course form with the Academy link (the column stays).

Still open: the real figures (the samples are placeholders, marked);
rendering the home page statically (the per-request CSP nonce keeps it
dynamic, see `docs/AUDIT-HANDOFF.md`); the SEO fields; and the noindex,
which stays until launch. Keep the data-loading pattern in
`home-page.service.ts`.

Decided for the design phase: Noto Sans Georgian for both scripts, so headlines
match across locales, and GSAP + Lenis motion under the rules in § Motion.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
