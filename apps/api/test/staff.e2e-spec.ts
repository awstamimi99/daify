import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { CryptoService } from '../src/auth/crypto.service';
import { contractRequest } from './support/contract-request';
import { staffPresets, type StaffRole } from '../src/platform/staff-policy';
import type { DraftMenu } from '../../../packages/types/src/draft-menu';

describe('Platform employee authority and scoped assistance', () => {
  let app: INestApplication, prisma: PrismaService, owner: Account, manager: Account, supervisor: Account, support: Account, sales: Account, org: string, otherOrg: string, location: string;
  const users: string[] = [], organizations: string[] = [];
  const reason = 'Testing employee permissions and customer support';
  type Account = { id: string; cookie: string; email: string };
  async function account(platformAdmin = false, assuranceLevel: 'AAL1' | 'AAL2' = 'AAL2'): Promise<Account> {
    const crypto = app.get(CryptoService), token = crypto.opaqueToken();
    const user = await prisma.user.create({ data: { email: `staff-${randomUUID()}@example.com`, displayName: 'Employee fixture', passwordHash: 'unused', status: 'ACTIVE', emailVerifiedAt: new Date(), platformAdmin, mfaSecret: 'v1.fixture' } }); users.push(user.id);
    await prisma.session.create({ data: { userId: user.id, tokenHash: crypto.tokenHash(token), assuranceLevel, expiresAt: new Date(Date.now() + 2 * 86400000), absoluteExpiresAt: new Date(Date.now() + 3 * 86400000) } });
    return { id: user.id, email: user.email, cookie: `daify_session=${token}` };
  }
  async function employee(role: StaffRole, extra: string[] = []) {
    const user = await account();
    await prisma.platformStaff.create({ data: { userId: user.id, email: user.email, role, status: 'ACTIVE', permissions: [...staffPresets[role], ...extra], allOrganizations: false, organizationIds: [org], invitedById: owner.id, invitationExpiresAt: new Date(Date.now() + 86400000) } });
    return user;
  }
  const api = (method: 'get' | 'post' | 'patch', path: string, actor = owner) => contractRequest(app.getHttpServer() as Server)[method](`/api/v1${path}`).set('Cookie', actor.cookie).set('Origin', 'http://localhost:3000').set('x-support-reason', reason);
  const invite = (role: StaffRole, overrides: object = {}) => ({ email: `invite-${randomUUID()}@example.com`, role, permissions: [...staffPresets[role]], allOrganizations: false, organizationIds: [org], reason, ...overrides });
  beforeAll(async () => {
    app = await createApp(); await app.init(); prisma = app.get(PrismaService); owner = await account(true);
    for (let i = 0; i < 2; i++) { const o = await prisma.organization.create({ data: { name: 'Employee support customer', slug: randomUUID() } }); organizations.push(o.id); if (i === 0) org = o.id; else otherOrg = o.id; }
    location = (await prisma.location.create({ data: { organizationId: org, name: 'Main', slug: 'main', currency: 'KWD', timezone: 'Asia/Kuwait', defaultLanguage: 'en' } })).id;
    manager = await employee('MANAGER'); supervisor = await employee('SUPERVISOR', ['staff.manage']); support = await employee('SUPPORT'); sales = await employee('SALES');
  });
  beforeEach(async () => { await prisma.rateLimitBucket.deleteMany(); });
  afterAll(async () => {
    if (!prisma) return;
    const where = { location: { organizationId: { in: organizations } } };
    await prisma.menu.updateMany({ where, data: { currentVersionId: null } });
    await prisma.menuVersion.deleteMany({ where: { menu: where } }); await prisma.menuRoute.deleteMany({ where: { menu: where } }); await prisma.theme.deleteMany({ where: { menu: where } });
    await prisma.menuItem.deleteMany({ where: { section: { menu: where } } }); await prisma.menuSection.deleteMany({ where: { menu: where } }); await prisma.menu.deleteMany({ where });
    await prisma.platformStaff.deleteMany({ where: { invitedById: { in: users } } });
    await prisma.securityEvent.deleteMany({ where: { OR: [{ actorUserId: { in: users } }, { organizationId: { in: organizations } }] } });
    await prisma.location.deleteMany({ where: { organizationId: { in: organizations } } }); await prisma.organization.deleteMany({ where: { id: { in: organizations } } }); await prisma.user.deleteMany({ where: { id: { in: users } } }); await app.close();
  });
  it('only lets the Owner appoint Managers and restricts supervisors to lower roles', async () => {
    await api('post', '/platform/staff').send(invite('MANAGER')).expect(201);
    await api('post', '/platform/staff', manager).send(invite('MANAGER')).expect(403);
    await api('post', '/platform/staff', manager).send(invite('SUPERVISOR')).expect(201);
    await api('post', '/platform/staff', supervisor).send(invite('SUPERVISOR')).expect(403);
    await api('post', '/platform/staff', supervisor).send(invite('SUPPORT')).expect(201);
    await api('post', '/platform/staff', support).send(invite('SALES')).expect(403);
  });
  it('rejects scope escalation, unknown grants, Sales menu access, self edits and peer edits', async () => {
    await api('post', '/platform/staff', manager).send(invite('SUPPORT', { allOrganizations: true, organizationIds: [] })).expect(403);
    await api('post', '/platform/staff', manager).send(invite('SUPPORT', { organizationIds: [otherOrg] })).expect(403);
    await api('post', '/platform/staff', manager).send(invite('SUPPORT', { permissions: ['audit.read'], allOrganizations: true, organizationIds: [] })).expect(403);
    await api('post', '/platform/staff').send(invite('SALES', { permissions: ['customers.read', 'menus.read', 'menus.edit'] })).expect(403);
    await api('post', '/platform/staff').send(invite('SUPPORT', { permissions: ['owner.manage'] })).expect(400);
    const row = await prisma.platformStaff.findUniqueOrThrow({ where: { userId: manager.id } });
    const update = { role: row.role, permissions: row.permissions, allOrganizations: false, organizationIds: [org], reason, status: 'ACTIVE', expectedVersion: row.version };
    await api('patch', `/platform/staff/${row.id}`, manager).send(update).expect(403);
    await api('patch', `/platform/staff/${row.id}`, supervisor).send(update).expect(403);
  });
  it('filters customers and blocks customer support access outside assignments', async () => {
    const response = await api('get', '/platform/organizations', support).expect(200);
    expect((response.body as { id: string }[]).map(row => row.id)).toEqual([org]);
    await api('get', `/platform/organizations/${otherOrg}/workspace`, support).expect(403);
    await api('get', '/platform/users', support).expect(403);
    await api('get', `/platform/organizations/${org}/workspace`, sales).expect(403);
  });
  it('allows Support to edit and publish with an audit reason, while Sales is blocked', async () => {
    const base = `/organizations/${org}/locations/${location}/menus`;
    await api('get', base, support).unset('x-support-reason').expect(400);
    const translations = [{ languageTag: 'en', name: 'Support menu', description: '' }];
    let menu = (await api('post', base, support).send({ name: 'Support menu', slug: randomUUID(), defaultLanguage: 'en', supportedLanguages: ['en'], translations }).expect(201)).body as DraftMenu;
    menu = (await api('post', `${base}/${menu.id}/sections`, support).send({ revision: menu.draftRevision, translations }).expect(201)).body as DraftMenu;
    menu = (await api('post', `${base}/${menu.id}/sections/${menu.sections[0]!.id}/items`, support).send({ revision: menu.draftRevision, translations, price: '2.500', isAvailable: true, isFeatured: false, allergens: [], dietaryTags: [] }).expect(201)).body as DraftMenu;
    await api('patch', `${base}/${menu.id}`, sales).send({ revision: menu.draftRevision, name: 'Unauthorized' }).expect(403);
    const payload = { revision: menu.draftRevision, idempotencyKey: randomUUID(), slug: randomUUID(), visibility: 'PUBLIC' };
    await api('post', `${base}/${menu.id}/publish`, sales).send(payload).expect(403);
    await api('post', `${base}/${menu.id}/publish`, support).send(payload).expect(201);
    const audit = await prisma.securityEvent.findFirst({ where: { actorUserId: support.id, targetId: menu.id, reason: 'menu.published' } });
    expect(audit?.metadata).toEqual({ platformAssistance: true, supportReason: reason });
  });
  it('requires the verified invitee, MFA and still-valid inviter permissions at acceptance', async () => {
    const candidate = await account();
    const created = await api('post', '/platform/staff', manager).send(invite('SUPPORT', { email: candidate.email })).expect(201);
    await api('get', '/platform/staff/invitation', candidate).expect(200);
    await api('post', '/platform/staff/accept', sales).send({}).expect(404);
    await prisma.platformStaff.update({ where: { userId: manager.id }, data: { status: 'SUSPENDED' } });
    await api('post', '/platform/staff/accept', candidate).send({}).expect(403);
    await prisma.platformStaff.update({ where: { userId: manager.id }, data: { status: 'ACTIVE' } });
    await prisma.platformStaff.update({ where: { id: (created.body as { id: string }).id }, data: { invitationExpiresAt: new Date(0) } });
    await api('post', '/platform/staff/accept', candidate).send({}).expect(404);
    await prisma.platformStaff.update({ where: { id: (created.body as { id: string }).id }, data: { invitationExpiresAt: new Date(Date.now() + 86400000) } });
    await api('post', '/platform/staff/accept', candidate).send({}).expect(201);
    await api('post', '/platform/staff/accept', candidate).send({}).expect(404);
    const weak = await account(false, 'AAL1');
    await api('post', '/platform/staff').send(invite('SUPPORT', { email: weak.email })).expect(201);
    await api('post', '/platform/staff/accept', weak).send({}).expect(401);
  });
  it('detects stale edits and revokes sessions immediately on suspension', async () => {
    const candidate = await employee('SUPPORT');
    const row = await prisma.platformStaff.findUniqueOrThrow({ where: { userId: candidate.id } });
    const update = { role: row.role, permissions: row.permissions, allOrganizations: false, organizationIds: [org], reason, status: 'SUSPENDED', expectedVersion: row.version };
    await api('patch', `/platform/staff/${row.id}`).send(update).expect(200);
    await api('get', '/platform/organizations', candidate).expect(401);
    await api('patch', `/platform/staff/${row.id}`).send(update).expect(409);
    expect(await prisma.securityEvent.count({ where: { targetId: row.id, targetType: 'PlatformStaff' } })).toBe(1);
  });
});
