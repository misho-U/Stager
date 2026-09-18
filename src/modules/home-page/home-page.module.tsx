import Image from 'next/image';

import { loadHomePageData } from '@/modules/home-page/home-page.service';
import type { DbLocale } from '@/shared/types/enums';

/**
 * SCAFFOLD — replaced in the design phase.
 *
 * This page exists to prove one thing end to end: content edited in /admin is
 * visible here without a redeploy. It renders live database values with no
 * design applied, and the Playwright suite asserts exactly that loop. Delete it
 * once the real homepage is built; keep the data-loading pattern in
 * home-page.service.ts, which is the part worth copying.
 */
export async function HomePageModule({ locale }: { locale: DbLocale }) {
  const { layout, page, projects } = await loadHomePageData(locale);

  const hero = page?.sections.find((section) => section.key === 'hero');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-gutter py-16">
      <div className="rounded-md border border-dashed border-line-strong bg-brand-cream-tint px-4 py-3">
        <p className="text-caption text-ink-muted">
          <strong>Scaffold page.</strong> No design has been applied yet — this renders live
          database content to prove that dashboard edits reach the site.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <p className="text-caption tracking-[0.2em] text-ink-subtle uppercase">
          {layout?.siteName ?? 'STAGER'}
        </p>
        <h1 className="text-headline font-semibold" data-testid="hero-heading">
          {hero?.heading || layout?.tagline || 'Building Better Food Businesses.'}
        </h1>
        {hero?.subheading ? (
          <p className="text-body-lg text-ink-muted">{hero.subheading}</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-title font-semibold">
          {page?.sections.find((section) => section.key === 'selected-projects')?.heading ??
            'Selected Projects'}
        </h2>

        {projects.items.length === 0 ? (
          <p className="text-body-sm text-ink-subtle">
            No published projects yet. Add one in the dashboard and it will appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-6" data-testid="project-list">
            {projects.items.map((project) => (
              <li key={project.id} className="flex flex-col gap-2">
                {project.cover ? (
                  <div className="relative aspect-[3/2] w-full overflow-hidden rounded-md bg-brand-cream-tint">
                    <Image
                      src={project.cover.url}
                      alt={project.cover.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover"
                      {...(project.cover.blurDataUrl
                        ? {
                            placeholder: 'blur' as const,
                            blurDataURL: project.cover.blurDataUrl,
                          }
                        : {})}
                    />
                  </div>
                ) : null}
                <h3 className="text-title-sm font-medium" data-testid="project-title">
                  {project.title}
                </h3>
                {project.summary ? (
                  <p className="text-body-sm text-ink-muted">{project.summary}</p>
                ) : null}
                <p className="text-caption text-ink-subtle">
                  {[project.client, project.location, project.year].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {layout?.socialLinks.length ? (
        <section className="flex flex-wrap gap-3 border-t border-line pt-6">
          {layout.socialLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-caption text-ink-muted underline underline-offset-4"
            >
              {link.label ?? link.platform}
            </a>
          ))}
        </section>
      ) : null}
    </div>
  );
}
