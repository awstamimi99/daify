import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { CryptoService } from '../src/auth/crypto.service';
import { contractRequest } from './support/contract-request';

describe('M7 audited platform operations', () => {
  let app: INestApplication, prisma: PrismaService, admin: string, weak: string, owner: string;
  let adminId: string, ownerId: string, org: string;
  const users: string[] = [], orgs: string[] = [];
  const reason = 'Investigating support case M7-100';
  async function session(platformAdmin = false, assuranceLevel: 'AAL1' | 'AAL2' = 'AAL2') {
    const crypto = app.get(CryptoService), token = crypto.opaqueToken();
    const user = await prisma.user.create({ data: { email: `m7-${randomUUID()}@example.com`, displayName: 'M7 operator fixture', passwordHash: 'sensitive-password', status: 'ACTIVE', emailVerifiedAt: new Date(), platformAdmin } });
    users.push(user.id);
    await prisma.session.create({ data: { userId: user.id, tokenHash: crypto.tokenHash(token), assuranceLevel, expiresAt: new Date(Date.now() + 2 * 86400000), absoluteExpiresAt: new Date(Date.now() + 3 * 86400000) } });
    return { id: user.id, cookie: `daify_session=${token}` };
  }
  const api = (method: 'get' | 'patch', path: string, cookie = admin) => contractRequest(app.getHttpServer() as Server)[method](`/api/v1${path}`).set('Cookie', cookie).set('Origin', 'http://localhost:3000').set('x-support-reason', reason);
  beforeAll(async () => { app = await createApp(); await app.init(); prisma = app.get(PrismaService); });
  beforeEach(async () => {
    await prisma.rateLimitBucket.deleteMany();
    const a = await session(true); admin = a.cookie; adminId = a.id;
    weak = (await session(true, 'AAL1')).cookie;
    const o = await session(); owner = o.cookie; ownerId = o.id;
    org = (await prisma.organization.create({ data: { name: 'M7 Kitchen', slug: `m7-${randomUUID()}` } })).id; orgs.push(org);
    await prisma.organizationMember.create({ data: { organizationId: org, userId: ownerId, role: 'OWNER', status: 'ACTIVE', allLocations: true, permissions: [] } });
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await prisma.securityEvent.deleteMany({ where: { OR: [{ actorUserId: { in: users } }, { organizationId: { in: orgs } }] } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  it('rejects anonymous, tenant and weak-admin reads and writes', async () => {
    for (const path of ['/platform/organizations', '/platform/users', '/platform/audit', '/platform/plans', '/platform/subscriptions', '/platform/templates']) {
      await api('get', path, '').expect(401);
      await api('get', path, owner).expect(403);
      await api('get', path, weak).expect(403);
    }
    for (const cookie of [owner, weak]) await api('patch', `/platform/organizations/${org}/status`, cookie).send({ status: 'SUSPENDED', expectedStatus: 'ACTIVE', reason }).expect(403);
    expect((await prisma.organization.findUniqueOrThrow({ where: { id: org } })).status).toBe('ACTIVE');
  });

  it('validates reasons, bounded filters, UUIDs and mutation Origin', async () => {
    await api('get', '/platform/users').unset('x-support-reason').expect(400);
    await api('get', '/platform/users').set('x-support-reason', ' ').expect(400);
    await api('get', '/platform/users').set('x-support-reason', 'x'.repeat(501)).expect(400);
    await api('get', '/platform/users').set('x-support-reason', 'uri:%zz').expect(400);
    for (const query of ['limit=101', 'limit=0', 'after=bad', 'unexpected=yes']) await api('get', `/platform/users?${query}`).expect(400);
    await api('patch', `/platform/organizations/${org}/status`).unset('Origin').send({ status: 'SUSPENDED', expectedStatus: 'ACTIVE', reason }).expect(403);
    await api('patch', '/platform/organizations/bad/status').send({ status: 'SUSPENDED', expectedStatus: 'ACTIVE', reason }).expect(400);
    await api('patch', `/platform/users/${ownerId}/status`).send({ status: 'DISABLED', expectedStatus: 'ACTIVE', reason: ' '.repeat(20) }).expect(400);
  });

  it('paginates directories without exposing authentication data and audits Unicode reasons', async () => {
    const first = await api('get', '/platform/users?limit=2&search=m7-').set('x-support-reason', `uri:${encodeURIComponent('مراجعة طلب الدعم الفني')}`).expect(200);
    const rows = first.body as { id: string }[]; expect(rows).toHaveLength(2);
    const next = await api('get', `/platform/users?limit=2&search=m7-&after=${rows[1]!.id}`).expect(200);
    expect((next.body as { id: string }[]).every(row => rows.every(before => before.id !== row.id))).toBe(true);
    expect(JSON.stringify(first.body)).not.toMatch(/passwordHash|mfaSecret|tokenHash|recovery/i);
    expect(first.headers['cache-control']).toBe('private, no-store');
    expect(await prisma.securityEvent.findFirst({ where: { actorUserId: adminId, reason: 'مراجعة طلب الدعم الفني', targetType: 'UserDirectory' } })).not.toBeNull();
  });

  it('suspends tenant access, preserves membership and restores with correlated before/after audit', async () => {
    await api('get', `/organizations/${org}`, owner).expect(200);
    await api('patch', `/platform/organizations/${org}/status`).set('x-request-id', 'm7-suspend-test').send({ status: 'SUSPENDED', expectedStatus: 'ACTIVE', reason }).expect(200);
    await api('get', `/organizations/${org}`, owner).expect(404);
    expect(await prisma.organizationMember.count({ where: { organizationId: org } })).toBe(1);
    const audit = await prisma.securityEvent.findFirstOrThrow({ where: { actorUserId: adminId, targetId: org } });
    expect(audit.metadata).toEqual({ action: 'organization.status', before: 'ACTIVE', after: 'SUSPENDED' });
    expect(audit.requestId).toBeTruthy(); expect(audit.reason).toBe(reason);
    await api('patch', `/platform/organizations/${org}/status`).send({ status: 'ACTIVE', expectedStatus: 'SUSPENDED', reason }).expect(200);
    await api('get', `/organizations/${org}`, owner).expect(200);
  });

  it('serializes racing updates and rejects stale edits without duplicate audit effects', async () => {
    const results = await Promise.all([1, 2].map(() => api('patch', `/platform/organizations/${org}/status`).send({ status: 'SUSPENDED', expectedStatus: 'ACTIVE', reason })));
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    expect(await prisma.securityEvent.count({ where: { actorUserId: adminId, targetId: org } })).toBe(1);
    await api('patch', `/platform/organizations/${org}/status`).send({ status: 'SUSPENDED', expectedStatus: 'SUSPENDED', reason }).expect(200);
    expect(await prisma.securityEvent.count({ where: { actorUserId: adminId, targetId: org } })).toBe(1);
  });

  it('rolls back status and session revocation if the audit cannot persist', async () => {
    // A failed INSERT is simulated inside the real transaction, rather than
    // mocking transaction results or relaxing the database assertion.
    const original = prisma.$transaction.bind(prisma);
    jest.spyOn(prisma, '$transaction').mockImplementationOnce(((operation: (tx: unknown) => Promise<unknown>) => original(async tx => {
      const wrapped = Object.create(tx) as typeof tx;
      Object.defineProperty(wrapped, 'securityEvent', { value: { create: () => { throw new Error('audit unavailable'); } } });
      return operation(wrapped);
    })) as typeof prisma.$transaction);
    await api('patch', `/platform/users/${ownerId}/status`).send({ status: 'DISABLED', expectedStatus: 'ACTIVE', reason }).expect(500);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ownerId } })).status).toBe('ACTIVE');
    await api('get', '/auth/me', owner).expect(200);
  });

  it('revokes sessions on disable and does not revive them on restoration', async () => {
    await api('patch', `/platform/users/${ownerId}/status`).send({ status: 'DISABLED', expectedStatus: 'ACTIVE', reason }).expect(200);
    await api('get', '/auth/me', owner).expect(401);
    await api('patch', `/platform/users/${ownerId}/status`).send({ status: 'ACTIVE', expectedStatus: 'DISABLED', reason }).expect(200);
    await api('get', '/auth/me', owner).expect(401);
    expect(await prisma.securityEvent.count({ where: { actorUserId: adminId, targetId: ownerId } })).toBe(2);
  });

  it('protects admins, pending users, archived organizations and forbidden fields', async () => {
    await api('patch', `/platform/users/${adminId}/status`).send({ status: 'DISABLED', expectedStatus: 'ACTIVE', reason }).expect(403);
    await prisma.user.update({ where: { id: ownerId }, data: { status: 'PENDING', emailVerifiedAt: null } });
    await api('patch', `/platform/users/${ownerId}/status`).send({ status: 'ACTIVE', expectedStatus: 'DISABLED', reason }).expect(409);
    await api('patch', `/platform/users/${ownerId}/status`).send({ status: 'ACTIVE', expectedStatus: 'DISABLED', reason, platformAdmin: true }).expect(400);
    await prisma.organization.update({ where: { id: org }, data: { status: 'ARCHIVED', archivedAt: new Date() } });
    await api('patch', `/platform/organizations/${org}/status`).send({ status: 'ACTIVE', expectedStatus: 'SUSPENDED', reason }).expect(409);
  });

  it('projects plans, subscriptions and the actual template catalog with an audit trail', async () => {
    const plan = await prisma.billingPlan.create({ data: { code: `m7-${randomUUID()}`, version: 1, name: 'Directory plan', nameAr: 'باقة تجريبية', amount: '3.500', limits: { locations: 1, menus: 2, members: 3, templates: ['atelier'], publishing: true } } });
    try {
      await prisma.billingSubscription.create({ data: { organizationId: org, planId: plan.id, status: 'TRIAL', periodStart: new Date(Date.now() - 86400000), periodEnd: new Date(Date.now() + 86400000) } });
      const plans = await api('get', `/platform/plans?search=${plan.code}`).expect(200);
      expect((plans.body as { amount: string }[])[0]!.amount).toBe('3.500');
      const subscriptions = await api('get', `/platform/subscriptions?search=${(await prisma.organization.findUniqueOrThrow({ where: { id: org } })).slug}`).expect(200);
      expect((subscriptions.body as { id: string; status: string }[])[0]).toMatchObject({ id: org, status: 'TRIAL' });
      expect(JSON.stringify(subscriptions.body)).not.toMatch(/paymentUrl|providerInvoice|actorUserId/);
      const templates = await api('get', '/platform/templates').expect(200); expect(templates.body).toHaveLength(9);
      expect(await prisma.securityEvent.count({ where: { actorUserId: adminId, targetType: { in: ['PlanDirectory', 'SubscriptionDirectory', 'TemplateCatalog'] } } })).toBe(3);
    } finally { await prisma.billingSubscription.deleteMany({ where: { planId: plan.id } }); await prisma.billingPlan.delete({ where: { id: plan.id } }); }
  });

  it('filters and paginates the audit viewer without exposing IPs or metadata', async () => {
    await prisma.securityEvent.createMany({ data: [1, 2, 3].map(i => ({ type: 'PLATFORM_ACCESS' as const, actorUserId: adminId, organizationId: org, outcome: 'SUCCESS', reason: `Fixture event ${i}`, ipAddress: '192.0.2.111', metadata: { secret: 'never-expose' } })) });
    const first = await api('get', `/platform/audit?organizationId=${org}&limit=2`).expect(200);
    const rows = first.body as { id: string; organizationId: string }[]; expect(rows).toHaveLength(2); expect(rows.every(row => row.organizationId === org)).toBe(true);
    const next = await api('get', `/platform/audit?organizationId=${org}&limit=2&after=${rows[1]!.id}`).expect(200);
    expect(next.body).toHaveLength(1); expect(rows.some(row => row.id === (next.body as { id: string }[])[0]!.id)).toBe(false);
    expect(JSON.stringify(first.body)).not.toMatch(/192\.0\.2|never-expose|metadata/);
    await api('get', `/platform/audit?organizationId=${randomUUID()}&after=${rows[0]!.id}`).expect(400);
    expect(await prisma.securityEvent.count({ where: { actorUserId: adminId, targetType: 'AuditDirectory' } })).toBe(2);
  });
});
