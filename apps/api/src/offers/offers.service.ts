import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { Prisma, type PricingQuote } from '../generated/prisma/client';
import { AuthorizationService } from '../authorization/authorization.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { RequestMetadata } from '../auth/request-metadata';
import { assertStaffGrant, currentPlatformActor, customerFilter, requirePlatform } from '../platform/staff-policy';
import { supportReason } from '../platform/support-reason';
import type { DirectoryQuery } from '../platform/platform.dto';
import { defaultSalesAllowance, offerAuthority, withinAllowance } from './offers-policy';
import type { AllowanceDto, CouponAcceptDto, CouponDto, CouponReviewDto, OfferReasonDto, QuoteAcceptDto, QuoteDecisionDto, QuoteDto, QuoteUpdateDto } from './offers.dto';

const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const quoteView = (row: PricingQuote) => ({ ...row, amount: row.amount.toFixed(3), renewalAmount: row.renewalAmount.toFixed(3) });
@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService, private readonly config: ConfigService) {}

  private async identity(tx: Prisma.TransactionClient, user: AuthenticatedUser) {
    if (user.assuranceLevel !== 'AAL2' || !await tx.session.findFirst({ where: { id: user.sessionId, userId: user.id, revokedAt: null, assuranceLevel: 'AAL2', expiresAt: { gt: new Date() }, absoluteExpiresAt: { gt: new Date() } } })) throw new ForbiddenException('Sign in with two-step verification.');
    return currentPlatformActor(tx, user);
  }
  private async lock(tx: Prisma.TransactionClient, user: AuthenticatedUser) {
    // Same lock as employee grants: revocation and commercial authority cannot race.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(15102026, 1)`;
    return this.identity(tx, user);
  }
  private async customer(tx: Prisma.TransactionClient, actor: AuthenticatedUser, id: string) {
    requirePlatform(actor, 'offers.read', id);
    if (!await tx.organization.findFirst({ where: { id, status: 'ACTIVE', archivedAt: null } })) throw new NotFoundException('Customer was not found.');
  }
  private expiry(value: string) {
    const expiresAt = new Date(value);
    if (expiresAt <= new Date() || expiresAt.getTime() > Date.now() + 366 * 86400000) throw new BadRequestException('Redemption or acceptance deadline must be within the next year.');
    return expiresAt;
  }
  private audit(tx: Prisma.TransactionClient, user: AuthenticatedUser, metadata: RequestMetadata, action: string, reason: string, targetId: string, organizationId: string | null, detail: unknown = {}) {
    return tx.securityEvent.create({ data: { type: 'BILLING_UPDATED', actorUserId: user.id, organizationId, targetType: 'CommercialOffer', targetId, outcome: 'SUCCESS', reason: supportReason(reason), requestId: metadata.requestId, ipAddress: metadata.ipAddress, metadata: json({ action, detail }) } });
  }
  private async allowance(tx: Prisma.TransactionClient, actor: AuthenticatedUser) {
    if (actor.platformAdmin || actor.platformStaff?.role === 'MANAGER') return offerAuthority(actor);
    if (actor.platformStaff?.role !== 'SALES') throw new ForbiddenException('Commercial offers require Sales, Manager or Owner access.');
    const staff = await tx.platformStaff.findUniqueOrThrow({ where: { userId: actor.id } });
    return await tx.salesDiscountAllowance.findUnique({ where: { staffId: staff.id } }) ?? defaultSalesAllowance;
  }
  async directory(user: AuthenticatedUser, reason: string | undefined, query: DirectoryQuery, metadata: RequestMetadata) {
    const accessReason = supportReason(reason);
    return this.prisma.$transaction(async tx => {
      const actor = await this.identity(tx, user); requirePlatform(actor, 'offers.read');
      const filter = customerFilter(actor);
      const organization = filter ? { organizationId: filter } : {};
      const after = query.after ? { id: { gt: query.after } } : {};
      const coupons = await tx.discountCoupon.findMany({ where: { ...organization, ...after, ...(query.search ? { code: { contains: query.search, mode: 'insensitive' } } : {}) }, include: { creator: { select: { platformAdmin: true, platformStaff: { select: { role: true } } } } }, orderBy: { id: 'asc' }, take: query.limit });
      const quotes = await tx.pricingQuote.findMany({ where: { ...organization, ...after }, orderBy: { id: 'asc' }, take: query.limit });
      const acceptances = await tx.commercialAcceptance.findMany({ where: organization, orderBy: { acceptedAt: 'desc' }, take: 100 });
      const plans = await tx.billingPlan.findMany({ where: { active: true }, select: { id: true, name: true, nameAr: true, amount: true, currency: true, limits: true }, orderBy: { id: 'asc' }, take: 100 });
      const sales = await tx.platformStaff.findMany({ where: { role: 'SALES', status: { not: 'SUSPENDED' } }, include: { discountAllowance: true }, orderBy: { id: 'asc' }, take: 500 });
      const visibleSales = sales.filter(row => { try { assertStaffGrant(actor, row); return true; } catch { return false; } }).map(row => ({ id: row.id, email: row.email, allowance: row.discountAllowance ?? defaultSalesAllowance }));
      await this.audit(tx, actor, metadata, 'offers.list', accessReason, actor.id, null);
      return { coupons: coupons.map(({ creator, ...row }) => ({ ...row, canRevoke: actor.platformAdmin || row.createdById === actor.id || actor.platformStaff?.role === 'MANAGER' && !creator.platformAdmin && creator.platformStaff?.role === 'SALES' })), quotes: quotes.map(quoteView), acceptances: acceptances.map(row => ({ ...row, amount: row.amount.toFixed(3), renewalAmount: row.renewalAmount.toFixed(3), activation: 'PENDING' })), plans: plans.map(row => ({ ...row, amount: row.amount.toFixed(3) })), sales: visibleSales, allowance: await this.allowance(tx, actor), paymentActivation: false,
        couponCursor: coupons.length === query.limit ? coupons.at(-1)!.id : null, quoteCursor: quotes.length === query.limit ? quotes.at(-1)!.id : null };
    });
  }
  async setAllowance(user: AuthenticatedUser, staffId: string, dto: AllowanceDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const actor = await this.lock(tx, user); requirePlatform(actor, 'discounts.manage');
      const cap = offerAuthority(actor);
      const staff = await tx.platformStaff.findUnique({ where: { id: staffId } });
      if (!staff || staff.role !== 'SALES') throw new NotFoundException('Sales employee was not found.');
      assertStaffGrant(actor, staff);
      if (dto.maxPercent > cap.maxPercent || dto.maxMonths > cap.maxMonths || dto.freeMonths > (actor.platformAdmin ? cap.freeMonths : 1)) throw new ForbiddenException('Sales limits cannot exceed your own discount authority.');
      if ((dto.maxPercent === 0) !== (dto.maxMonths === 0)) throw new BadRequestException('Set both percentage and duration to zero to disable percentage offers.');
      const before = await tx.salesDiscountAllowance.findUnique({ where: { staffId } });
      if ((before?.version ?? 0) !== dto.expectedVersion) throw new ConflictException('Sales limits changed. Reload before saving.');
      const saved = await tx.salesDiscountAllowance.upsert({ where: { staffId }, create: { staffId, maxPercent: dto.maxPercent, maxMonths: dto.maxMonths, freeMonths: dto.freeMonths, updatedById: actor.id }, update: { maxPercent: dto.maxPercent, maxMonths: dto.maxMonths, freeMonths: dto.freeMonths, updatedById: actor.id, version: { increment: 1 } } });
      await this.audit(tx, actor, metadata, 'sales.allowance', dto.reason, staffId, null, { before: before ?? defaultSalesAllowance, after: saved }); return saved;
    });
  }
  async createCoupon(user: AuthenticatedUser, dto: CouponDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const actor = await this.lock(tx, user); requirePlatform(actor, 'offers.create');
      if (!withinAllowance(dto.percent, dto.months, await this.allowance(tx, actor))) throw new ForbiddenException('This coupon exceeds your percentage or duration limit.');
      if (dto.organizationId) await this.customer(tx, actor, dto.organizationId);
      else if (!actor.platformAdmin && (!actor.platformStaff?.allOrganizations || actor.platformStaff.role === 'SALES')) throw new ForbiddenException('Choose an assigned customer for this coupon.');
      if (actor.platformStaff?.role === 'SALES' && dto.maxRedemptions !== 1) throw new BadRequestException('Sales coupons are for one assigned customer and one redemption.');
      if (await tx.discountCoupon.findUnique({ where: { code: dto.code } })) throw new ConflictException('Coupon code already exists.');
      const row = await tx.discountCoupon.create({ data: { ...dto, organizationId: dto.organizationId ?? null, createdById: actor.id, expiresAt: this.expiry(dto.expiresAt) } });
      await this.audit(tx, actor, metadata, 'coupon.created', dto.reason, row.id, row.organizationId, row); return row;
    });
  }
  async revokeCoupon(user: AuthenticatedUser, id: string, dto: OfferReasonDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const actor = await this.lock(tx, user); requirePlatform(actor, 'offers.create');
      const row = await tx.discountCoupon.findUnique({ where: { id } }); if (!row) throw new NotFoundException('Coupon was not found.');
      if (row.organizationId) await this.customer(tx, actor, row.organizationId);
      else if (!actor.platformAdmin && !actor.platformStaff?.allOrganizations) throw new ForbiddenException('All-customer access is required.');
      if (!actor.platformAdmin && row.createdById !== actor.id) {
        offerAuthority(actor);
        const creator = await currentPlatformActor(tx, { ...actor, id: row.createdById });
        if (creator.platformAdmin || creator.platformStaff?.role !== 'SALES') throw new ForbiddenException('Only the Owner can revoke another Manager’s coupons.');
      }
      const saved = row.revokedAt ? row : await tx.discountCoupon.update({ where: { id }, data: { revokedAt: new Date() } });
      await this.audit(tx, actor, metadata, 'coupon.revoked', dto.reason, id, row.organizationId); return saved;
    });
  }
  private async quoteTerms(tx: Prisma.TransactionClient, actor: AuthenticatedUser, dto: QuoteDto) {
    requirePlatform(actor, 'offers.create'); await this.allowance(tx, actor); await this.customer(tx, actor, dto.organizationId);
    const plan = await tx.billingPlan.findUnique({ where: { id: dto.planId } });
    if (!plan?.active) throw new NotFoundException('Plan is not available.');
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.gt(plan.amount)) throw new BadRequestException('A discounted quote cannot exceed the plan price.');
    return { organizationId: dto.organizationId, planId: plan.id, amount, renewalAmount: plan.amount, currency: plan.currency, limits: plan.limits as Prisma.InputJsonValue, months: dto.months, reason: dto.reason, expiresAt: this.expiry(dto.expiresAt) };
  }
  private canApprove(actor: AuthenticatedUser, row: { amount: Prisma.Decimal; renewalAmount: Prisma.Decimal; months: number }) {
    requirePlatform(actor, 'offers.approve'); const cap = offerAuthority(actor);
    if (row.months > cap.maxMonths || row.amount.mul(100).lt(row.renewalAmount.mul(100 - cap.maxPercent))) throw new ForbiddenException('This price requires Owner approval.');
  }
  async createQuote(user: AuthenticatedUser, dto: QuoteDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const actor = await this.lock(tx, user); const terms = await this.quoteTerms(tx, actor, dto);
      let approved = false; try { this.canApprove(actor, terms); approved = true; } catch { /* Proposals outside authority wait for approval. */ }
      const row = await tx.pricingQuote.create({ data: { ...terms, createdById: actor.id, status: approved ? 'APPROVED' : 'PENDING', approvedById: approved ? actor.id : null, decidedAt: approved ? new Date() : null } });
      await this.audit(tx, actor, metadata, 'quote.created', dto.reason, row.id, row.organizationId, quoteView(row)); return quoteView(row);
    });
  }
  private async existingQuote(tx: Prisma.TransactionClient, actor: AuthenticatedUser, id: string, version: number) {
    const row = await tx.pricingQuote.findUnique({ where: { id } }); if (!row) throw new NotFoundException('Quote was not found.');
    await this.customer(tx, actor, row.organizationId);
    if (row.version !== version) throw new ConflictException('Quote changed. Reload before continuing.');
    if (row.status === 'ACCEPTED') throw new ConflictException('Accepted terms are immutable.'); return row;
  }
  async updateQuote(user: AuthenticatedUser, id: string, dto: QuoteUpdateDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const actor = await this.lock(tx, user); const before = await this.existingQuote(tx, actor, id, dto.expectedVersion);
      if (before.createdById !== actor.id && !actor.platformAdmin) throw new ForbiddenException('Only the author or Owner may revise a quote.');
      if (before.organizationId !== dto.organizationId) throw new BadRequestException('A quote cannot move to a different customer.');
      const terms = await this.quoteTerms(tx, actor, dto);
      // Every revision clears approval, including an Owner revision.
      const row = await tx.pricingQuote.update({ where: { id }, data: { ...terms, status: 'PENDING', approvedById: null, decidedAt: null, decisionReason: null, version: { increment: 1 } } });
      await this.audit(tx, actor, metadata, 'quote.revised', dto.reason, id, row.organizationId, { before: quoteView(before), after: quoteView(row) }); return quoteView(row);
    });
  }
  async decideQuote(user: AuthenticatedUser, id: string, dto: QuoteDecisionDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      const actor = await this.lock(tx, user); const before = await this.existingQuote(tx, actor, id, dto.expectedVersion);
      if (dto.decision === 'WITHDRAW') {
        requirePlatform(actor, 'offers.create'); if (before.createdById !== actor.id && !actor.platformAdmin) throw new ForbiddenException('Only the author or Owner may withdraw this quote.');
        if (before.status === 'WITHDRAWN') throw new ConflictException('Quote is already withdrawn.');
      } else {
        this.canApprove(actor, before);
        if (before.status !== 'PENDING' || before.expiresAt <= new Date()) throw new ConflictException('Only a pending, unexpired quote can be decided.');
        if (!await tx.billingPlan.findFirst({ where: { id: before.planId, active: true } })) throw new ConflictException('Plan is no longer available.');
      }
      const row = await tx.pricingQuote.update({ where: { id }, data: { status: dto.decision === 'APPROVE' ? 'APPROVED' : dto.decision === 'REJECT' ? 'REJECTED' : 'WITHDRAWN', approvedById: dto.decision === 'APPROVE' ? actor.id : null, decidedAt: new Date(), decisionReason: dto.reason, version: { increment: 1 } } });
      await this.audit(tx, actor, metadata, `quote.${dto.decision.toLowerCase()}`, dto.reason, id, row.organizationId, { version: row.version }); return quoteView(row);
    });
  }
  async customerOffers(user: AuthenticatedUser, organizationId: string) {
    await this.authorization.requireOrganization(user.id, organizationId, 'billing.read');
    const quotes = await this.prisma.pricingQuote.findMany({ where: { organizationId, status: 'APPROVED', expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: 100 });
    const accepted = await this.prisma.commercialAcceptance.findUnique({ where: { organizationId } });
    const plans = await this.prisma.billingPlan.findMany({ where: { active: true }, select: { id: true, name: true, nameAr: true, amount: true, currency: true }, take: 100, orderBy: { amount: 'asc' } });
    return { plans: plans.map(p => ({ ...p, amount: p.amount.toFixed(3) })), quotes: quotes.map(row => ({ id: row.id, planId: row.planId, amount: row.amount.toFixed(3), renewalAmount: row.renewalAmount.toFixed(3), currency: row.currency, months: row.months, limits: row.limits, expiresAt: row.expiresAt, version: row.version })), accepted: accepted ? { id: accepted.id, amount: accepted.amount.toFixed(3), renewalAmount: accepted.renewalAmount.toFixed(3), currency: accepted.currency, months: accepted.months, limits: accepted.limits, acceptedAt: accepted.acceptedAt, activation: 'PENDING' } : null, acceptanceEnabled: this.config.get('BILLING_MODE') === 'sandbox' && this.config.get('NODE_ENV') !== 'production', paymentActivation: false };
  }
  private async acceptance(tx: Prisma.TransactionClient, user: AuthenticatedUser, organizationId: string) {
    if (this.config.get('BILLING_MODE') !== 'sandbox' || this.config.get('NODE_ENV') === 'production') throw new ForbiddenException('Offer acceptance is available only in the billing sandbox.');
    await this.lock(tx, user);
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId}::uuid FOR UPDATE`;
    await this.authorization.requireOrganization(user.id, organizationId, 'billing.manage', tx);
    if (await tx.billingCheckout.count({ where: { organizationId, state: { in: ['CREATING', 'READY', 'UNKNOWN'] } } })) throw new ConflictException('Resolve the pending payment before accepting an offer.');
  }
  private async couponTerms(tx: Prisma.TransactionClient, user: AuthenticatedUser, organizationId: string, dto: CouponReviewDto) {
    const coupon = await tx.discountCoupon.findUnique({ where: { code: dto.code } });
    if (!coupon || coupon.revokedAt || coupon.expiresAt <= new Date() || coupon.redeemedCount >= coupon.maxRedemptions || coupon.organizationId && coupon.organizationId !== organizationId) throw new NotFoundException('Coupon is unavailable for this customer.');
    const creator = await currentPlatformActor(tx, { ...user, id: coupon.createdById, assuranceLevel: 'AAL2' });
    requirePlatform(creator, 'offers.create', organizationId);
    if (!withinAllowance(coupon.percent, coupon.months, await this.allowance(tx, creator))) throw new ConflictException('This coupon is no longer within its issuer’s allowance.');
    const plan = await tx.billingPlan.findUnique({ where: { id: dto.planId } }); if (!plan?.active) throw new NotFoundException('Plan is not available.');
    const amount = plan.amount.mul(100 - coupon.percent).div(100).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
    const terms = { couponId: coupon.id, planId: plan.id, amount: amount.toFixed(3), renewalAmount: plan.amount.toFixed(3), currency: plan.currency, months: coupon.months, limits: plan.limits };
    const termsHash = createHash('sha256').update(JSON.stringify(terms)).digest('hex'); return { coupon, terms, termsHash };
  }
  async reviewCoupon(user: AuthenticatedUser, organizationId: string, dto: CouponReviewDto) {
    await this.authorization.requireOrganization(user.id, organizationId, 'billing.read');
    return this.prisma.$transaction(async tx => { const { terms, termsHash } = await this.couponTerms(tx, user, organizationId, dto); return { ...terms, termsHash }; });
  }
  async acceptCoupon(user: AuthenticatedUser, organizationId: string, dto: CouponAcceptDto, metadata: RequestMetadata) {
    if (!dto.confirm) throw new BadRequestException('Review and confirm the offer terms.');
    return this.prisma.$transaction(async tx => {
      await this.acceptance(tx, user, organizationId);
      const previous = await tx.commercialAcceptance.findUnique({ where: { organizationId } });
      if (previous) {
        const coupon = await tx.discountCoupon.findUnique({ where: { code: dto.code } });
        if (previous.couponId === coupon?.id && previous.planId === dto.planId) return { id: previous.id, activation: 'PENDING' };
        throw new ConflictException('A customer can accept only one introductory offer; offers cannot be stacked or repeated.');
      }
      const { coupon, terms, termsHash } = await this.couponTerms(tx, user, organizationId, dto);
      if (termsHash !== dto.termsHash) throw new ConflictException('Offer terms changed. Review again.');
      const saved = await tx.commercialAcceptance.create({ data: { ...terms, limits: terms.limits as Prisma.InputJsonValue, organizationId, acceptedById: user.id } });
      await tx.discountCoupon.update({ where: { id: coupon.id }, data: { redeemedCount: { increment: 1 } } });
      await this.audit(tx, user, metadata, 'coupon.accepted', 'Customer accepted the reviewed sandbox coupon terms', saved.id, organizationId, terms);
      return { id: saved.id, activation: 'PENDING' };
    });
  }
  async acceptQuote(user: AuthenticatedUser, organizationId: string, id: string, dto: QuoteAcceptDto, metadata: RequestMetadata) {
    if (!dto.confirm) throw new BadRequestException('Review and confirm the offer terms.');
    return this.prisma.$transaction(async tx => {
      await this.acceptance(tx, user, organizationId);
      const previous = await tx.commercialAcceptance.findUnique({ where: { organizationId } });
      if (previous?.quoteId === id) return { id: previous.id, activation: 'PENDING' };
      if (previous) throw new ConflictException('A customer can accept only one introductory offer; offers cannot be stacked or repeated.');
      const row = await tx.pricingQuote.findFirst({ where: { id, organizationId } });
      if (!row) throw new NotFoundException('Quote was not found.');
      if (row.version !== dto.expectedVersion || row.status !== 'APPROVED' || row.expiresAt <= new Date()) throw new ConflictException('Quote changed or expired. Review it again.');
      if (!row.approvedById) throw new ConflictException('Quote approval is required.');
      const approver = await currentPlatformActor(tx, { ...user, id: row.approvedById });
      requirePlatform(approver, 'offers.approve', organizationId); this.canApprove(approver, row);
      const creator = await currentPlatformActor(tx, { ...user, id: row.createdById }); requirePlatform(creator, 'offers.create', organizationId);
      if (!await tx.billingPlan.findFirst({ where: { id: row.planId, active: true } })) throw new ConflictException('Plan is no longer available.');
      const saved = await tx.commercialAcceptance.create({ data: { organizationId, quoteId: id, planId: row.planId, amount: row.amount, renewalAmount: row.renewalAmount, currency: row.currency, months: row.months, limits: row.limits as Prisma.InputJsonValue, acceptedById: user.id } });
      await tx.pricingQuote.update({ where: { id }, data: { status: 'ACCEPTED', version: { increment: 1 } } });
      await this.audit(tx, user, metadata, 'quote.accepted', 'Customer accepted the reviewed sandbox custom pricing', saved.id, organizationId, { quoteId: id, version: row.version });
      return { id: saved.id, activation: 'PENDING' };
    });
  }
}
