import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { OrganizationRole } from '../generated/prisma/enums';
import { hasPermission, type Permission } from './permissions';
import type { Prisma } from '../generated/prisma/client';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async requireOrganization(userId: string, organizationId: string, permission: Permission, database: Prisma.TransactionClient = this.prisma) {
    const membership = await database.organizationMember.findFirst({
      where: { userId, organizationId, status: 'ACTIVE', user: { status: 'ACTIVE' }, organization: { status: 'ACTIVE', archivedAt: null } },
      include: { locationScopes: true },
    });
    if (!membership || !hasPermission(membership.role, membership.permissions, permission)) throw new NotFoundException('Organization was not found.');
    return membership;
  }

  async requireLocation(userId: string, organizationId: string, locationId: string, permission: Permission) {
    const membership = await this.requireOrganization(userId, organizationId, permission);
    const location = await this.prisma.location.findFirst({ where: { id: locationId, organizationId, status: 'ACTIVE', archivedAt: null } });
    if (!location) throw new NotFoundException('Location was not found.');
    if (!membership.allLocations && !membership.locationScopes.some(scope => scope.locationId === locationId)) throw new NotFoundException('Location was not found.');
    return { membership, location };
  }

  assertCanGrant(actor: { role: OrganizationRole; permissions: string[]; allLocations: boolean; locationScopes: { locationId: string }[] }, role: OrganizationRole, requestedPermissions: string[], allLocations: boolean, locationIds: string[]): void {
    if (actor.role === 'OWNER') return;
    if (actor.role !== 'MANAGER' || !hasPermission(actor.role, actor.permissions, 'team.manage')) throw new ForbiddenException('Team management permission is required.');
    if (!['STAFF', 'VIEWER'].includes(role)) throw new ForbiddenException('Managers may invite only Staff or Viewer roles.');
    if (requestedPermissions.some(permission => !actor.permissions.includes(permission))) throw new ForbiddenException('Cannot grant a permission you do not hold explicitly.');
    if (allLocations && !actor.allLocations) throw new ForbiddenException('Cannot grant all-location access.');
    const actorLocations = new Set(actor.locationScopes.map(scope => scope.locationId));
    if (!actor.allLocations && locationIds.some(id => !actorLocations.has(id))) throw new ForbiddenException('Cannot grant a location outside your scope.');
  }
}
