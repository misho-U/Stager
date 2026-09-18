-- Lock the database down against the Supabase client keys.
--
-- Supabase exposes every table in `public` through PostgREST, reachable with
-- the anon key that ships in the browser bundle. This app does not use that
-- path at all: reads and writes go through our own /api routes, which use
-- Prisma over a direct Postgres connection.
--
-- Enabling RLS with NO policies therefore means:
--   * anon / authenticated  -> zero rows, on every table. A leaked anon key
--                              reads nothing and writes nothing.
--   * Prisma's role         -> unaffected. It owns the tables, and a table
--                              owner bypasses RLS unless FORCE is set, which
--                              we deliberately do not set.
--
-- If a future feature genuinely needs direct client access to a table, add an
-- explicit policy for it in its own migration. Do not disable RLS.

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'admin_users',
    'audit_logs',
    'rate_limits',
    'media',
    'media_translations',
    'projects',
    'project_translations',
    'project_gallery_items',
    'services',
    'service_translations',
    'services_on_projects',
    'team_members',
    'team_member_translations',
    'categories',
    'category_translations',
    'insights',
    'insight_translations',
    'pages',
    'page_translations',
    'page_sections',
    'page_section_translations',
    'site_settings',
    'site_setting_translations',
    'social_links',
    'contact_inquiries'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
  END LOOP;

  -- Prisma's own migration ledger. Harmless data, but Supabase's security
  -- advisor flags any public table without RLS, and a dashboard full of
  -- warnings is a dashboard nobody reads. The migration engine connects as the
  -- table owner, so it is unaffected.
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = '_prisma_migrations'
  ) THEN
    EXECUTE 'ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

-- Belt and braces: remove the table-level grants Supabase's default privileges
-- hand to the PostgREST roles, so those roles are refused before RLS is even
-- consulted. Guarded because the roles do not exist on a plain Postgres
-- instance (a local database, or CI).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
  END IF;
END
$$;
