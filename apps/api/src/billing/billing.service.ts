import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import type { BillingPlan, Prisma } from '../generated/prisma/client';
import { AuthorizationService } from '../authorization/authorization.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { RequestMetadata } from '../auth/request-metadata';
import { EntitlementsService } from './entitlements.service';
import { DAY, nextMonth, parseLimits, subscriptionStatus } from './billing-policy';
import { MyFatoorahSandboxService } from './myfatoorah-sandbox.service';
import type { CheckoutDto, OverrideDto, PlanDto } from './billing.dto';

const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export const planView = (plan: BillingPlan) => ({ id: plan.id, code: plan.code, version: plan.version, name: plan.name, nameAr: plan.nameAr, amount: plan.amount.toFixed(3), currency: plan.currency, active: plan.active, limits: parseLimits(plan.limits) });

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly authorization: AuthorizationService, private readonly entitlements: EntitlementsService, private readonly provider: MyFatoorahSandboxService) {}

  private enabled() {
    if (this.config.get('BILLING_MODE') !== 'sandbox' || this.config.get('NODE_ENV') === 'production') throw new ServiceUnavailableException('Sandbox billing is disabled.');
  }
  private assurance(user: AuthenticatedUser) {
    if (user.assuranceLevel !== 'AAL2') throw new ForbiddenException('Enable two-step verification and sign in with it before changing billing.');
  }
  private async lock(tx: Prisma.TransactionClient, id: string) { await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${id}::uuid FOR UPDATE`; }
  private async audit(tx: Prisma.TransactionClient, organizationId: string | null, userId: string | null, action: string, metadata: RequestMetadata, detail: unknown, reason?: string) {
    await tx.securityEvent.create({ data: { type: 'BILLING_UPDATED', organizationId, actorUserId: userId, outcome: 'SUCCESS', targetType: 'Billing', reason: reason ?? action, requestId: metadata.requestId, ipAddress: metadata.ipAddress, metadata: json({ action, detail }) } });
  }
  private async plan(tx: Prisma.TransactionClient, id: string) {
    const plan = await tx.billingPlan.findUnique({ where: { id } });
    if (!plan?.active) throw new NotFoundException('Sandbox plan is not available.');
    return plan;
  }
  async state(user: AuthenticatedUser, organizationId: string) {
    await this.authorization.requireOrganization(user.id, organizationId, 'billing.read');
    return this.prisma.$transaction(async tx => {
      const subscription = await tx.billingSubscription.findUnique({ where: { organizationId }, include: { plan: true } });
      const plans = await tx.billingPlan.findMany({ where: { active: true }, orderBy: [{ amount: 'asc' }, { version: 'desc' }] });
      const checkouts = await tx.billingCheckout.findMany({ where: { organizationId }, include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 30 });
      return { mode: this.config.get('BILLING_MODE') === 'sandbox' ? 'sandbox' : 'disabled', providerReady: this.provider.ready(), enrolled: Boolean(subscription),
        plans: plans.map(planView), subscription: subscription ? { plan: planView(subscription.plan), status: subscriptionStatus(subscription), periodEnd: subscription.periodEnd.toISOString(), graceEnd: subscription.graceEnd?.toISOString() ?? null, cancelAtEnd: subscription.cancelAtEnd } : null,
        limits: await this.entitlements.current(tx, organizationId), usage: await this.entitlements.usage(tx, organizationId),
        checkouts: checkouts.map(row => ({ id: row.id, plan: planView(row.plan), state: row.state, paymentUrl: row.paymentUrl, createdAt: row.createdAt.toISOString(), periodEnd: row.periodEnd?.toISOString() ?? null })) };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async enroll(user: AuthenticatedUser, organizationId: string, planId: string, metadata: RequestMetadata) {
    this.enabled(); this.assurance(user);
    await this.prisma.$transaction(async tx => {
      await this.lock(tx, organizationId); await this.authorization.requireOrganization(user.id, organizationId, 'billing.manage', tx);
      await this.plan(tx, planId);
      if (await tx.billingSubscription.findUnique({ where: { organizationId } })) throw new ConflictException('This workspace already used its sandbox trial.');
      const now = new Date();
      await tx.billingSubscription.create({ data: { organizationId, planId, status: 'TRIAL', periodStart: now, periodEnd: new Date(now.getTime() + 14 * DAY) } });
      await this.audit(tx, organizationId, user.id, 'trial.started', metadata, { planId });
    });
    return this.state(user, organizationId);
  }
  async cancel(user: AuthenticatedUser, organizationId: string, metadata: RequestMetadata) {
    this.enabled(); this.assurance(user);
    await this.prisma.$transaction(async tx => {
      await this.lock(tx, organizationId); await this.authorization.requireOrganization(user.id, organizationId, 'billing.manage', tx);
      const subscription = await tx.billingSubscription.findUnique({ where: { organizationId } });
      if (!subscription) throw new NotFoundException('No sandbox subscription exists.');
      if (await tx.billingCheckout.count({ where: { organizationId, state: { in: ['CREATING', 'UNKNOWN', 'READY'] } } })) throw new ConflictException('Resolve the pending checkout before canceling.');
      if (!subscription.cancelAtEnd) {
        await tx.billingSubscription.update({ where: { organizationId }, data: { cancelAtEnd: true, graceEnd: null } });
        await this.audit(tx, organizationId, user.id, 'subscription.canceled-at-end', metadata, { periodEnd: subscription.periodEnd });
      }
    });
    return this.state(user, organizationId);
  }
  async checkout(user: AuthenticatedUser, organizationId: string, dto: CheckoutDto, metadata: RequestMetadata) {
    this.enabled(); this.assurance(user);
    if (!this.provider.ready()) throw new ServiceUnavailableException('Configure the MyFatoorah test key before starting checkout.');
    const result = await this.prisma.$transaction(async tx => {
      await this.lock(tx, organizationId); await this.authorization.requireOrganization(user.id, organizationId, 'billing.manage', tx);
      const previous = await tx.billingCheckout.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey: dto.idempotencyKey } }, include: { plan: true } });
      if (previous) { if (previous.planId !== dto.planId) throw new ConflictException('Checkout key already belongs to another plan.'); return { row: previous, create: false }; }
      if (!await tx.billingSubscription.findUnique({ where: { organizationId } })) throw new ConflictException('Start the sandbox trial before checkout.');
      const plan = await this.plan(tx, dto.planId);
      if (await tx.billingCheckout.count({ where: { organizationId, state: { in: ['CREATING', 'UNKNOWN', 'READY'] } } })) throw new ConflictException('Check the existing payment before starting another checkout.');
      const row = await tx.billingCheckout.create({ data: { organizationId, planId: plan.id, idempotencyKey: dto.idempotencyKey, state: 'CREATING' }, include: { plan: true } });
      await this.audit(tx, organizationId, user.id, 'checkout.started', metadata, { checkoutId: row.id, planId: row.planId });
      return { row, create: true };
    });
    if (result.create) {
      try {
        const payment = await this.provider.create({ id: result.row.id, amount: result.row.plan.amount.toFixed(3) });
        await this.prisma.billingCheckout.updateMany({ where: { id: result.row.id, state: 'CREATING' }, data: { state: 'READY', providerInvoiceId: payment.invoiceId, paymentUrl: payment.paymentUrl } });
      } catch (error) {
        await this.prisma.billingCheckout.updateMany({ where: { id: result.row.id, state: 'CREATING' }, data: { state: 'UNKNOWN' } });
        throw error;
      }
    }
    return this.state(user, organizationId);
  }
  async reconcile(user: AuthenticatedUser, organizationId: string, checkoutId: string, metadata: RequestMetadata) {
    this.enabled();
    await this.authorization.requireOrganization(user.id, organizationId, 'billing.manage');
    await this.reconcileInvoice(organizationId, checkoutId, metadata);
    return this.state(user, organizationId);
  }
  async reconcileInvoice(organizationId: string, checkoutId: string, metadata: RequestMetadata = {}) {
    const checkout = await this.prisma.billingCheckout.findFirst({ where: { id: checkoutId, organizationId }, include: { plan: true } });
    if (!checkout) throw new NotFoundException('Checkout was not found.');
    if (checkout.state === 'PAID' || checkout.state === 'CANCELED') return;
    const observed = await this.provider.inspect({ id: checkout.id, providerInvoiceId: checkout.providerInvoiceId, amount: checkout.plan.amount.toFixed(3) });
    await this.prisma.$transaction(async tx => {
      await this.lock(tx, organizationId);
      const current = await tx.billingCheckout.findUniqueOrThrow({ where: { id: checkout.id } });
      if (current.state === 'PAID' || current.state === 'CANCELED') return;
      const subscription = await tx.billingSubscription.findUniqueOrThrow({ where: { organizationId } });
      const fingerprint = createHash('sha256').update(JSON.stringify(observed)).digest('hex');
      const saved = await tx.billingObservation.createMany({ data: [{ checkoutId, fingerprint, status: observed.status }], skipDuplicates: true });
      if (!saved.count) return;
      const now = new Date();
      if (observed.status === 'Paid') {
        // Same-plan early renewal extends the paid period; upgrades replace it. Trials never add paid time.
        const start = subscription.planId === checkout.planId && subscription.status !== 'TRIAL' && subscription.periodEnd > now ? subscription.periodEnd : now;
        const end = nextMonth(start);
        await tx.billingSubscription.update({ where: { organizationId }, data: { planId: checkout.planId, status: 'ACTIVE', periodStart: start, periodEnd: end, graceEnd: null, cancelAtEnd: false } });
        await tx.billingCheckout.update({ where: { id: checkoutId }, data: { state: 'PAID', providerInvoiceId: observed.invoiceId, paidAt: now, periodStart: start, periodEnd: end } });
      } else {
        await tx.billingCheckout.update({ where: { id: checkoutId }, data: { state: observed.status === 'Canceled' ? 'CANCELED' : 'READY', providerInvoiceId: observed.invoiceId } });
        if (observed.failedAttempt && subscription.status !== 'TRIAL' && !subscription.cancelAtEnd && subscription.planId === checkout.planId) {
          await tx.billingSubscription.update({ where: { organizationId }, data: { status: 'PAST_DUE', graceEnd: new Date(subscription.periodEnd.getTime() + 3 * DAY) } });
        }
      }
      const after = await tx.billingSubscription.findUniqueOrThrow({ where: { organizationId }, select: { planId: true, status: true, periodEnd: true, graceEnd: true, cancelAtEnd: true } });
      await this.audit(tx, organizationId, null, 'payment.reconciled', metadata, { checkoutId, status: observed.status, failedAttempt: observed.failedAttempt,
        before: { planId: subscription.planId, status: subscription.status, periodEnd: subscription.periodEnd, graceEnd: subscription.graceEnd, cancelAtEnd: subscription.cancelAtEnd }, after });
    });
  }
  async createPlan(user: AuthenticatedUser, dto: PlanDto, metadata: RequestMetadata) {
    this.enabled(); const limits = parseLimits(dto.limits);
    if (Number(dto.amount) <= 0 || !dto.reason.trim() || dto.reason.trim().length < 10) throw new BadRequestException('Positive price and meaningful reason are required.');
    return this.prisma.$transaction(async tx => {
      const plan = await tx.billingPlan.create({ data: { code: dto.code, version: dto.version, name: dto.name, nameAr: dto.nameAr, amount: dto.amount, limits: json(limits) } });
      await this.audit(tx, null, user.id, 'plan.created', metadata, planView(plan), dto.reason.trim()); return planView(plan);
    });
  }
  async planAvailability(user: AuthenticatedUser, id: string, active: boolean, reason: string, metadata: RequestMetadata) {
    this.enabled(); if (reason.trim().length < 10) throw new BadRequestException('A meaningful reason is required.');
    return this.prisma.$transaction(async tx => {
      const before = await tx.billingPlan.findUnique({ where: { id } }); if (!before) throw new NotFoundException('Plan was not found.');
      const plan = await tx.billingPlan.update({ where: { id }, data: { active } });
      await this.audit(tx, null, user.id, 'plan.availability', metadata, { planId: id, before: before.active, after: active }, reason.trim()); return planView(plan);
    });
  }
  async override(user: AuthenticatedUser, organizationId: string, dto: OverrideDto, metadata: RequestMetadata) {
    this.enabled(); const limits = parseLimits(dto.limits), now = new Date(), expiresAt = new Date(dto.expiresAt);
    if (expiresAt <= now || expiresAt.getTime() > now.getTime() + 366 * DAY || dto.reason.trim().length < 10) throw new BadRequestException('Override needs a meaningful reason and an expiry within one year.');
    await this.prisma.$transaction(async tx => {
      await this.lock(tx, organizationId);
      if (!await tx.organization.findUnique({ where: { id: organizationId } })) throw new NotFoundException('Organization was not found.');
      if (!await tx.billingSubscription.findUnique({ where: { organizationId } })) throw new ConflictException('Enroll the workspace in sandbox billing before granting an override.');
      const before = await this.entitlements.current(tx, organizationId, now);
      await tx.billingOverride.updateMany({ where: { organizationId, revokedAt: null }, data: { revokedAt: now } });
      await tx.billingOverride.create({ data: { organizationId, limits: json(limits), startsAt: now, expiresAt, actorUserId: user.id, reason: dto.reason.trim() } });
      await this.audit(tx, organizationId, user.id, 'entitlements.overridden', metadata, { before, after: limits, expiresAt }, dto.reason.trim());
    });
    return { updated: true };
  }
}
