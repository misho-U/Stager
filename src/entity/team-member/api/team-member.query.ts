import { teamMemberApi } from '@/entity/team-member/api/team-member.api';
import type {
  AdminTeamMember,
  TeamMemberInput,
  TeamMemberUpdateInput,
} from '@/entity/team-member/model/team-member.model';
import { createCrudQueries } from '@/shared/lib/crud-resource';

export const {
  keys: teamMemberKeys,
  listQuery: adminTeamMembersQuery,
  detailQuery: adminTeamMemberQuery,
  useCreate: useCreateTeamMember,
  useUpdate: useUpdateTeamMember,
  useDelete: useDeleteTeamMember,
} = createCrudQueries<AdminTeamMember, TeamMemberInput, TeamMemberUpdateInput>({
  resource: 'team-members',
  api: teamMemberApi,
});
