import { getTranslations } from 'next-intl/server';

import {
  INSIGHTS_PATH,
  insightPath,
  type PublicInsightListItem,
} from '@/entity/insight/model/insight.model';
import { PRIVACY_PATH } from '@/entity/page/model/page.model';
import type { PublicServiceListItem } from '@/entity/service/model/service.model';
import { TEAM_PATH, type PublicTeamMember } from '@/entity/team-member/model/team-member.model';
import { socialName } from '@/shared/components/social-links';
import { shortText } from '@/shared/lib/content';
import type { ListResponse } from '@/shared/types/api';
import type { DbLocale } from '@/shared/types/enums';
import { collectionTag, PUBLIC_REVALIDATE_SECONDS } from '@pkg/cache/tags';
import { serverFetch } from '@pkg/http/fetcher';
import { toAppLocale } from '@pkg/i18n/routing';
import { canonicalUrl, siteSeo } from '@/widgets/seo/seo.service';
import { loadSiteChrome, readPublic } from '@/widgets/site-chrome/site-chrome.service';

/**
 * /llms.txt (llmstxt.org): the site in one short Markdown file, for AI
 * assistants that answer questions about STAGER. Who the company is, its
 * pages in both languages, its services, its people, its articles and how
 * to reach it, all from the dashboard, through the same tagged reads as the
 * pages, so a save there shows here at once. Never a sample entry, and a
 * section with nothing in it is left out.
 */

/** Long enough to say what a thing is; this is an index, not the page. */
const SUMMARY_MAX = 240;

const NONE = { items: [], total: 0 };

async function digest(locale: DbLocale) {
  const [chrome, services, team, insights, t] = await Promise.all([
    loadSiteChrome(locale),
    readPublic<ListResponse<PublicServiceListItem>>(
      'llms:services',
      serverFetch<ListResponse<PublicServiceListItem>>(
        `/api/public/services?locale=${locale}&limit=100`,
        {
          tags: [collectionTag('service')],
          revalidate: PUBLIC_REVALIDATE_SECONDS,
        },
      ),
      NONE,
    ),
    readPublic<ListResponse<PublicTeamMember>>(
      'llms:team',
      serverFetch<ListResponse<PublicTeamMember>>(`/api/public/team?locale=${locale}&limit=100`, {
        tags: [collectionTag('teamMember')],
        revalidate: PUBLIC_REVALIDATE_SECONDS,
      }),
      NONE,
    ),
    readPublic<ListResponse<PublicInsightListItem>>(
      'llms:insights',
      serverFetch<ListResponse<PublicInsightListItem>>(
        `/api/public/insights?locale=${locale}&limit=100`,
        {
          tags: [collectionTag('insight')],
          revalidate: PUBLIC_REVALIDATE_SECONDS,
        },
      ),
      NONE,
    ),
    getTranslations({ locale: toAppLocale(locale) }),
  ]);
  return {
    locale,
    chrome,
    site: siteSeo(chrome.layout),
    services: services.data.items,
    team: team.data.items,
    insights: insights.data.items,
    t,
  };
}

type Digest = Awaited<ReturnType<typeof digest>>;

/** One line of a Markdown list, flattened: a line break would end the item. */
function item(text: string): string {
  return `- ${text.replace(/\s+/g, ' ').trim()}`;
}

function link(name: string, url: string): string {
  return `[${name.replace(/[[\]]/g, '')}](${url})`;
}

function section(heading: string, lines: string[]): string[] {
  return lines.length > 0 ? ['', `## ${heading}`, '', ...lines] : [];
}

/** The site's pages, each in the languages it has something to show in. */
function pages(digests: readonly Digest[]): string[] {
  return digests.flatMap(({ locale, chrome, t }) => [
    item(link(t('nav.home'), canonicalUrl(locale, ''))),
    ...(chrome.teamHref ? [item(link(t('nav.team'), canonicalUrl(locale, TEAM_PATH)))] : []),
    ...(chrome.insightsHref
      ? [item(link(t('nav.insights'), canonicalUrl(locale, INSIGHTS_PATH)))]
      : []),
    ...(chrome.privacyHref
      ? [item(link(t('privacy.title'), canonicalUrl(locale, PRIVACY_PATH)))]
      : []),
  ]);
}

/** A name, with its other-language spelling beside it when that differs. */
function bilingual(name: string, other: string | undefined): string {
  return other && other !== name ? `**${name}** (${other})` : `**${name}**`;
}

export async function buildLlmsTxt(): Promise<string> {
  // English leads: most assistants answer in it. Georgian follows.
  const [en, ka] = await Promise.all([digest('EN'), digest('KA')]);
  const { site, chrome, t } = en;
  const layout = chrome.layout;
  const georgian = <T extends { id: string }>(list: readonly T[], id: string) =>
    list.find((entry) => entry.id === id);

  const lines = [
    `# ${site.name}`,
    '',
    `> ${shortText(site.description, SUMMARY_MAX)}`,
    ...(layout?.tagline.trim() && layout.tagline.trim() !== site.description
      ? ['', layout.tagline.trim()]
      : []),
    ...section(t('llms.pages'), pages([en, ka])),
    ...section(t('nav.services'), [
      ...en.services.map((service) =>
        item(
          [
            bilingual(service.title, georgian(ka.services, service.id)?.title),
            shortText(service.shortDescription, SUMMARY_MAX),
          ]
            .filter(Boolean)
            .join(': '),
        ),
      ),
      ...(en.services.length > 0
        ? ['', link(t('nav.services'), `${canonicalUrl('EN', '')}#services`)]
        : []),
    ]),
    ...section(
      t('nav.team'),
      en.team.map((member) =>
        item(
          [
            [bilingual(member.name, georgian(ka.team, member.id)?.name), member.position]
              .filter(Boolean)
              .join(', '),
            shortText(member.expertise || member.bio, SUMMARY_MAX),
          ]
            .filter(Boolean)
            .join(': '),
        ),
      ),
    ),
    ...section(
      t('nav.insights'),
      en.insights.map((article) =>
        item(
          [
            link(article.title, canonicalUrl('EN', insightPath(article.slug))),
            shortText(article.excerpt, SUMMARY_MAX),
          ]
            .filter(Boolean)
            .join(': '),
        ),
      ),
    ),
    ...section(t('nav.contact'), [
      ...(layout?.contactEmail
        ? [
            item(
              `${t('contact.email')}: ${link(layout.contactEmail, `mailto:${layout.contactEmail}`)}`,
            ),
          ]
        : []),
      ...(layout?.phone ? [item(`${t('contact.phone')}: ${layout.phone}`)] : []),
      ...(layout?.address.trim() ? [item(`${t('contact.address')}: ${layout.address}`)] : []),
      ...(layout?.socialLinks ?? []).map((social) => item(link(socialName(social), social.url))),
      item(link(t('contact.title'), `${canonicalUrl('EN', '')}#inquiry`)),
    ]),
    // The company in Georgian, for answers given in Georgian.
    ...section(ka.site.title, [shortText(ka.site.description, SUMMARY_MAX)]),
  ];

  return `${lines.join('\n')}\n`;
}
