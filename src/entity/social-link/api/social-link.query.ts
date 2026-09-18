import { socialLinkApi } from '@/entity/social-link/api/social-link.api';
import type {
  AdminSocialLink,
  SocialLinkInput,
  SocialLinkUpdateInput,
} from '@/entity/social-link/model/social-link.model';
import { createCrudQueries } from '@/shared/lib/crud-resource';

export const {
  keys: socialLinkKeys,
  listQuery: adminSocialLinksQuery,
  detailQuery: adminSocialLinkQuery,
  useCreate: useCreateSocialLink,
  useUpdate: useUpdateSocialLink,
  useDelete: useDeleteSocialLink,
} = createCrudQueries<AdminSocialLink, SocialLinkInput, SocialLinkUpdateInput>({
  resource: 'social-links',
  api: socialLinkApi,
});
