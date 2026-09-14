import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { defaultDesign, templateKeys } from '@daify/menu-engine';
import type { BillingState } from '../../../packages/types/src/billing';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { CryptoService } from '../src/auth/crypto.service';
import { EntitlementsService } from '../src/billing/entitlements.service';
import { MyFatoorahSandboxService } from '../src/billing/myfatoorah-sandbox.service';
import { DAY } from '../src/billing/billing-policy';
import { contractRequest } from './support/contract-request';

describe('M6 persisted sandbox billing', () => {
  let app: INestApplication, prisma: PrismaService, config: ConfigService, org: string, owner: string, weak: string, admin: string, outsider: string, planId: string;
  let create: jest.SpyInstance, inspect: jest.SpyInstance;
  const orgs: string[] = [], users: string[] = [], plans: string[] = [];
  const api = (method: 'get' | 'post' | 'patch', path: string, cookie = owner) => contractRequest(app.getHttpServer() as Server)[method](path).set('Origin', 'http://localhost:3000').set('Cookie', cookie);
  const root = () => `/api/v1/organizations/${org}/billing`;
  const state = (body: unknown) => body as BillingState;
  const loc = () => `/api/v1/organizations/${org}/locations`;
  const locationData = () => ({ name: 'Branch', slug: randomUUID(), currency: 'KWD', timezone: 'Asia/Kuwait', defaultLanguage: 'en' });
  const limits = { locations: 1, menus: 1, members: 2, templates: ['atelier'], publishing: true };
  async function session(platformAdmin = false, assuranceLevel: 'AAL1' | 'AAL2' = 'AAL2', member = false) {
    const crypto = app.get(CryptoService), token = crypto.opaqueToken();
    const user = await prisma.user.create({ data: { email: `m6-${randomUUID()}@example.com`, passwordHash: 'unused', status: 'ACTIVE', emailVerifiedAt: new Date(), platformAdmin } }); users.push(user.id);
    if (member) await prisma.organizationMember.create({ data: { organizationId: org, userId: user.id, role: 'OWNER', status: 'ACTIVE', allLocations: true, permissions: [] } });
    await prisma.session.create({ data: { userId: user.id, tokenHash: crypto.tokenHash(token), assuranceLevel, expiresAt: new Date(Date.now() + DAY), absoluteExpiresAt: new Date(Date.now() + DAY) } });
    return `daify_session=${token}`;
  }
  async function enroll() { return state((await api('post', `${root()}/trial`).send({ planId }).expect(201)).body); }
  async function checkout() {
    const result = state((await api('post', `${root()}/checkout`).send({ planId, idempotencyKey: randomUUID() }).expect(201)).body);
    return result.checkouts[0]!;
  }
  beforeAll(async () => {
    app = await createApp(); await app.init(); prisma = app.get(PrismaService); config = app.get(ConfigService);
  });
  beforeEach(async () => {
    config.set('BILLING_MODE', 'sandbox'); config.set('MYFATOORAH_TEST_API_KEY', 'mocked-test-key');
    await prisma.rateLimitBucket.deleteMany();
    org = (await prisma.organization.create({ data: { name: 'Billing Test', slug: randomUUID() } })).id; orgs.push(org);
    owner = await session(false, 'AAL2', true); weak = await session(false, 'AAL1'); admin = await session(true); outsider = await session();
    const plan = await prisma.billingPlan.create({ data: { code: randomUUID(), version: 1, name: 'Test plan', nameAr: 'باقة تجريبية', amount: '3.000', limits } }); planId = plan.id; plans.push(planId);
    const provider = app.get(MyFatoorahSandboxService);
    create = jest.spyOn(provider, 'create').mockImplementation(() => Promise.resolve({ invoiceId: String(Math.floor(Math.random() * 1e12)), paymentUrl: 'https://demo.myfatoorah.com/test-payment' }));
    inspect = jest.spyOn(provider, 'inspect').mockImplementation((value: { providerInvoiceId: string | null }) => Promise.resolve({ invoiceId: value.providerInvoiceId ?? '123', status: 'Paid' as const, failedAttempt: false }));
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await prisma.billingCheckout.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.billingOverride.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.billingSubscription.deleteMany({ where: { organizationId: { in: orgs } } });
    const menuWhere = { location: { organizationId: { in: orgs } } };
    await prisma.menu.updateMany({ where: menuWhere, data: { currentVersionId: null } });
    await prisma.menuVersion.deleteMany({ where: { menu: menuWhere } }); await prisma.menuRoute.deleteMany({ where: { menu: menuWhere } });
    await prisma.theme.deleteMany({ where: { menu: menuWhere } }); await prisma.menuItem.deleteMany({ where: { section: { menu: menuWhere } } }); await prisma.menuSection.deleteMany({ where: { menu: menuWhere } }); await prisma.menu.deleteMany({ where: menuWhere });
    await prisma.actionToken.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: orgs } } }); await prisma.location.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.securityEvent.deleteMany({ where: { OR: [{ organizationId: { in: orgs } }, { actorUserId: { in: users } }] } });
    await prisma.organization.deleteMany({ where: { id: { in: orgs } } }); await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.billingPlan.deleteMany({ where: { id: { in: plans } } }); await app.close();
  });
  it('requires membership and AAL2, starts only one trial and retains legacy access until enrollment', async () => {
    expect(state((await api('get', root()).expect(200)).body).limits).toBeNull();
    await api('get', root(), outsider).expect(404); await api('get', root(), '').expect(401);
    await api('post', `${root()}/trial`, weak).send({ planId }).expect(403);
    const responses = await Promise.all([api('post', `${root()}/trial`).send({ planId }), api('post', `${root()}/trial`).send({ planId })]);
    expect(responses.map(result => result.status).sort()).toEqual([201, 409]);
    expect(state((await api('get', root()).expect(200)).body).limits).toEqual(limits);
    expect(await prisma.securityEvent.count({ where: { organizationId: org, type: 'BILLING_UPDATED' } })).toBe(1);
  });
  it('serializes the last location and menu slot at the HTTP boundary', async () => {
    await enroll();
    const rows = await Promise.all([api('post', loc()).send(locationData()), api('post', loc()).send(locationData())]);
    expect(rows.map(row => row.status).sort()).toEqual([201, 403]);
    const location = (await prisma.location.findFirstOrThrow({ where: { organizationId: org } })).id;
    const path = `${loc()}/${location}/menus`, body = { name: 'Dinner', defaultLanguage: 'en', supportedLanguages: ['en'], translations: [{ languageTag: 'en', name: 'Dinner', description: '' }] };
    const menus = await Promise.all([api('post', path).send({ ...body, slug: 'one' }), api('post', path).send({ ...body, slug: 'two' })]);
    expect(menus.map(row => row.status).sort()).toEqual([201, 403]);
  });
  it('checks invitation acceptance and reactivation against active seats', async () => {
    await enroll();
    const crypto = app.get(CryptoService);
    const invited: { cookie: string; token: string; userId: string }[] = [];
    for (let i = 0; i < 2; i++) {
      const cookie = await session(), userId = users[users.length - 1]!, user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const raw = crypto.opaqueToken(); await prisma.actionToken.create({ data: { purpose: 'ORGANIZATION_INVITATION', tokenHash: crypto.tokenHash(raw), organizationId: org, email: user.email, role: 'STAFF', allLocations: true, locationIds: [], permissions: [], expiresAt: new Date(Date.now() + DAY) } });
      invited.push({ cookie, token: raw, userId });
    }
    const responses = await Promise.all(invited.map(value => api('post', '/api/v1/organizations/invitations/accept', value.cookie).send({ token: value.token })));
    expect(responses.map(row => row.status).sort()).toEqual([201, 403]);
    const suspended = await prisma.organizationMember.create({ data: { organizationId: org, userId: users[users.length - 3]!, role: 'STAFF', status: 'SUSPENDED', allLocations: true, permissions: [] } });
    await api('patch', `/api/v1/organizations/${org}/members/${suspended.id}`).send({ status: 'ACTIVE' }).expect(403);
  });
  it('requires an allowed template on design, publication and historical rollback', async () => {
    // Build a complete menu before enrolling to exercise M5 migration behavior.
    const location = await prisma.location.create({ data: { ...locationData(), organizationId: org } });
    const menu = await prisma.menu.create({ data: { locationId: location.id, name: 'Menu', slug: 'menu', defaultLanguage: 'en', supportedLanguages: ['en'], translations: { create: { languageTag: 'en', name: 'Menu' } }, sections: { create: { stableKey: 'main', position: 0, translations: { create: { languageTag: 'en', name: 'Main' } }, items: { create: { stableKey: 'soup', position: 0, price: '1.000', currency: 'KWD', translations: { create: { languageTag: 'en', name: 'Soup' } } } } } } } });
    const base = `${loc()}/${location.id}/menus/${menu.id}`;
    await api('patch', `${base}/design`).send({ revision: 1, design: defaultDesign('feast') }).expect(200);
    const first = await api('post', `${base}/publish`).send({ revision: 2, slug: randomUUID(), visibility: 'PUBLIC', idempotencyKey: randomUUID() }).expect(201);
    const published = first.body as { currentVersionId: string; revision: number; publicSlug: string };
    await enroll();
    await api('patch', `${base}/design`).send({ revision: published.revision, design: defaultDesign('feast') }).expect(403);
    await api('post', `${base}/publish`).send({ revision: published.revision, slug: published.publicSlug, visibility: 'PUBLIC', idempotencyKey: randomUUID() }).expect(403);
    await api('post', `${base}/rollback`).send({ revision: published.revision, versionId: published.currentVersionId, idempotencyKey: randomUUID() }).expect(403);
    await prisma.billingSubscription.update({ where: { organizationId: org }, data: { periodStart: new Date(Date.now() - 15 * DAY), periodEnd: new Date(Date.now() - DAY) } });
    await api('get', `/api/v1/public/menus/${published.publicSlug}`, '').expect(200);
    await api('post', `${base}/unpublish`).send({ revision: published.revision, idempotencyKey: randomUUID() }).expect(201);
    expect(await prisma.menuVersion.count({ where: { menuId: menu.id } })).toBe(1);
  });
  it('creates one checkout for duplicate concurrent requests and never grants access on a redirect', async () => {
    await enroll();
    const dto = { planId, idempotencyKey: randomUUID() };
    const responses = await Promise.all([api('post', `${root()}/checkout`).send(dto), api('post', `${root()}/checkout`).send(dto)]);
    expect(responses.map(row => row.status)).toEqual([201, 201]); expect(create).toHaveBeenCalledTimes(1);
    expect(state(responses[0].body).subscription?.status).toBe('TRIAL');
    await api('post', `${root()}/checkout`).send({ ...dto, planId: randomUUID() }).expect(409);
    await api('post', `${root()}/checkout`).send({ ...dto, idempotencyKey: randomUUID() }).expect(409);
    const payment = state(responses[0].body).checkouts[0]!;
    await api('post', `${root()}/checkouts/${payment.id}/reconcile`, outsider).send({}).expect(404);
    expect(inspect).not.toHaveBeenCalled();
  });
  it('reconciles duplicate payment observations once and preserves cancellation content', async () => {
    await enroll(); const payment = await checkout();
    await Promise.all([api('post', `${root()}/checkouts/${payment.id}/reconcile`).send({}).expect(201), api('post', `${root()}/checkouts/${payment.id}/reconcile`).send({}).expect(201)]);
    const before = await prisma.billingSubscription.findUniqueOrThrow({ where: { organizationId: org } });
    expect(before.status).toBe('ACTIVE'); expect(await prisma.billingObservation.count({ where: { checkoutId: payment.id } })).toBe(1);
    inspect.mockResolvedValue({ invoiceId: 'ignored', status: 'Pending', failedAttempt: true });
    await api('post', `${root()}/checkouts/${payment.id}/reconcile`).send({}).expect(201);
    expect((await prisma.billingSubscription.findUniqueOrThrow({ where: { organizationId: org } })).periodEnd).toEqual(before.periodEnd);
    await api('post', `${root()}/cancel`).send({}).expect(201); await api('post', `${root()}/cancel`).send({}).expect(201);
    expect(await prisma.organization.count({ where: { id: org } })).toBe(1);
    expect(state((await api('get', root()).expect(200)).body).subscription?.cancelAtEnd).toBe(true);
  });
  it('retains unknown checkout intent on timeout and reconciles it without another charge', async () => {
    await enroll(); create.mockRejectedValueOnce(new ServiceUnavailableExceptionForTest());
    const dto = { planId, idempotencyKey: randomUUID() };
    await api('post', `${root()}/checkout`).send(dto).expect(503);
    const payment = (await prisma.billingCheckout.findFirstOrThrow({ where: { organizationId: org } })); expect(payment.state).toBe('UNKNOWN');
    await api('post', `${root()}/checkout`).send(dto).expect(201); expect(create).toHaveBeenCalledTimes(1);
    inspect.mockResolvedValueOnce({ invoiceId: String(Math.floor(Math.random() * 1e12)), status: 'Paid', failedAttempt: false });
    await api('post', `${root()}/checkouts/${payment.id}/reconcile`).send({}).expect(201);
    expect((await prisma.billingSubscription.findUniqueOrThrow({ where: { organizationId: org } })).status).toBe('ACTIVE');
  });
  it('applies fixed grace on failed renewal and restores access only after verified payment', async () => {
    await enroll(); const paid = await checkout(); await api('post', `${root()}/checkouts/${paid.id}/reconcile`).send({}).expect(201);
    await prisma.billingSubscription.update({ where: { organizationId: org }, data: { periodStart: new Date(Date.now() - 31 * DAY), periodEnd: new Date(Date.now() - DAY) } });
    const renewal = await checkout();
    inspect.mockImplementation((value: { providerInvoiceId: string | null }) => Promise.resolve({ invoiceId: value.providerInvoiceId ?? '123', status: 'Pending' as const, failedAttempt: true }));
    const failed = state((await api('post', `${root()}/checkouts/${renewal.id}/reconcile`).send({}).expect(201)).body);
    expect(failed.subscription?.status).toBe('PAST_DUE'); expect(failed.limits?.publishing).toBe(true);
    const expiry = new Date(failed.subscription!.graceEnd!);
    const entitlements = app.get(EntitlementsService);
    expect((await entitlements.current(prisma, org, expiry))?.publishing).toBe(false);
    inspect.mockImplementation((value: { providerInvoiceId: string | null }) => Promise.resolve({ invoiceId: value.providerInvoiceId ?? '123', status: 'Paid' as const, failedAttempt: false }));
    expect(state((await api('post', `${root()}/checkouts/${renewal.id}/reconcile`).send({}).expect(201)).body).subscription?.status).toBe('ACTIVE');
  });
  it('requires AAL2 admin for immutable plan versions and audited expiring overrides', async () => {
    await enroll();
    const planBody = { code: randomUUID(), version: 1, name: 'Admin plan', nameAr: 'باقة الإدارة', amount: '10.000', limits: { ...limits, templates: [...templateKeys] }, reason: 'Sandbox acceptance fixture' };
    await api('post', '/api/v1/platform/billing/plans').send(planBody).expect(403);
    const weakAdmin = await session(true, 'AAL1'); await api('post', '/api/v1/platform/billing/plans', weakAdmin).send(planBody).expect(403);
    const result = (await api('post', '/api/v1/platform/billing/plans', admin).send(planBody).expect(201)).body as { id: string }; plans.push(result.id);
    await expect(prisma.billingPlan.update({ where: { id: result.id }, data: { amount: '20.000' } })).rejects.toThrow();
    const expiresAt = new Date(Date.now() + DAY);
    await api('post', `/api/v1/platform/billing/organizations/${org}/override`, admin).send({ limits: { ...limits, locations: 5 }, expiresAt: expiresAt.toISOString(), reason: 'Temporary sandbox limit testing' }).expect(201);
    expect(state((await api('get', root()).expect(200)).body).limits?.locations).toBe(5);
    expect((await app.get(EntitlementsService).current(prisma, org, expiresAt))?.locations).toBe(1);
    expect(await prisma.securityEvent.count({ where: { organizationId: org, reason: 'Temporary sandbox limit testing', type: 'BILLING_UPDATED' } })).toBe(1);
    await api('patch', `/api/v1/platform/billing/plans/${planId}`, admin).send({ active: false, reason: 'Retire sandbox offer version' }).expect(200);
    expect(state((await api('get', root()).expect(200)).body).subscription?.plan.id).toBe(planId);
  });
  it('keeps billing mutations unavailable when the sandbox is disabled', async () => {
    await enroll();
    config.set('BILLING_MODE', 'disabled');
    await api('post', `${root()}/trial`).send({ planId }).expect(503);
    expect(state((await api('get', root()).expect(200)).body).limits?.publishing).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
  it('extends same-plan renewals once and applies paid downgrades without removing resources', async () => {
    const higher = await prisma.billingPlan.create({ data: { code: randomUUID(), version: 1, name: 'Higher plan', nameAr: 'باقة أكبر', amount: '5.000', limits: { ...limits, locations: 3, menus: 3 } } }); plans.push(higher.id);
    const lower = planId; planId = higher.id; await enroll();
    const first = await checkout(); await api('post', `${root()}/checkouts/${first.id}/reconcile`).send({}).expect(201);
    const before = await prisma.billingSubscription.findUniqueOrThrow({ where: { organizationId: org } });
    const second = await checkout(); await api('post', `${root()}/checkouts/${second.id}/reconcile`).send({}).expect(201);
    expect((await prisma.billingCheckout.findUniqueOrThrow({ where: { id: second.id } })).periodStart).toEqual(before.periodEnd);
    await api('post', loc()).send(locationData()).expect(201); await api('post', loc()).send(locationData()).expect(201);
    planId = lower;
    const downgrade = await checkout();
    const next = state((await api('post', `${root()}/checkouts/${downgrade.id}/reconcile`).send({}).expect(201)).body);
    expect(next.subscription?.plan.id).toBe(lower); expect(next.usage.locations).toBe(2); expect(next.limits?.locations).toBe(1);
    await api('post', loc()).send(locationData()).expect(403);
    expect(await prisma.location.count({ where: { organizationId: org } })).toBe(2);
  });
});

import { ServiceUnavailableException as ServiceUnavailableExceptionForTest } from '@nestjs/common';
