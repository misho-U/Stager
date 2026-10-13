-- The privacy policy: a page the site renders (/ka/privacy, /en/privacy) with
-- one section, "policy", for its text.
--
-- Data, not schema. The dashboard edits a page's copy but can neither create a
-- page nor add a section (the set of sections is a code concern), and the seed
-- never runs in production, so the rows the page needs are created here. Its
-- text is left empty: the client's own policy is written in the dashboard, and
-- until it is, the page says so and nothing links to it.
--
-- Safe on a database that already holds these rows (a seeded one): every
-- insert skips what exists.
--
-- Its own migration, after the one that adds PRIVACY to "PageKey": PostgreSQL
-- refuses a new enum value inside the transaction that added it.

INSERT INTO "pages" ("id", "key", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'PRIVACY', now(), now())
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "page_translations" ("id", "pageId", "locale", "title")
SELECT gen_random_uuid()::text, p."id", copy."locale"::"Locale", copy."title"
FROM "pages" p
CROSS JOIN (
  VALUES ('KA', 'კონფიდენციალურობის პოლიტიკა'), ('EN', 'Privacy policy')
) AS copy ("locale", "title")
WHERE p."key" = 'PRIVACY'
ON CONFLICT ("pageId", "locale") DO NOTHING;

INSERT INTO "page_sections" ("id", "pageId", "key", "order", "isVisible")
SELECT gen_random_uuid()::text, p."id", 'policy', 1, true
FROM "pages" p
WHERE p."key" = 'PRIVACY'
ON CONFLICT ("pageId", "key") DO NOTHING;

INSERT INTO "page_section_translations" ("id", "sectionId", "locale", "heading")
SELECT gen_random_uuid()::text, s."id", copy."locale"::"Locale", copy."heading"
FROM "page_sections" s
JOIN "pages" p ON p."id" = s."pageId"
CROSS JOIN (
  VALUES ('KA', 'კონფიდენციალურობის პოლიტიკა'), ('EN', 'Privacy policy')
) AS copy ("locale", "heading")
WHERE p."key" = 'PRIVACY' AND s."key" = 'policy'
ON CONFLICT ("sectionId", "locale") DO NOTHING;
