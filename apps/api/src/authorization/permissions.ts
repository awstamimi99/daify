import type { OrganizationRole } from '../generated/prisma/enums';

export const permissions = [
  'organization.read', 'organization.update', 'location.read', 'location.manage',
  'menu.read', 'menu.edit', 'menu.availability', 'menu.design', 'menu.publish',
  'analytics.read', 'team.manage', 'billing.read', 'billing.manage', 'qr.manage', 'audit.read',
] as const;
export type Permission = (typeof permissions)[number];

const rolePermissions: Record<OrganizationRole, readonly Permission[]> = {
  OWNER: permissions,
  MANAGER: ['organization.read', 'location.read', 'menu.read', 'menu.edit', 'menu.availability', 'menu.design', 'analytics.read'],
  STAFF: ['location.read', 'menu.read', 'menu.availability'],
  VIEWER: ['organization.read', 'location.read', 'menu.read'],
};

export function hasPermission(role: OrganizationRole, grants: readonly string[], permission: Permission): boolean {
  return rolePermissions[role].includes(permission) || grants.includes(permission);
}
