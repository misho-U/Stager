import Link from 'next/link';
import type { ComponentProps } from 'react';

type SiteLinkProps = Omit<ComponentProps<'a'>, 'href'> & { href: string };

/**
 * A link on the public site.
 *
 * To another page (`/en/team`, an article, `/en#services`): next/link, so it
 * opens without reloading the page. The pages are built ahead of time, and a
 * link fetches its page as it comes into view, so the next page is usually
 * there before the click. Each page's motion starts again on arrival
 * (widgets/site-motion), and an address with a section lands on it and takes
 * the keyboard along (widgets/smooth-scroll).
 *
 * Within this page (`#inquiry`): a plain <a>, which the smooth scroll glides
 * along. Anything off the site (YouTube, LinkedIn, mail and phone) stays a
 * plain <a> where it is written.
 */
export function SiteLink({ href, ...props }: SiteLinkProps) {
  if (href.startsWith('#')) return <a href={href} {...props} />;
  return <Link href={href} {...props} />;
}
