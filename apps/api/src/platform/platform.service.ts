import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { RequestMetadata } from '../auth/request-metadata';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import type { AuditQuery, DirectoryQuery, OrganizationStatusDto, UserStatusDto } from './platform.dto';

const organizationSelect = { id: true, name: true, slug: true, status: true } as const;
const userSelect = { id: true, email: true, displayName: true, status: true, platformAdmin: true, createdAt: true, lastLoginAt: true } as const;

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  private reason(reason: string | undefined) {
    let value = reason?.trim();
    if (value?.startsWith('uri:')) {
      try { value = decodeURIComponent(value.slice(4)).trim(); } catch { throw new BadRequestException('Invalid support reason encoding.'); }
    }
    if (!value || value.length < 10 || value.length > 500) throw new BadRequestException('A support reason of 10–500 characters is required.');
    return value;
  }

  private audit(tx: Prisma.TransactionClient, user: AuthenticatedUser, reason: string, metadata: RequestMetadata, targetType: string, targetId?: string, organizationId?: string, detail?: Prisma.InputJsonValue) {
    return tx.securityEvent.create({ data: { type: 'PLATFORM_ACCESS', actorUserId: user.id, outcome: 'SUCCESS', reason, requestId: metadata.requestId, ipAddress: metadata.ipAddress, targetType, targetId, organizationId, metadata: detail } });
  }

  async organizations(user: AuthenticatedUser, reason: string | undefined, metadata: RequestMetadata, query: DirectoryQuery) {
    const supportReason = this.reason(reason);
    return this.prisma.$transaction(async tx => {
      const rows = await tx.organization.findMany({ where: {
        ...(query.after ? { id: { gt: query.after } } : {}),
        ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { slug: { contains: query.search, mode: 'insensitive' } }] } : {}),
      }, select: organizationSelect, orderBy: { id: 'asc' }, take: query.limit });
      await this.audit(tx, user, supportReason, metadata, 'OrganizationDirectory');
      return rows;
    });
  }

  async users(user: AuthenticatedUser, reason: string | undefined, metadata: RequestMetadata, query: DirectoryQuery) {
    const supportReason = this.reason(reason);
    return this.prisma.$transaction(async tx => {
      const rows = await tx.user.findMany({ where: {
        ...(query.after ? { id: { gt: query.after } } : {}),
        ...(query.search ? { OR: [{ email: { contains: query.search, mode: 'insensitive' } }, { displayName: { contains: query.search, mode: 'insensitive' } }] } : {}),
      }, select: userSelect, orderBy: { id: 'asc' }, take: query.limit });
      await this.audit(tx, user, supportReason, metadata, 'UserDirectory');
      return rows;
    });
  }

  async events(user: AuthenticatedUser, reason: string | undefined, metadata: RequestMetadata, query: AuditQuery) {
    const supportReason = this.reason(reason);
    return this.prisma.$transaction(async tx => {
      // Stable chronological pagination: the anchor is resolved inside the
      // requested scope, so an unrelated event cannot be used as a cursor.
      const filter: Prisma.SecurityEventWhereInput = { organizationId: query.organizationId, actorUserId: query.actorUserId,
        ...(query.search ? { reason: { contains: query.search, mode: 'insensitive' } } : {}) };
      const anchor = query.after ? await tx.securityEvent.findFirst({ where: { ...filter, id: query.after }, select: { id: true, createdAt: true } }) : null;
      if (query.after && !anchor) throw new BadRequestException('Audit cursor was not found in this filter.');
      const rows = await tx.securityEvent.findMany({ where: { ...filter, ...(anchor ? { OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }] } : {}) },
        select: { id: true, type: true, actorUserId: true, organizationId: true, targetType: true, targetId: true, outcome: true, reason: true, requestId: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.limit });
      // Do not expose raw IPs or arbitrary historical metadata in the viewer.
      await this.audit(tx, user, supportReason, metadata, 'AuditDirectory');
      return rows;
    });
  }

  async organizationStatus(user: AuthenticatedUser, id: string, dto: OrganizationStatusDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.organization.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Organization was not found.');
      if (before.archivedAt || before.status === 'ARCHIVED') throw new ConflictException('Archived organizations cannot be restored here.');
      if (before.status !== dto.expectedStatus) throw new ConflictException('Organization changed. Refresh before retrying.');
      if (before.status === dto.status) return { id, status: before.status };
      const after = await tx.organization.update({ where: { id }, data: { status: dto.status }, select: { id: true, status: true } });
      await this.audit(tx, user, this.reason(dto.reason), metadata, 'Organization', id, id, { action: 'organization.status', before: before.status, after: after.status });
      return after;
    });
  }

  async userStatus(user: AuthenticatedUser, id: string, dto: UserStatusDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`;
      const before = await tx.user.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('User was not found.');
      if (id === user.id || before.platformAdmin) throw new ForbiddenException('Administrator accounts require the operator recovery process.');
      if (!before.emailVerifiedAt || before.status === 'PENDING') throw new ConflictException('Account verification must be completed by the user.');
      if (before.status !== dto.expectedStatus) throw new ConflictException('User changed. Refresh before retrying.');
      if (before.status === dto.status) return { id, status: before.status };
      const after = await tx.user.update({ where: { id }, data: { status: dto.status }, select: { id: true, status: true } });
      // Restoring an account never revives a previously issued session or MFA setup.
      await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.user.update({ where: { id }, data: { mfaPendingSecret: null, mfaPendingSessionId: null, mfaPendingExpiresAt: null } });
      await this.audit(tx, user, this.reason(dto.reason), metadata, 'User', id, undefined, { action: 'user.status', before: before.status, after: after.status });
      return after;
    });
  }
}
