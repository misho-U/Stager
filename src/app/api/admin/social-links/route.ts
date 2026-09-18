import { createCollectionRoutes } from '@/app/api/_lib/crud-route';
import {
  createSocialLink,
  listAdminSocialLinks,
} from '@/app/api/_lib/repositories/social-link.repository';
import {
  socialLinkInputSchema,
  type AdminSocialLink,
  type SocialLinkInput,
} from '@/entity/social-link/model/social-link.model';

export const dynamic = 'force-dynamic';

export const { GET, POST } = createCollectionRoutes<AdminSocialLink, SocialLinkInput>({
  entity: 'socialLink',
  entityType: 'SocialLink',
  inputSchema: socialLinkInputSchema,
  list: listAdminSocialLinks,
  create: createSocialLink,
  idOf: (link) => link.id,
  // Social links are rendered in the layout, never on a detail page.
  cacheKeyOf: () => null,
  auditSummary: (link) => ({ platform: link.platform, isActive: link.isActive }),
});
