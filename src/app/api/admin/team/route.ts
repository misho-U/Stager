import { createCollectionRoutes } from '@/app/api/_lib/crud-route';
import {
  createTeamMember,
  listAdminTeamMembers,
} from '@/app/api/_lib/repositories/team-member.repository';
import {
  teamMemberInputSchema,
  type AdminTeamMember,
  type TeamMemberInput,
} from '@/entity/team-member/model/team-member.model';

export const dynamic = 'force-dynamic';

export const { GET, POST } = createCollectionRoutes<AdminTeamMember, TeamMemberInput>({
  entity: 'teamMember',
  entityType: 'TeamMember',
  inputSchema: teamMemberInputSchema,
  list: listAdminTeamMembers,
  create: createTeamMember,
  idOf: (member) => member.id,
  cacheKeyOf: (member) => member.slug,
  auditSummary: (member) => ({ slug: member.slug, status: member.status }),
  conflict: { field: 'slug', message: 'A team member with this slug already exists' },
});
