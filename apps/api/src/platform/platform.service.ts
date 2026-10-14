import { supportReason } from './support-reason';
import { catalog, templateKeys } from '@daify/menu-engine';
import { planView } from '../billing/billing.service';
import { subscriptionStatus } from '../billing/billing-policy';
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

  private audit(tx: Prisma.TransactionClient, user: AuthenticatedUser, reason: string, metadata: RequestMetadata, targetType: string, targetId?: string, organizationId?: string, detail?: Prisma.InputJsonValue) {
    return tx.securityEvent.create({ data: { type: 'PLATFORM_ACCESS', actorUserId: user.id, outcome: 'SUCCESS', reason, requestId: metadata.requestId, ipAddress: metadata.ipAddress, targetType, targetId, organizationId, metadata: detail } });
  }

  async organizations(user: AuthenticatedUser, reason: string | undefined, metadata: RequestMetadata, query: DirectoryQuery) {
    const accessReason = supportReason(reason);
    return this.prisma.$transaction(async tx => {
      const rows = await tx.organization.findMany({ where: {
        ...(query.after ? { id: { gt: query.after } } : {}),
        ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { slug: { contains: query.search, mode: 'insensitive' } }] } : {}),
      }, select: organizationSelect, orderBy: { id: 'asc' }, take: query.limit });
      await this.audit(tx, user, accessReason, metadata, 'OrganizationDirectory');
      return rows;
    });
  }

  async users(user: AuthenticatedUser, reason: string | undefined, metadata: RequestMetadata, query: DirectoryQuery) {
    const accessReason = supportReason(reason);
    return this.prisma.$transaction(async tx => {
      const rows = await tx.user.findMany({ where: {
        ...(query.after ? { id: { gt: query.after } } : {}),
        ...(query.search ? { OR: [{ email: { contains: query.search, mode: 'insensitive' } }, { displayName: { contains: query.search, mode: 'insensitive' } }] } : {}),
      }, select: userSelect, orderBy: { id: 'asc' }, take: query.limit });
      await this.audit(tx, user, accessReason, metadata, 'UserDirectory');
      return rows;
    });
  }

  async events(user: AuthenticatedUser, reason: string | undefined, metadata: RequestMetadata, query: AuditQuery) {
    const accessReason = supportReason(reason);
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
      await this.audit(tx, user, accessReason, metadata, 'AuditDirectory');
      return rows;
    });
  }

  async plans(user: AuthenticatedUser, reason: string | undefined, metadata: RequestMetadata, query: DirectoryQuery) {
    const value = supportReason(reason);
    return this.prisma.$transaction(async tx => {
      const rows = await tx.billingPlan.findMany({ where: { ...(query.after ? { id: { gt: query.after } } : {}), ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { code: { contains: query.search, mode: 'insensitive' } }] } : {}) }, orderBy: { id: 'asc' }, take: query.limit });
      await this.audit(tx, user, value, metadata, 'PlanDirectory');
      return rows.map(planView);
    });
  }

  async subscriptions(user: AuthenticatedUser, reason: string | undefined, metadata: RequestMetadata, query: DirectoryQuery) {
    const value = supportReason(reason), now = new Date();
    return this.prisma.$transaction(async tx => {
      const rows = await tx.billingSubscription.findMany({ where: { ...(query.after ? { organizationId: { gt: query.after } } : {}), ...(query.search ? { organization: { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { slug: { contains: query.search, mode: 'insensitive' } }] } } : {}) }, include: { plan: true, organization: { select: { name: true, billingOverrides: { where: { revokedAt: null, startsAt: { lte: now }, expiresAt: { gt: now } }, orderBy: { createdAt: 'desc' }, take: 1, select: { limits: true, expiresAt: true } } } } }, orderBy: { organizationId: 'asc' }, take: query.limit });
      await this.audit(tx, user, value, metadata, 'SubscriptionDirectory');
      return rows.map(row => ({ id: row.organizationId, name: row.organization.name, plan: planView(row.plan), status: subscriptionStatus(row, now), periodEnd: row.periodEnd, cancelAtEnd: row.cancelAtEnd, override: row.organization.billingOverrides[0] ?? null }));
    });
  }

  async templates(user: AuthenticatedUser, reason: string | undefined, metadata: RequestMetadata) {
    const value = supportReason(reason);
    await this.audit(this.prisma, user, value, metadata, 'TemplateCatalog');
    return templateKeys.map(id => ({ id, name: catalog[id].name, category: catalog[id].category }));
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
      await this.audit(tx, user, supportReason(dto.reason), metadata, 'Organization', id, id, { action: 'organization.status', before: before.status, after: after.status });
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
      await this.audit(tx, user, supportReason(dto.reason), metadata, 'User', id, undefined, { action: 'user.status', before: before.status, after: after.status });
      return after;
    });
  }
}
