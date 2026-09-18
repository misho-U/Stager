import {
  adminTeamMemberSchema,
  type AdminTeamMember,
  type TeamMemberInput,
  type TeamMemberUpdateInput,
} from '@/entity/team-member/model/team-member.model';
import { createCrudApi } from '@/shared/lib/crud-resource';

export const teamMemberApi = createCrudApi<
  AdminTeamMember,
  TeamMemberInput,
  TeamMemberUpdateInput
>({
  basePath: '/api/admin/team',
  recordSchema: adminTeamMemberSchema,
});
