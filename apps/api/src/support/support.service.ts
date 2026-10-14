import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { RequestMetadata } from '../auth/request-metadata';
import type { Prisma } from '../generated/prisma/client';
import { supportReason } from '../platform/support-reason';
import type { DirectoryQuery } from '../platform/platform.dto';
import type { SupportCreateDto, SupportQuery, SupportReplyDto, SupportStatusDto } from './support.dto';

type Access = { organizationId: string } | { reason: string | undefined };
const ticketSelect = { id: true, organizationId: true, subject: true, status: true, createdAt: true, updatedAt: true } as const;
const messageSelect = { id: true, body: true, fromPlatform: true, createdAt: true } as const;
@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}
  private async access(tx: Prisma.TransactionClient, user: AuthenticatedUser, access: Access) {
    if ('organizationId' in access) { await this.authorization.requireOrganization(user.id, access.organizationId, 'support.manage', tx); return undefined; }
    return supportReason(access.reason);
  }
  private audit(tx: Prisma.TransactionClient, user: AuthenticatedUser, metadata: RequestMetadata, action: string, reason?: string, ticket?: { id: string; organizationId: string }, detail?: Prisma.InputJsonValue) {
    return tx.securityEvent.create({ data: { type: reason ? 'PLATFORM_ACCESS' : 'SUPPORT_UPDATED', actorUserId: user.id, organizationId: ticket?.organizationId, targetType: 'SupportTicket', targetId: ticket?.id, reason: reason ?? action, requestId: metadata.requestId, ipAddress: metadata.ipAddress, outcome: 'SUCCESS', metadata: { action, ...(detail ? { detail } : {}) } } });
  }
  async list(user: AuthenticatedUser, access: Access, query: SupportQuery, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const reason = await this.access(tx, user, access);
      const rows = await tx.supportTicket.findMany({ where: { organizationId: 'organizationId' in access ? access.organizationId : query.organizationId, status: query.status, ...(query.after ? { id: { gt: query.after } } : {}), ...(query.search ? { subject: { contains: query.search, mode: 'insensitive' } } : {}) }, select: ticketSelect, orderBy: { id: 'asc' }, take: query.limit });
      if (reason) await this.audit(tx, user, metadata, 'support.list', reason);
      return rows;
    });
  }
  async create(user: AuthenticatedUser, organizationId: string, dto: SupportCreateDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      await this.access(tx, user, { organizationId });
      const ticket = await tx.supportTicket.create({ data: { organizationId, createdById: user.id, subject: dto.subject, messages: { create: { authorId: user.id, fromPlatform: false, body: dto.body } } }, select: ticketSelect });
      await this.audit(tx, user, metadata, 'support.created', undefined, ticket);
      return ticket;
    });
  }
  private async ticket(tx: Prisma.TransactionClient, id: string, access: Access, lock = false) {
    if (lock) await tx.$queryRaw`SELECT id FROM support_tickets WHERE id = ${id}::uuid FOR UPDATE`;
    const ticket = await tx.supportTicket.findFirst({ where: { id, ...('organizationId' in access ? { organizationId: access.organizationId } : {}) } });
    if (!ticket) throw new NotFoundException('Support ticket was not found.');
    return ticket;
  }
  async thread(user: AuthenticatedUser, access: Access, id: string, query: DirectoryQuery, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const reason = await this.access(tx, user, access), ticket = await this.ticket(tx, id, access);
      const anchor = query.after ? await tx.supportMessage.findFirst({ where: { id: query.after, ticketId: id }, select: { id: true, createdAt: true } }) : null;
      if (query.after && !anchor) throw new BadRequestException('Message cursor was not found in this ticket.');
      const messages = await tx.supportMessage.findMany({ where: { ticketId: id, ...(anchor ? { OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }] } : {}) }, select: messageSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.limit });
      if (reason) await this.audit(tx, user, metadata, 'support.read', reason, ticket);
      return { ticket: { id: ticket.id, organizationId: ticket.organizationId, subject: ticket.subject, status: ticket.status, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt }, messages };
    });
  }
  async reply(user: AuthenticatedUser, access: Access, id: string, dto: SupportReplyDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const reason = await this.access(tx, user, access), ticket = await this.ticket(tx, id, access, true);
      if (ticket.status !== 'OPEN') throw new ConflictException('Reopen this ticket before replying.');
      const message = await tx.supportMessage.create({ data: { ticketId: id, authorId: user.id, fromPlatform: Boolean(reason), body: dto.body }, select: messageSelect });
      await tx.supportTicket.update({ where: { id }, data: { updatedAt: new Date() } });
      if (reason && ticket.createdById !== user.id) await tx.inboxNotification.create({ data: { userId: ticket.createdById, ticketId: id, kind: 'SUPPORT_REPLY' } });
      await this.audit(tx, user, metadata, 'support.replied', reason, ticket, { messageId: message.id });
      return message;
    });
  }
  async status(user: AuthenticatedUser, access: Access, id: string, dto: SupportStatusDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const reason = await this.access(tx, user, access), ticket = await this.ticket(tx, id, access, true);
      if (ticket.status !== dto.expectedStatus) throw new ConflictException('Ticket changed. Refresh before retrying.');
      if (ticket.status === dto.status) return { id, status: ticket.status };
      await tx.supportTicket.update({ where: { id }, data: { status: dto.status } });
      if (reason && ticket.createdById !== user.id) await tx.inboxNotification.create({ data: { userId: ticket.createdById, ticketId: id, kind: 'SUPPORT_STATUS' } });
      await this.audit(tx, user, metadata, 'support.status', reason, ticket, { before: ticket.status, after: dto.status });
      return { id, status: dto.status };
    });
  }
  async notifications(user: AuthenticatedUser, organizationId: string, query: DirectoryQuery) {
    await this.authorization.requireOrganization(user.id, organizationId, 'support.manage');
    return this.prisma.inboxNotification.findMany({ where: { userId: user.id, ticket: { organizationId }, readAt: null, ...(query.after ? { id: { gt: query.after } } : {}) }, select: { id: true, ticketId: true, kind: true, createdAt: true, ticket: { select: { subject: true } } }, orderBy: { id: 'asc' }, take: query.limit });
  }
  async markRead(user: AuthenticatedUser, organizationId: string, id: string) {
    return this.prisma.$transaction(async tx => {
      await this.authorization.requireOrganization(user.id, organizationId, 'support.manage', tx);
      const notification = await tx.inboxNotification.findFirst({ where: { id, userId: user.id, ticket: { organizationId } } });
      if (!notification) throw new NotFoundException('Notification was not found.');
      if (!notification.readAt) await tx.inboxNotification.update({ where: { id }, data: { readAt: new Date() } });
      return { read: true };
    });
  }
}
