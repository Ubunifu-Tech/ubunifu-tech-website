import type { StaffRole } from '@/generated/prisma/client';

/** What each role can do, said the way the team page says it. Client-safe. */
export const ROLE_LABEL: Record<StaffRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export const ROLE_DESCRIPTION: Record<StaffRole, string> = {
  owner: 'Everything, including who is on the team.',
  admin: 'Everything except managing the team.',
  member: 'Clients, projects, documents and requests. Not billing details or the team.',
};

export const ROLE_OPTIONS = (['member', 'admin', 'owner'] as const).map((role) => ({
  value: role,
  label: ROLE_LABEL[role],
  description: ROLE_DESCRIPTION[role],
}));
