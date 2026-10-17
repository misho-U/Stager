-- A team member's bio is plain text: the team page prints it as text. Until
-- this release the dashboard saved it through the rich-text cleaner, which
-- wrapped it in <p>…</p> and turned each line break into <br />, and the page
-- then showed those tags in the middle of the bio.
--
-- Data, not schema. Turns a bio saved that way back into the text it was
-- typed as, the exact inverse of that cleaner: a paragraph break becomes a
-- blank line, <br /> a line break, every other tag goes, and the three
-- characters it escaped (and a quote) come back. Only bios holding a <p> or
-- <br> are touched; one already plain is left alone, so running it again
-- changes nothing.

UPDATE "team_member_translations"
SET "bio" = btrim(
  replace(replace(replace(replace(
    regexp_replace(
      regexp_replace(
        regexp_replace("bio", '</p>\s*<p[^>]*>', E'\n\n', 'gi'),
        '<br\s*/?>', E'\n', 'gi'),
      '<[^>]+>', '', 'g'),
    '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&amp;', '&'),
  E' \n\t')
WHERE "bio" ~* '<(p|br)[\s/>]';
