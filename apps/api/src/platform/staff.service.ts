import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { RequestMetadata } from '../auth/request-metadata';
import { EmailDeliveryService } from '../auth/email-delivery.service';
import { assertStaffGrant, canPlatform, staffPermissions, staffPresets, type StaffAccess } from './staff-policy';
import { supportReason } from './support-reason';
import type { InviteStaffDto, UpdateStaffDto } from './staff.dto';
import type { DirectoryQuery } from './platform.dto';

const select = { id: true, userId: true, email: true, role: true, status: true, permissions: true, allOrganizations: true, organizationIds: true, version: true, invitationExpiresAt: true, createdAt: true } as const;
@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService, private readonly email: EmailDeliveryService) {}

  private async actor(tx: Prisma.TransactionClient, id: string): Promise<AuthenticatedUser> {
    const user = await tx.user.findUnique({ where: { id }, include: { platformStaff: true } });
    if (!user || user.status !== 'ACTIVE' || !user.emailVerifiedAt) throw new ForbiddenException('Employee account is not active.');
    const staff = user.platformStaff;
    return { id, email: user.email, displayName: user.displayName, platformAdmin: user.platformAdmin, assuranceLevel: 'AAL2', sessionId: '',
      ...(staff?.status === 'ACTIVE' ? { platformStaff: { role: staff.role, permissions: staff.permissions, allOrganizations: staff.allOrganizations, organizationIds: staff.organizationIds } } : {}) };
  }
  private async lock(tx: Prisma.TransactionClient, user: AuthenticatedUser) {
    // Serialize grants, acceptance and suspension, including inviter revalidation.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(15102026, 1)`;
    if (user.assuranceLevel !== 'AAL2' || !await tx.session.findFirst({ where: { id: user.sessionId, userId: user.id, revokedAt: null, expiresAt: { gt: new Date() }, absoluteExpiresAt: { gt: new Date() } } })) throw new ForbiddenException('Sign in again with MFA.');
    return this.actor(tx, user.id);
  }
  private async validate(tx: Prisma.TransactionClient, actor: AuthenticatedUser, access: StaffAccess) {
    assertStaffGrant(actor, access);
    if (access.allOrganizations && access.organizationIds.length) throw new BadRequestException('Choose all customers or specific customers.');
    if (access.permissions.some(p => ['users.read', 'users.manage', 'audit.read'].includes(p)) && !access.allOrganizations) throw new BadRequestException('Global user and audit permissions require all-customer access.');
    for (const [permission, dependency] of [['offers.create', 'offers.read'], ['offers.approve', 'offers.read'], ['discounts.manage', 'staff.manage'], ['discounts.manage', 'offers.read'], ['offers.read', 'customers.read'], ['menus.edit', 'menus.read'], ['menus.publish', 'menus.edit'], ['customers.manage', 'customers.read'], ['staff.manage', 'customers.read'], ['menus.read', 'customers.read']]) {
      if (access.permissions.includes(permission!) && !access.permissions.includes(dependency!)) throw new BadRequestException(`${permission} requires ${dependency}.`);
    }
    if (await tx.organization.count({ where: { id: { in: access.organizationIds }, archivedAt: null, status: { not: 'ARCHIVED' } } }) !== access.organizationIds.length) throw new BadRequestException('One or more customers are no longer available.');
  }
  private audit(tx: Prisma.TransactionClient, user: AuthenticatedUser, metadata: RequestMetadata, reason: string, id: string, action: string, detail?: Prisma.InputJsonValue) {
    return tx.securityEvent.create({ data: { type: 'PLATFORM_ACCESS', actorUserId: user.id, targetType: 'PlatformStaff', targetId: id, outcome: 'SUCCESS', reason: supportReason(reason), requestId: metadata.requestId, ipAddress: metadata.ipAddress, metadata: { action, ...(detail ? { detail } : {}) } } });
  }
  async list(user: AuthenticatedUser, reason: string | undefined, query: DirectoryQuery, metadata: RequestMetadata) {
    const accessReason = supportReason(reason);
    return this.prisma.$transaction(async tx => {
      const actor = await this.actor(tx, user.id);
      if (!canPlatform({ ...actor, assuranceLevel: user.assuranceLevel }, 'staff.manage')) throw new ForbiddenException('Employee management permission is required.');
      const rows = await tx.platformStaff.findMany({ where: { ...(query.after ? { id: { gt: query.after } } : {}), ...(query.search ? { email: { contains: query.search, mode: 'insensitive' } } : {}) }, select, orderBy: { id: 'asc' }, take: query.limit });
      const visible = rows.filter(row => { if (row.userId === user.id) return true; try { assertStaffGrant(actor, row); return true; } catch { return false; } });
      await this.audit(tx, user, metadata, accessReason, user.id, 'staff.list');
      return { employees: visible, nextCursor: rows.length === query.limit ? rows.at(-1)!.id : null,
        owner: actor.platformAdmin, actorPermissions: actor.platformAdmin ? [...staffPermissions] : actor.platformStaff!.permissions,
        allOrganizations: actor.platformAdmin || actor.platformStaff!.allOrganizations,
        organizationIds: actor.platformAdmin ? [] : actor.platformStaff!.organizationIds,
        presets: staffPresets };
    });
  }
  async invite(user: AuthenticatedUser, dto: InviteStaffDto, metadata: RequestMetadata) {
    const saved = await this.prisma.$transaction(async tx => {
      const actor = await this.lock(tx, user);
      await this.validate(tx, actor, dto);
      if (dto.email === user.email || await tx.user.findFirst({ where: { email: dto.email, platformAdmin: true } })) throw new ForbiddenException('Owner and self access cannot be changed here.');
      const existing = await tx.platformStaff.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('This employee already exists. Edit the existing record.');
      const row = await tx.platformStaff.create({ data: { email: dto.email, role: dto.role, permissions: dto.permissions, allOrganizations: dto.allOrganizations, organizationIds: dto.organizationIds, invitedById: user.id, invitationExpiresAt: new Date(Date.now() + 7 * 86400000) }, select });
      await this.audit(tx, user, metadata, dto.reason, row.id, 'staff.invited', { role: row.role, permissions: row.permissions, allOrganizations: row.allOrganizations, organizationIds: row.organizationIds });
      return row;
    });
    await this.email.sendStaffInvitation(saved.email);
    return saved;
  }
  async update(user: AuthenticatedUser, id: string, dto: UpdateStaffDto, metadata: RequestMetadata) {
    const saved = await this.prisma.$transaction(async tx => {
      const actor = await this.lock(tx, user);
      const before = await tx.platformStaff.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Employee was not found.');
      if (before.userId === user.id || before.email === user.email || await tx.user.findFirst({ where: { email: before.email, platformAdmin: true } })) throw new ForbiddenException('Owner and self access cannot be changed here.');
      assertStaffGrant(actor, before);
      await this.validate(tx, actor, dto);
      if (dto.expectedVersion !== before.version) throw new ConflictException('Employee permissions changed. Reload before saving.');
      if (!before.userId && dto.status === 'ACTIVE') throw new BadRequestException('The employee must accept their invitation with MFA.');
      if (before.userId && dto.status === 'INVITED') throw new BadRequestException('An accepted employee cannot return to invited status.');
      if (before.userId && dto.status === 'ACTIVE') {
        const target = await tx.user.findUniqueOrThrow({ where: { id: before.userId } });
        if (target.status !== 'ACTIVE' || !target.emailVerifiedAt || !target.mfaSecret?.startsWith('v1.')) throw new BadRequestException('Active employees need a verified account and configured MFA.');
      }
      const row = await tx.platformStaff.update({ where: { id }, data: { role: dto.role, permissions: dto.permissions, allOrganizations: dto.allOrganizations, organizationIds: dto.organizationIds, status: dto.status, version: { increment: 1 }, ...(dto.status === 'INVITED' ? { invitedById: user.id, invitationExpiresAt: new Date(Date.now() + 7 * 86400000) } : {}) }, select });
      if (before.userId) await tx.session.updateMany({ where: { userId: before.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit(tx, user, metadata, dto.reason, id, 'staff.updated', { before: { role: before.role, permissions: before.permissions, status: before.status, allOrganizations: before.allOrganizations, organizationIds: before.organizationIds }, after: { role: row.role, permissions: row.permissions, status: row.status, allOrganizations: row.allOrganizations, organizationIds: row.organizationIds } });
      return row;
    });
    if (saved.status === 'INVITED') await this.email.sendStaffInvitation(saved.email);
    return saved;
  }
  async invitation(user: AuthenticatedUser) {
    return this.prisma.platformStaff.findFirst({ where: { email: user.email, status: 'INVITED', invitationExpiresAt: { gt: new Date() } }, select });
  }
  async accept(user: AuthenticatedUser, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      await this.lock(tx, user);
      const target = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (target.platformAdmin || !target.mfaSecret?.startsWith('v1.')) throw new ForbiddenException('Set up MFA before accepting an employee invitation.');
      const invitation = await tx.platformStaff.findFirst({ where: { email: user.email, userId: null, status: 'INVITED', invitationExpiresAt: { gt: new Date() } } });
      if (!invitation) throw new NotFoundException('No active employee invitation was found for this email.');
      const inviter = await this.actor(tx, invitation.invitedById);
      await this.validate(tx, inviter, invitation);
      const row = await tx.platformStaff.update({ where: { id: invitation.id }, data: { userId: user.id, status: 'ACTIVE', version: { increment: 1 } }, select });
      await this.audit(tx, user, metadata, 'Employee accepted their invitation with MFA', row.id, 'staff.accepted');
      return row;
    });
  }
}
