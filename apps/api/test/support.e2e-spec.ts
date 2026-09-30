import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { CryptoService } from '../src/auth/crypto.service';
import { contractRequest } from './support/contract-request';

describe('M7 support conversations and notifications', () => {
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
  const api = (method: 'get' | 'patch' | 'post', path: string, cookie = admin) => contractRequest(app.getHttpServer() as Server)[method](`/api/v1${path}`).set('Cookie', cookie).set('Origin', 'http://localhost:3000').set('x-support-reason', reason);
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
    await prisma.supportTicket.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.securityEvent.deleteMany({ where: { OR: [{ actorUserId: { in: users } }, { organizationId: { in: orgs } }] } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  });

  const root = () => `/organizations/${org}/support`;
  async function ticket() {
    const result = await api('post', root(), owner).send({ subject: 'Menu publishing help', body: 'Please help us find the latest menu.' }).expect(201);
    return (result.body as { id: string }).id;
  }
  it('enforces organization support grants, active membership and operator AAL2 on every route', async () => {
    const id = await ticket(), outsider = await session();
    for (const cookie of ['', outsider.cookie]) {
      const expected = cookie ? 404 : 401;
      await api('get', root(), cookie).expect(expected);
      await api('get', `${root()}/${id}`, cookie).expect(expected);
      await api('post', `${root()}/${id}/messages`, cookie).send({ body: 'Unauthorized reply' }).expect(expected);
      await api('patch', `${root()}/${id}/status`, cookie).send({ status: 'CLOSED', expectedStatus: 'OPEN' }).expect(expected);
      await api('get', `${root()}/notifications`, cookie).expect(expected);
    }
    for (const cookie of [owner, weak]) {
      await api('get', '/platform/support', cookie).expect(403);
      await api('get', `/platform/support/${id}`, cookie).expect(403);
      await api('post', `/platform/support/${id}/messages`, cookie).send({ body: 'No access' }).expect(403);
      await api('patch', `/platform/support/${id}/status`, cookie).send({ status: 'CLOSED', expectedStatus: 'OPEN' }).expect(403);
    }
    await prisma.organizationMember.updateMany({ where: { organizationId: org, userId: ownerId }, data: { role: 'MANAGER', allLocations: false } });
    await api('get', root(), owner).expect(404);
    await prisma.organizationMember.updateMany({ where: { organizationId: org, userId: ownerId }, data: { permissions: ['support.manage'] } });
    await api('get', root(), owner).expect(200);
    await prisma.organizationMember.updateMany({ where: { organizationId: org, userId: ownerId }, data: { status: 'REVOKED' } });
    await api('get', root(), owner).expect(404);
  });
  it('ignores tenant query ownership and rejects cross-tenant ticket and notification IDs', async () => {
    const id = await ticket();
    const other = await prisma.organization.create({ data: { name: 'Other support tenant', slug: randomUUID() } }); orgs.push(other.id);
    const outsider = await session();
    await prisma.organizationMember.create({ data: { organizationId: other.id, userId: outsider.id, role: 'OWNER', status: 'ACTIVE', allLocations: true, permissions: [] } });
    const foreign = `/organizations/${other.id}/support`;
    expect((await api('get', `${foreign}?organizationId=${org}`, outsider.cookie).expect(200)).body).toEqual([]);
    await api('get', `${foreign}/${id}`, outsider.cookie).expect(404);
    await api('post', `${foreign}/${id}/messages`, outsider.cookie).send({ body: 'Not mine' }).expect(404);
    await api('post', `/platform/support/${id}/messages`).send({ body: 'Operator reply' }).expect(201);
    const notes = (await api('get', `${root()}/notifications`, owner).expect(200)).body as { id: string }[];
    await api('patch', `${foreign}/notifications/${notes[0]!.id}/read`, outsider.cookie).send({}).expect(404);
  });
  it('appends escaped plain-text content, audits reasoned access and notifies only the creator', async () => {
    const id = await ticket(), colleague = await session();
    await prisma.organizationMember.create({ data: { organizationId: org, userId: colleague.id, role: 'OWNER', status: 'ACTIVE', allLocations: true, permissions: [] } });
    const reply = '<script>never execute</script> تحقق من الرابط';
    await api('post', `/platform/support/${id}/messages`).set('x-request-id', 'support-correlated-request').set('x-support-reason', `uri:${encodeURIComponent('مراجعة حالة دعم النشر')}`).send({ body: reply }).expect(201);
    const thread = await api('get', `${root()}/${id}`, owner).expect(200);
    expect((thread.body as { messages: { body: string }[] }).messages[0]!.body).toBe(reply);
    expect(JSON.stringify(thread.body)).not.toMatch(/authorId|createdById|password|email/);
    await api('get', `/platform/support/${id}`).expect(200);
    const audit = await prisma.securityEvent.findFirstOrThrow({ where: { actorUserId: adminId, targetId: id, reason: 'مراجعة حالة دعم النشر' } });
    expect(audit.requestId).toBeTruthy(); expect(JSON.stringify(audit.metadata)).not.toContain(reply);
    const notes = (await api('get', `${root()}/notifications`, owner).expect(200)).body as { id: string }[]; expect(notes).toHaveLength(1);
    expect((await api('get', `${root()}/notifications`, colleague.cookie).expect(200)).body).toEqual([]);
    await api('patch', `${root()}/notifications/${notes[0]!.id}/read`, colleague.cookie).send({}).expect(404);
    for (let i = 0; i < 2; i++) await api('patch', `${root()}/notifications/${notes[0]!.id}/read`, owner).send({}).expect(200);
    expect((await api('get', `${root()}/notifications`, owner).expect(200)).body).toEqual([]);
    await api('post', `${root()}/${id}/messages`, owner).send({ body: 'Thanks for your reply.' }).expect(201);
    expect(await prisma.supportMessage.count({ where: { ticketId: id } })).toBe(3);
    expect(await prisma.inboxNotification.count({ where: { ticketId: id } })).toBe(1);
  });
  it('serializes closing, rejects stale status/replies and allows reopening without replacing history', async () => {
    const id = await ticket();
    const results = await Promise.all([1, 2].map(() => api('patch', `/platform/support/${id}/status`).send({ status: 'CLOSED', expectedStatus: 'OPEN' })));
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    await api('post', `${root()}/${id}/messages`, owner).send({ body: 'Closed reply' }).expect(409);
    await api('patch', `${root()}/${id}/status`, owner).send({ status: 'OPEN', expectedStatus: 'CLOSED' }).expect(200);
    await api('post', `${root()}/${id}/messages`, owner).send({ body: 'Reopened reply' }).expect(201);
    expect(await prisma.supportMessage.count({ where: { ticketId: id } })).toBe(2);
    expect(await prisma.inboxNotification.count({ where: { ticketId: id } })).toBe(1);
  });
  it('rolls back the reply, notification and timestamp when its audit fails', async () => {
    const id = await ticket(), before = await prisma.supportTicket.findUniqueOrThrow({ where: { id } });
    const original = prisma.$transaction.bind(prisma);
    jest.spyOn(prisma, '$transaction').mockImplementationOnce(((operation: (tx: unknown) => Promise<unknown>) => original(async tx => {
      const wrapped = Object.create(tx) as typeof tx;
      Object.defineProperty(wrapped, 'securityEvent', { value: { create: () => { throw new Error('audit unavailable'); } } });
      return operation(wrapped);
    })) as typeof prisma.$transaction);
    await api('post', `/platform/support/${id}/messages`).send({ body: 'Atomic reply' }).expect(500);
    expect(await prisma.supportMessage.count({ where: { ticketId: id } })).toBe(1);
    expect(await prisma.inboxNotification.count({ where: { ticketId: id } })).toBe(0);
    expect((await prisma.supportTicket.findUniqueOrThrow({ where: { id } })).updatedAt).toEqual(before.updatedAt);
  });
  it('validates CSRF, bounded text, meaningful reasons and pagination', async () => {
    const id = await ticket();
    await api('post', `${root()}/${id}/messages`, owner).unset('Origin').send({ body: 'No origin' }).expect(403);
    for (const body of ['', '  ', 'x'.repeat(4001)]) await api('post', `${root()}/${id}/messages`, owner).send({ body }).expect(400);
    await api('post', `${root()}/${id}/messages`, owner).send({ body: 'Valid text', fromPlatform: true }).expect(400);
    await api('get', `/platform/support/${id}`).unset('x-support-reason').expect(400);
    await api('post', `/platform/support/${id}/messages`).set('x-support-reason', 'uri:%xx').send({ body: 'Valid text' }).expect(400);
    await api('get', `${root()}?limit=101`, owner).expect(400);
    await api('get', `${root()}/${id}?after=${randomUUID()}`, owner).expect(400);
    await prisma.supportMessage.createMany({ data: [1, 2, 3].map(i => ({ ticketId: id, authorId: ownerId, fromPlatform: false, body: `Message ${i}`, createdAt: new Date('2026-09-29T23:00:00Z') })) });
    const first = (await api('get', `${root()}/${id}?limit=2`, owner).expect(200)).body as { messages: { id: string }[] };
    const second = (await api('get', `${root()}/${id}?limit=2&after=${first.messages[1]!.id}`, owner).expect(200)).body as { messages: { id: string }[] };
    expect(second.messages).toHaveLength(2); expect(second.messages.every(row => first.messages.every(before => before.id !== row.id))).toBe(true);
    expect((await api('get', `/platform/support?organizationId=${org}&search=publishing&status=OPEN`).expect(200)).body).toHaveLength(1);
  });
});
