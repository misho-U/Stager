# Audit handoff: site, dashboard, tests, operations

October 2026, on branch `claude/pensive-galileo-q33oik` (commits `e290baa` to
the PR's head). This is the record of what was checked, what changed and why,
what was verified in production, and what is still open. The rules that came
out of it live in `AGENTS.md`; this file says where.

## Verdict

The core held up: one authentication boundary, row-level security on every
table, rich text cleaned on write, a CSP with per-request nonces, same-origin
checks on writes, atomic rate limits, tagged cache purges, and leads stored
before any email is tried.

The risks sat around it, and are fixed: session cookies a page script could
read, an unencrypted database link, edit forms that could save blanks over a
record, no safety net (CI, error pages, error reporting), and the limits of
the free plans (a database that pauses, functions on the wrong continent).
Every fix has a test, and each test failed on the code before its fix.

## Production, checked 2026-10-04 (read-only)

| Check                                                            | Result                                                                                                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Admin allowlist (`admin_users`)                                  | One row: the owner's account, role `OWNER`, active, linked to its own Supabase account                                                                                                     |
| Supabase Auth (`auth.users`)                                     | One account, the owner's, email confirmed                                                                                                                                                  |
| Test accounts (`e2e-…`, `…@example.com`) in either table         | None                                                                                                                                                                                       |
| Test content (`e2e-` slugs) in any content table, test inquiries | None                                                                                                                                                                                       |
| Resend                                                           | `stager.ge` verified, sending enabled; the one live inquiry was emailed                                                                                                                    |
| `/api/health`                                                    | Runs `SELECT 1` with a 5 s limit, never cached: 200 `{"ok":true}`, or 503 `{"ok":false}` when the database is unreachable (503 within 50 ms of stopping Postgres locally, 200 again after) |

The test admin cannot reach production by any path in the code:

1. The test login is created only by `scripts/test-auth.ts user`, which refuses
   any Supabase URL that is not on localhost.
2. Its allowlist row comes from `pnpm db:seed` with
   `ADMIN_EMAIL=e2e-admin@example.com`, which only CI sets, for a Postgres that
   exists for one run. On a laptop, `db:seed` (like `db:migrate`, `db:push` and
   `db:reset`) refuses a database that is not on the machine unless
   `ALLOW_REMOTE_DB=1` (`scripts/db-guard.ts`).
3. Production builds never seed: `scripts/vercel-build.ts` applies committed
   migrations and builds, nothing else. Previews do not even migrate.

## What changed

### Security (`e290baa`)

- Session cookies are `HttpOnly` and `Secure` (`@supabase/ssr` sets neither
  by default, and public pages allow inline scripts).
- The database is reached over TLS unless it is local (`pkg/db/prisma.ts`);
  `DATABASE_SSL_CA` adds certificate verification. The pool is sized in code:
  the URL's `connection_limit` was never read.
- After sign-in, `next` is followed only inside `/admin`; `/\evil.com` used to
  pass as a path.
- A signed-in user who is not allowed sees "No access" with Sign out, instead
  of bouncing between `/admin` and the login page. An allowlist row is matched
  by email only while it is not yet linked, so a linked row cannot be taken
  over.
- Links typed in the dashboard are http(s) only (`z.url()` alone accepted
  `javascript:`). Media rows must point at this project's own blob store, and
  their type and size come from the store, not the browser.
- Rich text keeps only `target="_blank"`, always with `noopener`, and images
  only from the site's store.
- Settings are owner-only, and changes to the inquiry inbox address are audited.
- Sign-in is limited per account as well as per address; request bodies are
  capped; the honeypot answers like a success instead of naming itself.
- Logs carry ids and hashes, not visitors' names or sign-in emails.

### Failure handling (`3c377b2`)

- An edit form whose record failed to load used to show empty fields, and Save
  wrote them over the record. All eight forms now show "couldn't load" with Try
  again, and no form.
- Lists that failed to load said "nothing yet"; now they say they failed.
- A save the form's own checks stop says so, even when the field is out of
  view. Leaving unsaved changes asks first.
- Error pages for the site (in the visitor's language), the dashboard, and a
  bilingual global fallback.
- Drafts no longer leak through published pages (a project's services, an
  article's author).
- The inquiry email is sent after the visitor's answer, with a time limit and
  an idempotency key. A slow mail provider used to turn a stored lead into an
  error, and the visitor sent it again.
- Database refusals are answers (404, 409 with a reason, 422), not 500s.
- Deleting a category, team member or service says what will lose its link.

### Operations (`db70f63`)

- `/api/health` (above), and a daily job (`/api/cron/daily`, 20:05 UTC since
  October 2026, just after Tbilisi midnight,
  production): retries inquiry emails from the last 7 days that never went
  out, prunes the audit log past a year and rate-limit windows past a day. It
  needs `CRON_SECRET`; without it every caller gets 401.
- Functions run in `fra1`, next to the Frankfurt database. The live logs showed
  every connection coming from US East.
- Production deploys apply committed migrations first (`vercel-build`).
- Time limits on every outward call (the server's own API 10 s, mail 10 s, the
  page editor's transaction 15 s).
- Lists no longer carry full bodies in both languages (Vercel fails a response
  over 4.5 MB). The image optimizer takes only this store's files and keeps
  copies 31 days. Uploads are shrunk in the browser (WebP, 2560 px), which also
  drops camera metadata such as location.
- `robots.txt` and `sitemap.xml` (hreflang); search engines are kept out of
  anything but production.

### Tests and CI (`8637219`, `d7ba148`, `7be4363`)

- 36 signed-in dashboard tests had never run: they need a login, and none
  existed outside the live project. They now run everywhere against a
  throwaway Supabase Auth (GoTrue in Docker) with a test admin made per run.
- `api-auth-matrix.spec.ts` finds every route and dashboard page on disk, so a
  route added later without the admin check fails the build.
- `api-contract.spec.ts` parses every public read with its entity schema and
  checks no private field leaks; `admin-crud.spec.ts` covers create, edit and
  delete with cleaning, conflicts and owner-only settings.
- Writing tests run only against a local database (`tests/e2e/db-guard.ts`),
  use `e2e-` slugs, and `global-teardown.ts` removes what a killed run left.
- `.github/workflows/ci.yml`, on every push, about 5 minutes: lint, types, a
  production build, migrations checked against `schema.prisma`, and the whole
  suite. No secrets needed. A failed run keeps its report for 3 days.
- Found on the way: a Supabase outage signed admins out (it now answers 503
  and the dashboard says "try again"); in-page links landed about 95 px off
  with smooth scrolling.

### Error reporting (`d6e7d06`)

Sentry, off until `NEXT_PUBLIC_SENTRY_DSN` is set. Never sent: cookies,
request bodies, query strings, anything about a user but an id. No session
replay, no tracing. Settings → Error reporting → "Send a test error" (owner)
checks the setup.

### Speed (`ed87419`)

On a slow phone the hero text (each design's Largest Contentful Paint) waited
for the motion script. Lighthouse mobile, devtools throttling: 6.0–6.6 s →
3.3–3.4 s; performance 44–48 → 59–65. A script that arrives late now skips the
hero's entrance instead of hiding text the visitor has already seen.

### Accessibility and usability (`112aeba`, `69cae15`)

- Captions and hints: 2.3:1 → 4.8:1. Field borders: 1.4:1 → 3.8:1 (3.5:1 in
  the dark theme). Asserted in both themes by `admin-theme.spec.ts`.
- Text split for an animation reads whole to a screen reader; text holding a
  link is never split. Headings never skip a level.
- Skip links on the site and the dashboard. Keyboard focus follows in-page
  jumps under smooth scrolling, and the delete confirmation. 24 buttons that
  sat inside links are now `ButtonLink`.
- The home page shows every published service (it stopped at 12).
- Inbox: Inbox and Archived views, honest totals past the newest 500, and an
  unread count beside Inquiries in the sidebar on every page.

### Static public pages (October 2026, after the audit)

- Every public page is built at build time and served as a static file, in
  both languages: home, team, articles, every published article, privacy,
  `sitemap.xml` and `llms.txt` (Cache Components). A save purges the tags it
  touched and the next visit rebuilds that page; the dashboard and the API
  render per request. AGENTS.md § Static public pages.
- The public pages read published content through `src/server/published`
  (server-only, read-only, published-only), the one place besides the API
  allowed to touch the database. The `/api/public/*` routes answer from the
  same cached functions.
- The daily job moved to 20:05 UTC (just after Tbilisi midnight) and refreshes
  the course list; a missed run is covered by a one-day expiry.
- The server no longer fetches its own API (the dashboard's overview loads
  its counts in the browser, like every other screen). The two variables that
  only steered that fetch are gone from the code; if either is still set in
  Vercel → Settings → Environment Variables, it can be deleted there (the
  commit that removed them names both).



| Item                                                           | Why not now                                                                                                                                                      |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| About 68 KB (gzipped) of zod's message locales on public pages | Turbopack does not tree-shake them; a lighter contact form is still to do                                                                                        |
| Password reset, an audit-log viewer, user management           | Features, not fixes                                                                                                                                              |
| Two admins editing one record (last save wins)                 | There is one admin                                                                                                                                               |
| The 20 foreign-key indexes Supabase's advisor lists            | Irrelevant at this size; add with the next schema change                                                                                                         |

## For the owner

Before merging this PR to `main` (a production deploy):

1. **Vercel → Settings → Environment Variables → Production: `DIRECT_URL`**
   must be Supabase's _Session pooler_ string, not `db.<ref>.supabase.co`.
   Production deploys now run migrations through it, and that host is
   IPv6-only, which Vercel's build cannot reach: the deploy would stop (the
   live site stays as it was).
2. **`CRON_SECRET`** (Production): any long random string. Without it the daily
   job refuses every caller.

Soon:

3. **Supabase → Authentication → URL Configuration**: Site URL to the site's
   address (now `https://design.stager.ge`), and add it to Redirect URLs. It is
   `http://localhost:3000`, so any auth email would link there.
4. **An uptime monitor** (UptimeRobot, free) on `/api/health` every 5 minutes:
   it alerts on downtime and keeps the free database from pausing.
5. **Sentry** (free): `NEXT_PUBLIC_SENTRY_DSN` in Vercel, optionally
   `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` for readable stack
   traces; redeploy; then send the test error from Settings.
6. **Database certificate**: Supabase → Database → Settings → SSL, download the
   CA certificate; set its PEM text as `DATABASE_SSL_CA` in Vercel (Production
   and Preview; line breaks may be written as `\n`); redeploy. Once this PR is
   live, switch on "Enforce SSL" in Supabase (deployments older than this PR
   would then lose the database).

Before launch:

7. Vercel Pro under the client's account (Hobby forbids commercial use).
8. Supabase Pro: the free plan has no backups and pauses after a quiet week.
   Once on Pro, turn on leaked-password protection (Authentication →
   Passwords; the free plan refuses it, and Supabase's security advisor
   flags it until then).
9. The logo artwork, and the privacy policy's text. The favicon, the
   home-screen icons and the share card are set in type until a square logo
   mark arrives (`pnpm brand:images` redraws them). The policy's page
   exists (`/ka/privacy`, `/en/privacy`); write it under Dashboard → Page copy
   → Privacy policy. Until then nothing links to it.
10. **The BPG Nino Mtavruli licence.** The site sets Georgian in it at the
    client's request. The files say "BPG-InfoTech free gift"; the npm
    packages they came from name CC BY-NC-ND 4.0, which forbids commercial
    use. Confirm the terms with BPG InfoTech (or wherever the client licensed
    the font) before launch; `src/shared/brandbook/fonts/BPG-NINO-MTAVRULI.txt`
    records the source. Swapping it back is one block in `brandbook.css`.
11. **Page copy → Team, Georgian**: in October 2026 its heading read "Lika
    Gulua", its line "Founder" and its text "Short description" (a team
    member typed into the page's copy in September). The Team page shows
    that heading as its title on `/ka/team`: set it to "გუნდი" (or the
    client's own words) and clear the line. Members are added under
    Dashboard → Team. Done 14 October 2026: the heading is cleared, and the
    page's own title, "გუნდი", shows.
12. **Before search engines are let in**, in the dashboard: the home page's
    heading in Georgian (Page copy → Home, Georgian tab: it is still the
    English line), the address and phone (Site settings: structured data and
    local search need them), the company's figures and the Academy's courses
    (until they exist the page shows marked samples), and optionally each
    page's own search title and description (Page copy; without them the
    site's are used).
13. **Launch** (done, October 2026): set `OPEN_TO_SEARCH` to true
    (`src/widgets/seo/seo.constants.ts`, one line) and deploy. Then verify
    stager.ge in Google Search Console and Bing Webmaster Tools (Bing's
    index also feeds Microsoft Copilot) and submit `/sitemap.xml` to both; create a
    Google Business Profile with the same name, address and phone as Site
    settings.

## Where the rules live

- `AGENTS.md` §4 Security (rules 14–21), §5 Conventions (keyboard, contrast,
  inquiries, failure handling), § Motion, § Theme, § Credential-gated tests,
  § Running on Vercel, § Error reporting (Sentry).
- `CLAUDE.md`: the traps that do the most damage when missed.
- How to run the signed-in tests on a laptop: `AGENTS.md` § Credential-gated
  tests.
