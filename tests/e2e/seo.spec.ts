import { expect, test, type APIRequestContext } from '@playwright/test';

import { shortText } from '@/shared/lib/content';

/**
 * What search engines, AI crawlers and link previews read (widgets/seo):
 * each public page's title and description in its own language, from the
 * dashboard; its one address and its translations; the share card; the
 * structured data; the icons; and /llms.txt. Server output, so read as
 * HTML, the way a crawler that runs no script reads it.
 */

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Server output; once is enough.');
});

const LOCALES = ['ka', 'en'] as const;
const PAGES = ['', '/team', '/insights', '/privacy'] as const;
const GEORGIAN = /[ა-ჿ]/;
const GPTBOT = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2)';

type Graph = { '@context': string; '@graph': Array<Record<string, unknown>> };

function decode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** A page as a crawler gets it: its <head>, and the structured data in the page. */
async function read(request: APIRequestContext, path: string, userAgent?: string) {
  const response = await request.get(path, {
    headers: userAgent ? { 'user-agent': userAgent } : {},
  });
  const html = await response.text();
  const head = html.slice(0, html.indexOf('</head>'));
  const attr = (pattern: RegExp) => {
    const match = head.match(pattern);
    return match?.[1] === undefined ? null : decode(match[1]);
  };
  const meta = (key: string) =>
    attr(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`));
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(
    (match) => match[1]!,
  );
  return {
    status: response.status(),
    head,
    titles: [...head.matchAll(/<title>([^<]*)<\/title>/g)].map((match) => decode(match[1]!)),
    meta,
    canonical: attr(/<link rel="canonical" href="([^"]*)"/),
    alternate: (lang: string) =>
      attr(new RegExp(`<link rel="alternate" hrefLang="${lang}" href="([^"]*)"`)),
    scripts,
    graphs: scripts.map((json) => JSON.parse(json) as Graph),
  };
}

function nodes(graphs: Graph[], type: string) {
  return graphs.flatMap((graph) => graph['@graph']).filter((node) => node['@type'] === type);
}

for (const locale of LOCALES) {
  for (const path of PAGES) {
    test(`/${locale}${path} tells crawlers its title, address, translations and share card`, async ({
      request,
    }) => {
      const page = await read(request, `/${locale}${path}`);
      expect(page.status).toBe(200);

      // One title and one description, in the page's language.
      expect(page.titles).toHaveLength(1);
      const [title] = page.titles;
      const description = page.meta('description');
      expect(title).toBeTruthy();
      expect(description).toBeTruthy();
      expect(description!.length).toBeLessThanOrEqual(180);
      if (locale === 'ka') {
        expect(title).toMatch(GEORGIAN);
        expect(description).toMatch(GEORGIAN);
      } else {
        expect(title).not.toMatch(GEORGIAN);
        expect(description).not.toMatch(GEORGIAN);
      }

      // One address, absolute, and both translations named.
      expect(page.canonical).toMatch(new RegExp(`^https?://[^/]+/${locale}${path}$`));
      const origin = new URL(page.canonical!).origin;
      expect(page.alternate('ka')).toBe(`${origin}/ka${path}`);
      expect(page.alternate('en')).toBe(`${origin}/en${path}`);
      expect(page.alternate('x-default')).toBe(`${origin}/ka${path}`);

      // The share card: this address, this language, an image that loads.
      expect(page.meta('og:url')).toBe(page.canonical);
      expect(page.meta('og:title')).toBe(title);
      expect(page.meta('og:locale')).toBe(locale === 'ka' ? 'ka_GE' : 'en_US');
      expect(page.meta('twitter:card')).toBe('summary_large_image');
      const image = page.meta('og:image');
      expect(image).toMatch(/^https?:\/\//);
      const card = await request.get(new URL(image!).pathname);
      expect(card.status()).toBe(200);
      expect(card.headers()['content-type']).toMatch(/^image\//);

      // Not for search engines before launch, nor on a preview, ever.
      expect(page.meta('robots')).toMatch(/noindex/);

      // Structured data that parses, with the way here from home.
      expect(page.graphs.length).toBeGreaterThan(0);
      for (const graph of page.graphs) expect(graph['@context']).toBe('https://schema.org');
      for (const json of page.scripts) expect(json).not.toContain('<');
      if (path === '') {
        expect(nodes(page.graphs, 'WebSite')).toHaveLength(1);
        expect([
          ...nodes(page.graphs, 'Organization'),
          ...nodes(page.graphs, 'ProfessionalService'),
        ]).toHaveLength(1);
      } else {
        const [trail] = nodes(page.graphs, 'BreadcrumbList') as Array<{
          itemListElement: Array<{ item: string }>;
        }>;
        expect(trail!.itemListElement.at(0)!.item).toBe(`${origin}/${locale}`);
        expect(trail!.itemListElement.at(-1)!.item).toBe(page.canonical);
      }
    });
  }
}

test('an AI crawler, which runs no script, finds the metadata in <head>', async ({ request }) => {
  const page = await read(request, '/en', GPTBOT);
  expect(page.titles).toHaveLength(1);
  expect(page.canonical).toMatch(/\/en$/);
  expect(page.meta('description')).toBeTruthy();
});

test('the home page describes the company from the dashboard, never a sample', async ({
  request,
}) => {
  const [layout, services] = await Promise.all([
    request.get('/api/public/layout?locale=EN').then((response) => response.json()),
    request.get('/api/public/services?locale=EN&limit=100').then((response) => response.json()),
  ]);
  const page = await read(request, '/en');
  const [company] = [
    ...nodes(page.graphs, 'Organization'),
    ...nodes(page.graphs, 'ProfessionalService'),
  ] as Array<Record<string, unknown>>;

  expect(company!.name).toBe(layout.siteName);
  expect(company!['@type']).toBe(layout.address ? 'ProfessionalService' : 'Organization');
  expect(company!.email).toBe(layout.contactEmail ?? undefined);
  expect(company!.sameAs).toEqual(
    layout.socialLinks.length > 0
      ? layout.socialLinks.map((link: { url: string }) => link.url)
      : undefined,
  );
  const offered = (
    (company!.hasOfferCatalog as { itemListElement: Array<{ itemOffered: { name: string } }> })
      ?.itemListElement ?? []
  ).map((offer) => offer.itemOffered.name);
  expect(offered).toEqual(services.items.map((service: { title: string }) => service.title));
  expect(page.scripts.join('')).not.toMatch(/sample-/);
});

test('the home page describes each published course, and each video it can show', async ({
  request,
}) => {
  // Real entries only: the samples an empty Academy or screening room shows
  // are never described.
  const [courses, videos] = await Promise.all([
    request.get('/api/public/courses?locale=EN&limit=50').then((response) => response.json()),
    request.get('/api/public/videos?locale=EN&limit=50').then((response) => response.json()),
  ]);
  const page = await read(request, '/en');

  const described = nodes(page.graphs, 'Course') as Array<Record<string, unknown>>;
  expect(described.map((course) => course.name)).toEqual(
    courses.items.map((course: { title: string }) => course.title),
  );
  for (const course of described) {
    expect(course.description).toBeTruthy();
    expect(course.provider).toMatchObject({ '@type': 'Organization' });
    expect(['onsite', 'online']).toContain(
      (course.hasCourseInstance as { courseMode: string }).courseMode,
    );
    const offer = course.offers as { priceCurrency: string } | undefined;
    if (offer) expect(offer.priceCurrency).toBe('GEL');
  }

  const films = nodes(page.graphs, 'VideoObject') as Array<Record<string, unknown>>;
  const titles = videos.items.map((video: { title: string }) => video.title);
  for (const film of films) {
    expect(titles).toContain(film.name);
    expect((film.thumbnailUrl as string[]).length).toBe(1);
    expect(film.uploadDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(film.embedUrl ?? film.contentUrl).toBeTruthy();
  }
  if (videos.total === 0) expect(films).toHaveLength(0);
  expect(page.scripts.join('')).not.toMatch(/sample-/);
});

test('the team page lists each published member as a person', async ({ request }) => {
  const team = await (await request.get('/api/public/team?locale=EN&limit=100')).json();
  const people = nodes((await read(request, '/en/team')).graphs, 'Person');
  expect(people.map((person) => person.name)).toEqual(
    team.items.map((member: { name: string }) => member.name),
  );
});

test('an article describes itself: headline, dates, image, author', async ({ request }) => {
  const { items } = await (await request.get('/api/public/insights?locale=EN&limit=1')).json();
  test.skip(items.length === 0, 'No published article.');
  const [article] = items as Array<{ slug: string; title: string; publishedAt: string | null }>;

  const page = await read(request, `/en/insights/${article!.slug}`);
  const [posting] = nodes(page.graphs, 'BlogPosting');
  expect(posting!.headline).toBe(shortText(article!.title, 110));
  expect(posting!.datePublished).toBe(article!.publishedAt ?? undefined);
  expect((posting!.image as string[]).length).toBe(1);
  expect(posting!.author).toBeTruthy();
  expect(posting!.url).toBe(page.canonical);
  expect(page.meta('og:type')).toBe('article');
  expect(page.meta('article:published_time')).toBe(article!.publishedAt);
});

test('an address with no article is not described', async ({ request }) => {
  const page = await read(request, '/en/insights/no-such-article');
  expect(page.status).toBe(404);
  expect(nodes(page.graphs, 'BlogPosting')).toHaveLength(0);
  expect(page.meta('robots')).toMatch(/noindex/);
});

test('the favicon and the home-screen icons load', async ({ request }) => {
  const favicon = await request.get('/favicon.ico');
  expect(favicon.status()).toBe(200);
  expect(favicon.headers()['content-type']).toBe('image/x-icon');

  const { head } = await read(request, '/en');
  for (const rel of ['icon', 'apple-touch-icon']) {
    const hrefs = [...head.matchAll(new RegExp(`<link rel="${rel}" href="([^"]+\\.png)"`, 'g'))];
    expect(hrefs.length, rel).toBeGreaterThan(0);
    for (const [, href] of hrefs) {
      const icon = await request.get(href!);
      expect(icon.status()).toBe(200);
      expect(icon.headers()['content-type']).toBe('image/png');
    }
  }
});

test('/llms.txt describes the site for AI assistants, from the dashboard', async ({ request }) => {
  const response = await request.get('/llms.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('text/plain; charset=utf-8');
  const text = await response.text();

  const [layout, services, insights, team] = await Promise.all([
    request.get('/api/public/layout?locale=EN').then((r) => r.json()),
    request.get('/api/public/services?locale=EN&limit=100').then((r) => r.json()),
    request.get('/api/public/insights?locale=EN&limit=100').then((r) => r.json()),
    request.get('/api/public/team?locale=EN&limit=1').then((r) => r.json()),
  ]);
  expect(text.startsWith(`# ${layout.siteName}\n\n> `)).toBe(true);
  expect(text).toMatch(/\]\(https?:\/\/[^/]+\/en\)/);
  expect(text).toMatch(/\]\(https?:\/\/[^/]+\/ka\)/);
  for (const service of services.items) expect(text).toContain(`**${service.title}**`);
  for (const article of insights.items) expect(text).toContain(`/en/insights/${article.slug})`);
  const courses = await request.get('/api/public/courses?locale=EN&limit=50').then((r) => r.json());
  for (const course of courses.items) expect(text).toContain(`**${course.title}**`);
  expect(text.includes('#academy)')).toBe(courses.total > 0);
  if (layout.contactEmail) expect(text).toContain(`mailto:${layout.contactEmail}`);
  // A page with nothing to show is not offered.
  expect(text.includes('/en/team)')).toBe(team.total > 0);
  expect(text).not.toMatch(/sample/i);
});

test.describe('a description cut to fit', () => {
  test('stays whole when it fits, and ends at a word with an ellipsis when not', () => {
    expect(shortText('  Kitchen \n design  ', 20)).toBe('Kitchen design');
    expect(shortText('Menus engineered for the guest experience', 24)).toBe(
      'Menus engineered for…',
    );
    expect(shortText('Menus engineered for the guest experience', 24).length).toBeLessThanOrEqual(
      24,
    );
    expect(shortText(null, 10)).toBe('');
  });
});
