import type { AdminProject, ProjectFormValues } from '@/entity/project/model/project.model';

const EMPTY_TRANSLATION = {
  title: '',
  summary: '',
  body: '',
  metaTitle: '',
  metaDescription: '',
  ogMediaId: null,
};

export const EMPTY_PROJECT: ProjectFormValues = {
  slug: '',
  coverMediaId: null,
  youtubeUrl: null,
  client: null,
  location: null,
  year: null,
  status: 'DRAFT',
  featured: false,
  order: 0,
  translations: { KA: { ...EMPTY_TRANSLATION }, EN: { ...EMPTY_TRANSLATION } },
  serviceIds: [],
  galleryMediaIds: [],
};

/**
 * Server record → form values.
 *
 * Nulls become empty strings for text inputs: a controlled input given null
 * flips to uncontrolled and React warns, and the schema maps blanks back to
 * null on submit.
 */
export function toFormValues(project: AdminProject): ProjectFormValues {
  return {
    slug: project.slug,
    coverMediaId: project.coverMediaId,
    youtubeUrl: project.youtubeUrl,
    client: project.client ?? '',
    location: project.location ?? '',
    year: project.year,
    status: project.status,
    featured: project.featured,
    order: project.order,
    translations: {
      KA: {
        title: project.translations.KA.title,
        summary: project.translations.KA.summary,
        body: project.translations.KA.body,
        metaTitle: project.translations.KA.metaTitle ?? '',
        metaDescription: project.translations.KA.metaDescription ?? '',
        ogMediaId: project.translations.KA.ogMediaId,
      },
      EN: {
        title: project.translations.EN.title,
        summary: project.translations.EN.summary,
        body: project.translations.EN.body,
        metaTitle: project.translations.EN.metaTitle ?? '',
        metaDescription: project.translations.EN.metaDescription ?? '',
        ogMediaId: project.translations.EN.ogMediaId,
      },
    },
    serviceIds: project.serviceIds,
    galleryMediaIds: project.gallery.map((item) => item.id),
  };
}

