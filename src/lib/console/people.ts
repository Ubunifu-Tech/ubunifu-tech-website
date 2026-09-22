import type { StaffRole } from '@/generated/prisma/client';

/** What each role can do, said the way the team page says it. Client-safe. */
export const ROLE_LABEL: Record<StaffRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export const ROLE_DESCRIPTION: Record<StaffRole, string> = {
  owner: 'Everything, including the team and what each role may do.',
  admin: 'Most things, as set in the permissions on the Team page.',
  member: 'Day-to-day work, as set in the permissions on the Team page.',
};

export const ROLE_OPTIONS = (['member', 'admin', 'owner'] as const).map((role) => ({
  value: role,
  label: ROLE_LABEL[role],
  description: ROLE_DESCRIPTION[role],
}));
