import { createItemRoutes } from '@/app/api/_lib/crud-route';
import {
  deleteSocialLink,
  getAdminSocialLink,
  updateSocialLink,
} from '@/app/api/_lib/repositories/social-link.repository';
import {
  socialLinkUpdateInputSchema,
  type AdminSocialLink,
  type SocialLinkUpdateInput,
} from '@/entity/social-link/model/social-link.model';

export const dynamic = 'force-dynamic';

export const { GET, PATCH, DELETE } = createItemRoutes<AdminSocialLink, SocialLinkUpdateInput>({
  entity: 'socialLink',
  entityType: 'SocialLink',
  updateSchema: socialLinkUpdateInputSchema,
  get: getAdminSocialLink,
  update: updateSocialLink,
  remove: deleteSocialLink,
  cacheKeyOf: () => null,
  auditSummary: (link) => ({ platform: link.platform, isActive: link.isActive }),
  notFoundMessage: 'Social link not found',
});
