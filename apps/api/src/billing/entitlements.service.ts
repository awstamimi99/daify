import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '../generated/prisma/client';
import { deniedLimits, parseLimits, subscriptionStatus } from './billing-policy';

@Injectable()
export class EntitlementsService {
  constructor(private readonly config: ConfigService) {}
  async current(tx: Prisma.TransactionClient, organizationId: string, now = new Date()) {
    const subscription = await tx.billingSubscription.findUnique({ where: { organizationId }, include: { plan: true } });
    // Workspaces are enrolled explicitly; a migration must not silently remove M5 access.
    if (!subscription) return null;
    // Sandbox payment facts must never grant access in a live environment.
    if (this.config.get('NODE_ENV') === 'production' || this.config.get('BILLING_MODE') !== 'sandbox') return { ...deniedLimits };
    const override = await tx.billingOverride.findFirst({ where: { organizationId, revokedAt: null, startsAt: { lte: now }, expiresAt: { gt: now } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    if (override) return parseLimits(override.limits);
    return ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(subscriptionStatus(subscription, now)) ? parseLimits(subscription.plan.limits) : { ...deniedLimits };
  }

  async usage(tx: Prisma.TransactionClient, organizationId: string) {
    const locations = await tx.location.count({ where: { organizationId, archivedAt: null } });
    const menus = await tx.menu.count({ where: { location: { organizationId }, archivedAt: null } });
    const members = await tx.organizationMember.count({ where: { organizationId, status: 'ACTIVE' } });
    return { locations, menus, members };
  }

  // Caller must hold the organization lock in the same transaction as mutation.
  async capacity(tx: Prisma.TransactionClient, organizationId: string, resource: 'locations' | 'menus' | 'members') {
    const limits = await this.current(tx, organizationId);
    if (limits && (await this.usage(tx, organizationId))[resource] >= limits[resource]) throw new ForbiddenException(`Your sandbox plan has reached its ${resource} limit. Review Billing to continue.`);
  }

  async template(tx: Prisma.TransactionClient, organizationId: string, key: string) {
    const limits = await this.current(tx, organizationId);
    if (limits && !limits.templates.includes(key)) throw new ForbiddenException('This template is not available on your sandbox plan.');
  }

  async publish(tx: Prisma.TransactionClient, organizationId: string) {
    const limits = await this.current(tx, organizationId);
    if (limits && !limits.publishing) throw new ForbiddenException('Your sandbox subscription does not currently allow publishing.');
  }
}
