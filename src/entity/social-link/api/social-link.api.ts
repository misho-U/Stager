import {
  adminSocialLinkSchema,
  type AdminSocialLink,
  type SocialLinkInput,
  type SocialLinkUpdateInput,
} from '@/entity/social-link/model/social-link.model';
import { createCrudApi } from '@/shared/lib/crud-resource';

export const socialLinkApi = createCrudApi<
  AdminSocialLink,
  SocialLinkInput,
  SocialLinkUpdateInput
>({
  basePath: '/api/admin/social-links',
  recordSchema: adminSocialLinkSchema,
});
