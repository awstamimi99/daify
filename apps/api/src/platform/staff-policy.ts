import { ForbiddenException, SetMetadata } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { Prisma } from '../generated/prisma/client';

export const staffPermissions = [
  'staff.manage', 'customers.read', 'customers.manage', 'users.read', 'users.manage',
  'audit.read', 'billing.read', 'billing.manage', 'templates.read', 'support.manage',
  'menus.read', 'menus.edit', 'menus.publish',
] as const;
export type StaffPermission = typeof staffPermissions[number];
export const staffRoles = ['MANAGER', 'SUPERVISOR', 'SUPPORT', 'SALES'] as const;
export type StaffRole = typeof staffRoles[number];
export interface StaffAccess {
  role: StaffRole; permissions: string[]; allOrganizations: boolean; organizationIds: string[];
}
export const staffPresets: Record<StaffRole, readonly StaffPermission[]> = {
  MANAGER: ['staff.manage', 'customers.read', 'customers.manage', 'billing.read', 'templates.read', 'support.manage', 'menus.read', 'menus.edit', 'menus.publish'],
  SUPERVISOR: ['customers.read', 'templates.read', 'support.manage', 'menus.read', 'menus.edit', 'menus.publish'],
  SUPPORT: ['customers.read', 'templates.read', 'support.manage', 'menus.read', 'menus.edit', 'menus.publish'],
  SALES: ['customers.read', 'billing.read', 'templates.read'],
};
export const PlatformPermission = (permission: StaffPermission) => SetMetadata('platform.permission', permission);
export function allowedForRole(role: StaffRole, permission: string) {
  return staffPermissions.includes(permission as StaffPermission) && (role !== 'SALES' || staffPresets.SALES.includes(permission as StaffPermission)) &&
    (!['SUPPORT', 'SALES'].includes(role) || permission !== 'staff.manage');
}
export function canPlatform(user: AuthenticatedUser, permission: StaffPermission) {
  if (user.assuranceLevel !== 'AAL2') return false;
  if (user.platformAdmin) return true;
  const staff = user.platformStaff;
  return Boolean(staff && allowedForRole(staff.role, permission) && staff.permissions.includes(permission));
}
export function requirePlatform(user: AuthenticatedUser, permission: StaffPermission, organizationId?: string) {
  if (!canPlatform(user, permission)) throw new ForbiddenException('This employee permission is required.');
  if (organizationId && !user.platformAdmin && !user.platformStaff?.allOrganizations && !user.platformStaff?.organizationIds.includes(organizationId)) throw new ForbiddenException('This customer is outside your assigned scope.');
}
export function customerFilter(user: AuthenticatedUser): { in: string[] } | undefined {
  return user.platformAdmin || user.platformStaff?.allOrganizations ? undefined : { in: user.platformStaff?.organizationIds ?? [] };
}
export function assertStaffGrant(actor: AuthenticatedUser, target: StaffAccess) {
  requirePlatform(actor, 'staff.manage');
  if (target.permissions.some(p => !allowedForRole(target.role, p))) throw new ForbiddenException('This role cannot receive one of the selected permissions. Sales cannot edit or publish customer menus.');
  if (actor.platformAdmin) return;
  const staff = actor.platformStaff!;
  const permittedRoles = staff.role === 'MANAGER' ? ['SUPERVISOR', 'SUPPORT', 'SALES'] : staff.role === 'SUPERVISOR' ? ['SUPPORT', 'SALES'] : [];
  if (!permittedRoles.includes(target.role)) throw new ForbiddenException('Only the Owner can appoint or manage Managers. You may manage only roles below yours.');
  if (target.permissions.some(p => !staff.permissions.includes(p))) throw new ForbiddenException('You cannot grant permissions you do not hold.');
  if (!staff.allOrganizations && (target.allOrganizations || target.organizationIds.some(id => !staff.organizationIds.includes(id)))) throw new ForbiddenException('You cannot grant customer access beyond your scope.');
}

export async function currentPlatformActor(tx: Prisma.TransactionClient, actor: AuthenticatedUser) {
  const user = await tx.user.findUnique({ where: { id: actor.id }, include: { platformStaff: true } });
  if (!user || user.status !== 'ACTIVE' || !user.emailVerifiedAt) throw new ForbiddenException('Employee account is not active.');
  const staff = user.platformStaff;
  return { ...actor, platformAdmin: user.platformAdmin, platformStaff: staff?.status === 'ACTIVE' ? { role: staff.role, permissions: staff.permissions, allOrganizations: staff.allOrganizations, organizationIds: staff.organizationIds } : undefined };
}
