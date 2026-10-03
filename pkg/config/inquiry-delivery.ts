/**
 * Whether /api/contact stores a submission and forwards it to the inbox.
 *
 * Every deployment shares one database, and with it the inbox address set in
 * the dashboard. A test sent from a preview (design.stager.ge, a branch link)
 * or from a dev server whose `.env.local` points at the live database would
 * reach the client as a real lead: a row in their dashboard and an email. Only
 * the live site needs to deliver.
 *
 *  - A production build delivers, always, unless it is a Vercel preview. No
 *    variable can switch real leads off.
 *  - A Vercel preview and the dev server do not, unless INQUIRY_DELIVERY=on
 *    (to test the email itself, ideally against a local database).
 *
 * "Is this a preview" is the one question asked of Vercel, and only a positive
 * answer withholds delivery. If Vercel's system variables were ever missing,
 * previews would deliver as they did before this existed; the live site would
 * never stop.
 *
 * Pure, with no `process.env`, so the tests can check every case.
 */
export function deliversInquiries(input: {
  /** NODE_ENV of the server: `production` for a build, `development` for `next dev`. */
  nodeEnv: string | undefined;
  /** VERCEL_ENV: `production`, `preview` or `development`; unset off Vercel. */
  vercelEnv: string | undefined;
  /** INQUIRY_DELIVERY, as set. Only `on` turns delivery on where it is off. */
  setting: string | undefined;
}): boolean {
  const isPreview = input.vercelEnv === 'preview';
  if (input.nodeEnv === 'production' && !isPreview) return true;
  return input.setting?.trim().toLowerCase() === 'on';
}
