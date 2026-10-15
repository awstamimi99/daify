import { OffersService } from '../src/offers/offers.service';
import type { AuthenticatedUser } from '../src/auth/auth.types';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { MyFatoorahSandboxService } from '../src/billing/myfatoorah-sandbox.service';
import { CryptoService } from '../src/auth/crypto.service';
import { contractRequest } from './support/contract-request';
import { staffPresets, type StaffRole } from '../src/platform/staff-policy';

describe('Coupons, allowances and custom price approvals', () => {
  type Account = { id: string; email: string; cookie: string };
  let app: INestApplication, db: PrismaService, owner: Account, manager: Account, sales: Account, support: Account, planId: string;
  const users: string[] = [], organizations: string[] = [], reason = 'Negotiating a customer introductory offer';
  const expiry = () => new Date(Date.now() + 86400000).toISOString();
  async function account(admin = false, aal: 'AAL1' | 'AAL2' = 'AAL2') {
    const crypto = app.get(CryptoService), token = crypto.opaqueToken();
    const user = await db.user.create({ data: { email: `offer-${randomUUID()}@example.com`, passwordHash: 'unused', platformAdmin: admin, status: 'ACTIVE', emailVerifiedAt: new Date(), mfaSecret: 'v1.fixture' } }); users.push(user.id);
    await db.session.create({ data: { userId: user.id, tokenHash: crypto.tokenHash(token), assuranceLevel: aal, expiresAt: new Date(Date.now() + 86400000), absoluteExpiresAt: new Date(Date.now() + 86400000 * 2) } });
    return { id: user.id, email: user.email, cookie: `daify_session=${token}` };
  }
  async function employee(role: StaffRole) {
    const user = await account(); await db.platformStaff.create({ data: { userId: user.id, email: user.email, role, status: 'ACTIVE', permissions: [...staffPresets[role]], allOrganizations: true, organizationIds: [], invitedById: owner.id, invitationExpiresAt: new Date(Date.now() + 86400000) } }); return user;
  }
  async function customer() {
    const user = await account(); const row = await db.organization.create({ data: { name: 'Offer test restaurant', slug: randomUUID() } }); organizations.push(row.id);
    await db.organizationMember.create({ data: { organizationId: row.id, userId: user.id, role: 'OWNER', status: 'ACTIVE', allLocations: true, permissions: [] } }); return { org: row.id, user };
  }
  const api = (method: 'get' | 'post' | 'patch', path: string, actor = owner) => contractRequest(app.getHttpServer() as Server)[method](`/api/v1${path}`).set('Cookie', actor.cookie).set('Origin', 'http://localhost:3000').set('x-support-reason', reason);
  const coupon = (organizationId?: string, extra = {}) => ({ code: `OFF-${randomUUID().slice(0, 12)}`, percent: 25, months: 3, maxRedemptions: 1, ...(organizationId ? { organizationId } : {}), expiresAt: expiry(), reason, ...extra });
  const quote = (organizationId: string, extra = {}) => ({ organizationId, planId, amount: '7.500', months: 3, expiresAt: expiry(), reason, ...extra });
  beforeAll(async () => {
    app = await createApp(); await app.init(); app.get(ConfigService).set('BILLING_MODE', 'sandbox'); db = app.get(PrismaService); owner = await account(true); manager = await employee('MANAGER'); sales = await employee('SALES'); support = await employee('SUPPORT');
    planId = (await db.billingPlan.create({ data: { code: randomUUID(), version: 1, name: 'Offer base', nameAr: 'باقة العرض', amount: '10.000', currency: 'KWD', limits: { locations: 2, menus: 3, members: 4, templates: ['atelier'], publishing: true } } })).id;
  });
  beforeEach(async () => { await db.rateLimitBucket.deleteMany(); });
  afterAll(async () => {
    if (!db) return;
    await db.commercialAcceptance.deleteMany({ where: { organizationId: { in: organizations } } });
    await db.pricingQuote.deleteMany({ where: { createdById: { in: users } } }); await db.discountCoupon.deleteMany({ where: { createdById: { in: users } } });
    await db.securityEvent.deleteMany({ where: { actorUserId: { in: users } } });
    await db.platformStaff.deleteMany({ where: { userId: { in: users } } });
    await db.billingSubscription.deleteMany({ where: { organizationId: { in: organizations } } });
    await db.organizationMember.deleteMany({ where: { organizationId: { in: organizations } } }); await db.organization.deleteMany({ where: { id: { in: organizations } } });
    await db.billingPlan.delete({ where: { id: planId } }); await db.user.deleteMany({ where: { id: { in: users } } }); await app.close();
  });
  it('enforces Manager 50%/6 months and Owner free/12 months, independent of request tampering', async () => {
    const { org } = await customer();
    await api('post', '/platform/offers/coupons', manager).send(coupon(org, { percent: 50, months: 6 })).expect(201);
    await api('post', '/platform/offers/coupons', manager).send(coupon(org, { percent: 51 })).expect(403);
    await api('post', '/platform/offers/coupons', manager).send(coupon(org, { months: 7 })).expect(403);
    await api('post', '/platform/offers/coupons', manager).send(coupon(org, { percent: 100, months: 1 })).expect(403);
    await api('post', '/platform/offers/coupons').send(coupon(org, { percent: 100, months: 12 })).expect(201);
    await api('post', '/platform/offers/coupons').send(coupon(org, { percent: 100, months: 13 })).expect(400);
    await api('post', '/platform/offers/coupons', support).send(coupon(org)).expect(403);
    await api('get', '/platform/offers', manager).expect(200);
  });
  it('supports configurable Sales limits, keeps the free-month alternative and detects stale updates', async () => {
    const { org } = await customer(); const staff = await db.platformStaff.findUniqueOrThrow({ where: { userId: sales.id } });
    await api('post', '/platform/offers/coupons', sales).send(coupon(org, { percent: 100, months: 1 })).expect(201);
    await api('post', '/platform/offers/coupons', sales).send(coupon(org, { percent: 26 })).expect(403);
    const limits = { maxPercent: 40, maxMonths: 4, freeMonths: 1, expectedVersion: 0, reason };
    await api('patch', `/platform/offers/allowances/${staff.id}`, manager).send(limits).expect(200);
    await api('patch', `/platform/offers/allowances/${staff.id}`, manager).send(limits).expect(409);
    await api('post', '/platform/offers/coupons', sales).send(coupon(org, { percent: 40, months: 4 })).expect(201);
    await api('patch', `/platform/offers/allowances/${staff.id}`, manager).send({ ...limits, expectedVersion: 1, maxPercent: 51 }).expect(403);
    await api('patch', `/platform/offers/allowances/${staff.id}`, sales).send({ ...limits, expectedVersion: 1 }).expect(403);
    await api('post', '/platform/offers/coupons', sales).send(coupon(undefined)).expect(403);
    await api('post', '/platform/offers/coupons', sales).send(coupon(org, { maxRedemptions: 2 })).expect(400);
    await api('get', '/platform/offers', sales).expect(200);
  });
  it('always sends Sales custom pricing for approval and routes larger prices to Owner authority', async () => {
    const { org } = await customer();
    const response = await api('post', '/platform/offers/quotes', sales).send(quote(org)).expect(201); const row = response.body as { id: string; status: string; version: number };
    expect(row.status).toBe('PENDING');
    await api('post', `/platform/offers/quotes/${row.id}/decision`, sales).send({ decision: 'APPROVE', expectedVersion: 1, reason }).expect(403);
    await api('post', `/platform/offers/quotes/${row.id}/decision`, manager).send({ decision: 'APPROVE', expectedVersion: 1, reason }).expect(201);
    const large = await api('post', '/platform/offers/quotes', manager).send(quote(org, { amount: '0.000', months: 12 })).expect(201);
    expect((large.body as { status: string }).status).toBe('PENDING');
    const id = (large.body as { id: string }).id;
    await api('post', `/platform/offers/quotes/${id}/decision`, manager).send({ decision: 'APPROVE', expectedVersion: 1, reason }).expect(403);
    await api('post', `/platform/offers/quotes/${id}/decision`).send({ decision: 'APPROVE', expectedVersion: 1, reason }).expect(201);
    const direct = await api('post', '/platform/offers/quotes', manager).send(quote(org, { amount: '5.000', months: 6 })).expect(201);
    expect((direct.body as { status: string }).status).toBe('APPROVED');
  });
  it('clears approval on revision and rejects stale, expired, rejected and out-of-scope quotes', async () => {
    const { org, user } = await customer(); const other = await customer();
    const created = await api('post', '/platform/offers/quotes', sales).send(quote(org)).expect(201); const id = (created.body as { id: string }).id;
    await api('post', `/platform/offers/quotes/${id}/decision`, manager).send({ decision: 'APPROVE', expectedVersion: 1, reason }).expect(201);
    const revised = await api('patch', `/platform/offers/quotes/${id}`, sales).send({ ...quote(org, { amount: '6.000' }), expectedVersion: 2 }).expect(200);
    expect((revised.body as { status: string }).status).toBe('PENDING');
    await api('post', `/organizations/${org}/offers/quotes/${id}/accept`, user).send({ expectedVersion: 2, confirm: true }).expect(409);
    await api('post', `/platform/offers/quotes/${id}/decision`, manager).send({ decision: 'REJECT', expectedVersion: 3, reason }).expect(201);
    await api('post', `/organizations/${org}/offers/quotes/${id}/accept`, user).send({ expectedVersion: 4, confirm: true }).expect(409);
    await api('post', `/organizations/${other.org}/offers/quotes/${id}/accept`, other.user).send({ expectedVersion: 4, confirm: true }).expect(404);
    await db.pricingQuote.update({ where: { id }, data: { status: 'PENDING', expiresAt: new Date(0) } });
    await api('post', `/platform/offers/quotes/${id}/decision`, manager).send({ decision: 'APPROVE', expectedVersion: 4, reason }).expect(409);
  });
  it('accepts exact approved terms once, preserves plan limits, and cannot stack or mutate accepted quotes', async () => {
    const { org, user } = await customer();
    const result = await api('post', '/platform/offers/quotes').send(quote(org, { amount: '0.000', months: 12 })).expect(201); const id = (result.body as { id: string }).id;
    await api('post', `/organizations/${org}/offers/quotes/${id}/accept`, user).send({ expectedVersion: 1, confirm: false }).expect(400);
    const accepted = await api('post', `/organizations/${org}/offers/quotes/${id}/accept`, user).send({ expectedVersion: 1, confirm: true }).expect(201);
    const retry = await api('post', `/organizations/${org}/offers/quotes/${id}/accept`, user).send({ expectedVersion: 1, confirm: true }).expect(201);
    expect(retry.body).toEqual(accepted.body);
    const saved = await db.commercialAcceptance.findUniqueOrThrow({ where: { organizationId: org } });
    expect(saved.amount.toFixed(3)).toBe('0.000'); expect(saved.renewalAmount.toFixed(3)).toBe('10.000'); expect(saved.months).toBe(12);
    expect(saved.limits).toEqual({ locations: 2, menus: 3, members: 4, templates: ['atelier'], publishing: true });
    await api('patch', `/platform/offers/quotes/${id}`).send({ ...quote(org), expectedVersion: 2 }).expect(409);
    const next = await api('post', '/platform/offers/quotes').send(quote(org)).expect(201);
    await api('post', `/organizations/${org}/offers/quotes/${(next.body as { id: string }).id}/accept`, user).send({ expectedVersion: 1, confirm: true }).expect(409);
    await api('get', `/organizations/${org}/offers`, user).expect(200);
    expect(await db.billingSubscription.findUnique({ where: { organizationId: org } })).toBeNull();
    await db.billingSubscription.create({ data: { organizationId: org, planId, status: 'TRIAL', periodStart: new Date(), periodEnd: new Date(Date.now() + 86400000) } });
    const ready = jest.spyOn(app.get(MyFatoorahSandboxService), 'ready').mockReturnValue(true);
    try { await api('post', `/organizations/${org}/billing/checkout`, user).send({ planId, idempotencyKey: randomUUID() }).expect(409); } finally { ready.mockRestore(); }
    expect(await db.billingCheckout.count({ where: { organizationId: org } })).toBe(0);
  });
  it('requires current approval and issuer authority at acceptance, not just previously saved approval', async () => {
    const { org, user } = await customer(); const result = await api('post', '/platform/offers/quotes', manager).send(quote(org)).expect(201); const id = (result.body as { id: string }).id;
    await db.platformStaff.update({ where: { userId: manager.id }, data: { status: 'SUSPENDED' } });
    await api('post', `/organizations/${org}/offers/quotes/${id}/accept`, user).send({ expectedVersion: 1, confirm: true }).expect(403);
    await db.platformStaff.update({ where: { userId: manager.id }, data: { status: 'ACTIVE' } });
    await api('post', `/organizations/${org}/offers/quotes/${id}/accept`, user).send({ expectedVersion: 1, confirm: true }).expect(201);
  });
  it('serializes the last coupon redemption across customers and makes same-customer retries idempotent', async () => {
    const a = await customer(), b = await customer(); const created = await api('post', '/platform/offers/coupons').send(coupon()).expect(201); const c = created.body as { id: string; code: string };
    const reviewA = await api('post', `/organizations/${a.org}/offers/coupon-review`, a.user).send({ code: c.code, planId }).expect(201);
    const reviewB = await api('post', `/organizations/${b.org}/offers/coupon-review`, b.user).send({ code: c.code, planId }).expect(201);
    const requests = [a, b].map((customer, i) => api('post', `/organizations/${customer.org}/offers/coupon-accept`, customer.user).send({ code: c.code, planId, termsHash: ((i ? reviewB : reviewA).body as { termsHash: string }).termsHash, confirm: true }));
    const results = await Promise.all(requests); expect(results.map(r => r.status).sort()).toEqual([201, 404]);
    const winner = results[0]!.status === 201 ? a : b;
    await api('post', `/organizations/${winner.org}/offers/coupon-accept`, winner.user).send({ code: c.code, planId, termsHash: (reviewA.body as { termsHash: string }).termsHash, confirm: true }).expect(201);
    expect((await db.discountCoupon.findUniqueOrThrow({ where: { id: c.id } })).redeemedCount).toBe(1);
  });
  it('blocks revoked, expired, forged and wrong-customer coupons and checks current Sales allowance', async () => {
    const a = await customer(), b = await customer(); const created = await api('post', '/platform/offers/coupons', sales).send(coupon(a.org)).expect(201); const c = created.body as { id: string; code: string };
    const input = { code: c.code, planId };
    await api('post', `/organizations/${b.org}/offers/coupon-review`, b.user).send(input).expect(404);
    const reviewed = await api('post', `/organizations/${a.org}/offers/coupon-review`, a.user).send(input).expect(201);
    await api('post', `/organizations/${a.org}/offers/coupon-accept`, a.user).send({ ...input, termsHash: '0'.repeat(64), confirm: true }).expect(409);
    const staff = await db.platformStaff.findUniqueOrThrow({ where: { userId: sales.id } });
    await api('patch', `/platform/offers/allowances/${staff.id}`, manager).send({ maxPercent: 10, maxMonths: 1, freeMonths: 0, expectedVersion: 1, reason }).expect(200);
    await api('post', `/organizations/${a.org}/offers/coupon-accept`, a.user).send({ ...input, termsHash: (reviewed.body as { termsHash: string }).termsHash, confirm: true }).expect(409);
    await api('post', `/platform/offers/coupons/${c.id}/revoke`, manager).send({ reason }).expect(201);
    await api('post', `/organizations/${a.org}/offers/coupon-review`, a.user).send(input).expect(404);
    const expired = await api('post', '/platform/offers/coupons').send(coupon(a.org)).expect(201);
    await db.discountCoupon.update({ where: { id: (expired.body as { id: string }).id }, data: { expiresAt: new Date(0) } });
    await api('post', `/organizations/${a.org}/offers/coupon-review`, a.user).send({ code: (expired.body as { code: string }).code, planId }).expect(404);
    expect(await db.commercialAcceptance.count({ where: { organizationId: a.org } })).toBe(0);
  });
  it('keeps acceptance disabled in production and when sandbox billing is off', async () => {
    const { org, user } = await customer();
    const row = await api('post', '/platform/offers/quotes').send(quote(org)).expect(201);
    const id = (row.body as { id: string }).id, config = app.get(ConfigService);
    try {
      config.set('NODE_ENV', 'production');
      const actor: AuthenticatedUser = { id: user.id, email: user.email, displayName: null, platformAdmin: false, assuranceLevel: 'AAL2', sessionId: '' };
      const offers = app.get(OffersService), state = await offers.customerOffers(actor, org);
      expect(state.acceptanceEnabled).toBe(false);
      await expect(offers.acceptQuote(actor, org, id, { expectedVersion: 1, confirm: true }, {})).rejects.toThrow('Offer acceptance is available only in the billing sandbox.');
      config.set('NODE_ENV', 'test'); config.set('BILLING_MODE', 'disabled');
      await api('post', `/organizations/${org}/offers/quotes/${id}/accept`, user).send({ expectedVersion: 1, confirm: true }).expect(403);
    } finally { config.set('NODE_ENV', 'test'); config.set('BILLING_MODE', 'sandbox'); }
    expect(await db.commercialAcceptance.count({ where: { organizationId: org } })).toBe(0);
  });
  it('rejects cross-customer operations and revalidates employee suspension and MFA', async () => {
    const a = await customer(), b = await customer(), scoped = await employee('MANAGER');
    await db.platformStaff.update({ where: { userId: scoped.id }, data: { allOrganizations: false, organizationIds: [a.org] } });
    await api('post', '/platform/offers/quotes', scoped).send(quote(b.org)).expect(403);
    await api('post', '/platform/offers/coupons', scoped).send(coupon()).expect(403);
    const listed = await api('get', '/platform/offers', scoped).expect(200);
    expect((listed.body as { quotes: { organizationId: string }[] }).quotes.every(r => r.organizationId === a.org)).toBe(true);
    await api('get', `/organizations/${a.org}/offers`, b.user).expect(404);
    const weak = await account(false, 'AAL1');
    await db.organizationMember.create({ data: { organizationId: a.org, userId: weak.id, role: 'OWNER', status: 'ACTIVE', allLocations: true, permissions: [] } });
    const c = await api('post', '/platform/offers/coupons').send(coupon(a.org)).expect(201);
    await api('post', `/organizations/${a.org}/offers/coupon-accept`, weak).send({ code: (c.body as { code: string }).code, planId, termsHash: '0'.repeat(64), confirm: true }).expect(401);
    await db.platformStaff.update({ where: { userId: scoped.id }, data: { status: 'SUSPENDED' } });
    await api('post', '/platform/offers/coupons', scoped).send(coupon(a.org)).expect(403);
  });
});
