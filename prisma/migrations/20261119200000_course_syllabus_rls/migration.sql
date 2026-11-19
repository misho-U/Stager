-- Lock the course syllabus tables down like every other table
-- (see 20260918000100_enable_rls).
--
-- 20261015214232_course_syllabus created course_modules and
-- course_module_translations without enabling RLS, so the anon key that ships
-- in the browser bundle could read, change and delete every syllabus row
-- through PostgREST. RLS with no policies shuts that path; Prisma's role owns
-- the tables and is unaffected (FORCE is deliberately not set).
--
-- Already applied by hand to production on 2026-11-19; ENABLE is idempotent,
-- so `prisma migrate deploy` re-running it is a no-op.

ALTER TABLE "course_modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_module_translations" ENABLE ROW LEVEL SECURITY;
