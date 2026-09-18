import { createItemRoutes } from '@/app/api/_lib/crud-route';
import {
  deleteTeamMember,
  getAdminTeamMember,
  updateTeamMember,
} from '@/app/api/_lib/repositories/team-member.repository';
import {
  teamMemberUpdateInputSchema,
  type AdminTeamMember,
  type TeamMemberUpdateInput,
} from '@/entity/team-member/model/team-member.model';

export const dynamic = 'force-dynamic';

export const { GET, PATCH, DELETE } = createItemRoutes<AdminTeamMember, TeamMemberUpdateInput>({
  entity: 'teamMember',
  entityType: 'TeamMember',
  updateSchema: teamMemberUpdateInputSchema,
  get: getAdminTeamMember,
  update: updateTeamMember,
  remove: deleteTeamMember,
  cacheKeyOf: (member) => member.slug,
  auditSummary: (member) => ({ slug: member.slug, status: member.status }),
  notFoundMessage: 'Team member not found',
  conflict: { field: 'slug', message: 'A team member with this slug already exists' },
});
