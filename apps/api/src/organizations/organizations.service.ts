import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorizationService } from '../authorization/authorization.service';
import { permissions, hasPermission } from '../authorization/permissions';
import { CryptoService } from '../auth/crypto.service';
import type { RequestMetadata } from '../auth/request-metadata';
import { INVITATION_MS } from '../auth/auth.constants';
import { EmailDeliveryService } from '../auth/email-delivery.service';
import type { Prisma } from '../generated/prisma/client';
import { consumeToken } from '../auth/consume-token';
import { PrismaService } from '../database/prisma.service';
import type { AcceptInvitationDto, CreateLocationDto, CreateOrganizationDto, InviteMemberDto, UpdateMemberDto } from './dto/organizations.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService, private readonly crypto: CryptoService, private readonly emailDelivery: EmailDeliveryService) {}

  async create(userId: string, dto: CreateOrganizationDto, metadata: RequestMetadata) {
    if (await this.prisma.organization.findUnique({ where: { slug: dto.slug }, select: { id: true } })) throw new ConflictException('Organization slug is already in use.');
    return this.prisma.$transaction(async tx => {
      const organization = await tx.organization.create({ data: { name: dto.name.trim(), slug: dto.slug, defaultLocale: dto.defaultLocale ?? 'en', timezone: dto.timezone ?? 'Asia/Kuwait' } });
      await tx.organizationMember.create({ data: { organizationId: organization.id, userId, role: 'OWNER', status: 'ACTIVE', allLocations: true, permissions: [], acceptedAt: new Date() } });
      await tx.securityEvent.create({ data: { type: 'ORGANIZATION_CREATED', actorUserId: userId, organizationId: organization.id, targetType: 'Organization', targetId: organization.id, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      return organization;
    });
  }

  async list(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, status: 'ACTIVE', organization: { status: 'ACTIVE', archivedAt: null } },
      include: { locationScopes: true, organization: true }, orderBy: { createdAt: 'asc' },
    });
    return Promise.all(memberships.map(async membership => {
      const organization = membership.organization;
      const locations = await this.prisma.location.findMany({
        where: { organizationId: organization.id, status: 'ACTIVE', archivedAt: null, ...(membership.allLocations ? {} : { id: { in: membership.locationScopes.map(scope => scope.locationId) } }) },
        select: { id: true, name: true, slug: true, timezone: true, currency: true, defaultLanguage: true }, orderBy: { createdAt: 'asc' },
      });
      return { id: organization.id, name: organization.name, slug: organization.slug, defaultLocale: organization.defaultLocale, timezone: organization.timezone,
        membership: { role: membership.role.toLowerCase(), permissions: permissions.filter(permission => hasPermission(membership.role, membership.permissions, permission)) }, locations };
    }));
  }

  async get(userId: string, organizationId: string) {
    const membership = await this.authorization.requireOrganization(userId, organizationId, 'organization.read');
    return this.prisma.organization.findFirstOrThrow({ where: { id: organizationId, memberships: { some: { userId, status: 'ACTIVE' } } }, select: { id: true, name: true, slug: true, defaultLocale: true, timezone: true, locations: { where: { archivedAt: null, status: 'ACTIVE', ...(membership.allLocations ? {} : { id: { in: membership.locationScopes.map(scope => scope.locationId) } }) }, select: { id: true, name: true, slug: true, status: true } } } });
  }

  async createLocation(userId: string, organizationId: string, dto: CreateLocationDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      await this.lockOrganization(tx, organizationId);
      await this.authorization.requireOrganization(userId, organizationId, 'location.manage', tx);
      const location = await tx.location.create({ data: { organizationId, name: dto.name, slug: dto.slug, timezone: dto.timezone, currency: dto.currency, defaultLanguage: dto.defaultLanguage } });
      await tx.securityEvent.create({ data: { type: 'MEMBERSHIP_UPDATED', actorUserId: userId, organizationId, targetType: 'Location', targetId: location.id, outcome: 'SUCCESS', reason: 'location.created', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      return location;
    });
  }

  async getLocation(userId: string, organizationId: string, locationId: string) {
    const { location } = await this.authorization.requireLocation(userId, organizationId, locationId, 'location.read');
    return location;
  }

  async updateLocation(userId: string, organizationId: string, locationId: string, dto: CreateLocationDto | null, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      await this.lockOrganization(tx, organizationId);
      const member = await this.authorization.requireOrganization(userId, organizationId, 'location.manage', tx);
      const location = await tx.location.findFirst({ where: { id: locationId, organizationId, status: 'ACTIVE', archivedAt: null } });
      if (!location || (!member.allLocations && !member.locationScopes.some(scope => scope.locationId === locationId))) throw new NotFoundException('Location was not found.');
      if (dto && dto.currency !== location.currency && await tx.menu.count({ where: { locationId, archivedAt: null } })) throw new ConflictException('Archive the location’s menus before changing its currency.');
      const updated = await tx.location.update({ where: { id: locationId }, data: dto ?? { archivedAt: new Date(), status: 'ARCHIVED' } });
      await tx.securityEvent.create({ data: { type: 'MENU_UPDATED', actorUserId: userId, organizationId, targetType: 'Location', targetId: locationId, outcome: 'SUCCESS', reason: dto ? 'location.updated' : 'location.archived', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      return updated;
    });
  }

  async listMembers(userId: string, organizationId: string) {
    const actor = await this.authorization.requireOrganization(userId, organizationId, 'team.manage');
    const members = await this.prisma.organizationMember.findMany({ where: { organizationId }, select: {
      id: true, role: true, status: true, allLocations: true, permissions: true,
      locationScopes: { select: { locationId: true } }, user: { select: { displayName: true, email: true } },
    }, orderBy: { createdAt: 'asc' } });
    return members.filter(member => {
      if (actor.role === 'OWNER') return true;
      try { this.authorization.assertCanGrant(actor, member.role, member.permissions, member.allLocations, member.locationScopes.map(scope => scope.locationId)); return true; }
      catch { return false; }
    });
  }

  async invite(userId: string, organizationId: string, dto: InviteMemberDto, metadata: RequestMetadata) {
    if (dto.permissions.some(value => !permissions.includes(value as never))) throw new ForbiddenException('Invitation contains an unknown permission.');
    const email = dto.email.trim().toLowerCase();
    const rawToken = this.crypto.opaqueToken();
    await this.prisma.$transaction(async tx => {
      await this.lockOrganization(tx, organizationId);
      const actor = await this.authorization.requireOrganization(userId, organizationId, 'team.manage', tx);
      this.authorization.assertCanGrant(actor, dto.role, dto.permissions, dto.allLocations, dto.locationIds);
      const existing = await tx.organizationMember.findFirst({ where: { organizationId, user: { email } } });
      if (existing && existing.status !== 'REVOKED') throw new ConflictException('This person is already a member. Update their membership instead.');
      const locations = await tx.location.count({ where: { organizationId, id: { in: dto.locationIds }, status: 'ACTIVE', archivedAt: null } });
      if (locations !== new Set(dto.locationIds).size) throw new NotFoundException('One or more locations were not found.');
      await tx.actionToken.updateMany({ where: { organizationId, email, purpose: 'ORGANIZATION_INVITATION', consumedAt: null }, data: { consumedAt: new Date() } });
      await tx.actionToken.create({ data: { purpose: 'ORGANIZATION_INVITATION', tokenHash: this.crypto.tokenHash(rawToken), organizationId, email, role: dto.role, allLocations: dto.allLocations, locationIds: dto.locationIds, permissions: dto.permissions, expiresAt: new Date(Date.now() + INVITATION_MS) } });
      await tx.securityEvent.create({ data: { type: 'INVITATION_CREATED', actorUserId: userId, organizationId, targetType: 'Invitation', outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress, metadata: { role: dto.role } } });
    });
    await this.emailDelivery.sendInvitation(email, rawToken);
    return { invited: true, invitationToken: process.env.NODE_ENV === 'test' ? rawToken : undefined };
  }

  async acceptInvitation(userId: string, userEmail: string, dto: AcceptInvitationDto, metadata: RequestMetadata) {
    const token = await this.prisma.actionToken.findFirst({ where: { tokenHash: this.crypto.tokenHash(dto.token), purpose: 'ORGANIZATION_INVITATION', consumedAt: null, expiresAt: { gt: new Date() }, organizationId: { not: null } } });
    if (!token?.organizationId || !token.role || token.email !== userEmail.toLowerCase()) throw new NotFoundException('Invitation was not found.');
    const organizationId = token.organizationId;
    const role = token.role;
    return this.prisma.$transaction(async tx => {
      await this.lockOrganization(tx, organizationId);
      const organization = await tx.organization.findFirst({ where: { id: organizationId, status: 'ACTIVE', archivedAt: null } });
      if (!organization || !await consumeToken(tx, token.id)) throw new NotFoundException('Invitation was not found.');
      const existing = await tx.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId } } });
      // Invitations cannot silently demote owners, edit active members, or undo suspension.
      if (existing && existing.status !== 'REVOKED') throw new ConflictException('You already belong to this organization. Ask an owner to update your membership.');
      const locations = await tx.location.count({ where: { organizationId, id: { in: token.locationIds }, status: 'ACTIVE', archivedAt: null } });
      if (locations !== new Set(token.locationIds).size) throw new NotFoundException('An invited location is no longer available.');
      const data = { role, status: 'ACTIVE' as const, allLocations: token.allLocations ?? false, permissions: token.permissions, invitedEmail: token.email, acceptedAt: new Date(), revokedAt: null };
      const member = await tx.organizationMember.upsert({ where: { organizationId_userId: { organizationId, userId } }, update: data, create: { ...data, organizationId, userId, invitedAt: token.createdAt } });
      await tx.organizationMemberLocation.deleteMany({ where: { organizationMemberId: member.id } });
      if (!member.allLocations && token.locationIds.length) await tx.organizationMemberLocation.createMany({ data: token.locationIds.map(locationId => ({ organizationId, organizationMemberId: member.id, locationId })), skipDuplicates: true });
      await tx.securityEvent.create({ data: { type: 'INVITATION_ACCEPTED', actorUserId: userId, organizationId, targetType: 'OrganizationMember', targetId: member.id, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      return member;
    });
  }

  async updateMember(userId: string, organizationId: string, memberId: string, dto: UpdateMemberDto, metadata: RequestMetadata) {
    if (dto.permissions?.some(value => !permissions.includes(value as never))) throw new ForbiddenException('Membership contains an unknown permission.');
    return this.prisma.$transaction(async tx => {
      await this.lockOrganization(tx, organizationId);
      const actor = await this.authorization.requireOrganization(userId, organizationId, 'team.manage', tx);
      const target = await tx.organizationMember.findFirst({ where: { id: memberId, organizationId }, include: { locationScopes: true, user: { select: { email: true } } } });
      if (!target) throw new NotFoundException('Member was not found.');
      // A manager must be allowed to manage the existing role AND the requested role.
      this.authorization.assertCanGrant(actor, target.role, target.permissions, target.allLocations, target.locationScopes.map(scope => scope.locationId));
      this.authorization.assertCanGrant(actor, dto.role ?? target.role, dto.permissions ?? target.permissions, target.allLocations, target.locationScopes.map(scope => scope.locationId));
      const demotingOwner = target.role === 'OWNER' && target.status === 'ACTIVE' && ((dto.role && dto.role !== 'OWNER') || (dto.status && dto.status !== 'ACTIVE'));
      if (demotingOwner) {
        const activeOwners = await tx.organizationMember.count({ where: { organizationId, role: 'OWNER', status: 'ACTIVE' } });
        if (activeOwners <= 1) throw new ConflictException('The last active owner cannot be removed or demoted.');
      }
      const updated = await tx.organizationMember.update({ where: { id: memberId }, data: { role: dto.role, status: dto.status, permissions: dto.permissions, revokedAt: dto.status === 'REVOKED' ? new Date() : dto.status === 'ACTIVE' ? null : undefined } });
      await tx.actionToken.updateMany({ where: { organizationId, email: target.user.email, purpose: 'ORGANIZATION_INVITATION', consumedAt: null }, data: { consumedAt: new Date() } });
      await tx.securityEvent.create({ data: { type: 'MEMBERSHIP_UPDATED', actorUserId: userId, organizationId, targetType: 'OrganizationMember', targetId: memberId, outcome: 'SUCCESS', requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
      return updated;
    });
  }

  private async lockOrganization(tx: Prisma.TransactionClient, organizationId: string): Promise<void> {
    // All membership mutations serialize on the parent, so two owners cannot both remove the last owner.
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId}::uuid FOR UPDATE`;
  }
}
