import type { StaffRole } from '@/generated/prisma/client';

/**
 * What a role may do. Client-safe: the settings screen and the navigation
 * read these lists, and the server enforces them in every page and action.
 *
 * Everyone on the team can see clients, projects, documents and requests,
 * and tick off the tasks they are given. These decide who can change things
 * and who can see money.
 */

export const PERMISSIONS = [
  {
    key: 'enquiries',
    label: 'Enquiries',
    description: 'See new enquiries and decide what happens to them.',
  },
  {
    key: 'clients',
    label: 'Clients and their people',
    description: 'Add clients, invite their people, and choose the main contact.',
  },
  {
    key: 'projects',
    label: 'Run projects',
    description: 'Start projects, move them between stages, and choose who leads.',
  },
  {
    key: 'fees',
    label: 'Fees',
    description: 'Set what a project costs. Fees go into every proposal and agreement.',
  },
  {
    key: 'invoices',
    label: 'Invoices and payments',
    description: 'See money, raise invoices, record payments, and handle renewals.',
  },
  {
    key: 'documents',
    label: 'Documents',
    description: 'Write proposals and agreements and send them for signature.',
  },
  {
    key: 'requests',
    label: 'Client requests',
    description: 'Reply to requests and change where they stand.',
  },
  {
    key: 'journal',
    label: 'Journal',
    description: 'Write, publish and take down journal posts on the website.',
  },
  {
    key: 'billing_settings',
    label: 'Billing details',
    description: 'Change the company details printed on invoices, receipts and contracts.',
  },
] as const;

export type Permission = (typeof PERMISSIONS)[number]['key'];

export const PERMISSION_KEYS: readonly Permission[] = PERMISSIONS.map((permission) => permission.key);

/** Roles whose permissions can be changed. Owners always have every one. */
export const CONFIGURABLE_ROLES = ['admin', 'member'] as const satisfies readonly StaffRole[];
export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

export type RolePermissions = Record<ConfigurableRole, Permission[]>;

export const DEFAULT_PERMISSIONS: RolePermissions = {
  admin: [...PERMISSION_KEYS],
  member: ['clients', 'projects', 'documents', 'requests', 'journal'],
};

/** Reads what is stored, keeping only known permissions, falling back to defaults. */
export function readRolePermissions(stored: unknown): RolePermissions {
  const source = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const pick = (role: ConfigurableRole): Permission[] => {
    const list = source[role];
    if (!Array.isArray(list)) return [...DEFAULT_PERMISSIONS[role]];
    return PERMISSION_KEYS.filter((key) => list.includes(key));
  };
  return { admin: pick('admin'), member: pick('member') };
}

export function permissionsForRole(role: StaffRole, stored: RolePermissions): Permission[] {
  return role === 'owner' ? [...PERMISSION_KEYS] : stored[role];
}

/** Said when an action is refused, in the words a person would use. */
export const NO_PERMISSION = 'Your role does not allow this. Ask an owner if you need it.';
