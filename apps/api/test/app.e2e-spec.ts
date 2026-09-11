import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/bootstrap';
import { CryptoService } from '../src/auth/crypto.service';
import { PrismaService } from '../src/database/prisma.service';

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'correct horse battery staple';
const MFA_SECRET = 'JBSWY3DPEHPK3PXP';

function currentMfaCode(): string {
  const key = Buffer.from('48656c6c6f21deadbeef', 'hex');
  const input = Buffer.alloc(8);
  input.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac('sha1', key).update(input).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}

describe('DAIFY API authentication and authorization', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let crypto: CryptoService;
  let ownerCookie: string;
  let outsiderCookie: string;
  let organizationId: string;
  let locationId: string;
  let secondLocationId: string;
  let ownerMemberId: string;

  const httpServer = (): Server => app.getHttpServer() as Server;
  const unsafe = () => ({ Origin: ORIGIN });
  const cookieFrom = (response: request.Response): string => {
    const headers = response.headers as unknown as Record<string, string | string[] | undefined>;
    const header = headers['set-cookie'];
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) throw new Error('Expected a session cookie.');
    return value.split(';')[0]!;
  };
  const bodyOf = <T>(response: request.Response): T => response.body as T;

  async function signupVerifyLogin(email: string): Promise<{ cookie: string; userId: string }> {
    const signup = await request(httpServer()).post('/api/v1/auth/signup').set(unsafe()).send({ email, displayName: email.split('@')[0], password: PASSWORD }).expect(201);
    const signupBody = bodyOf<{ verificationToken: string; user: { id: string } }>(signup);
    await request(httpServer()).post('/api/v1/auth/verify-email').set(unsafe()).send({ token: signupBody.verificationToken }).expect(201);
    const login = await request(httpServer()).post('/api/v1/auth/login').set(unsafe()).send({ email, password: PASSWORD }).expect(200);
    return { cookie: cookieFrom(login), userId: signupBody.user.id };
  }

  async function createDirectMember(role: 'MANAGER' | 'STAFF' | 'VIEWER', options: { permissions?: string[]; allLocations?: boolean } = {}) {
    const user = await prisma.user.create({ data: { email: `${role.toLowerCase()}-${randomUUID()}@example.com`, displayName: role, passwordHash: await crypto.hashPassword(PASSWORD), status: 'ACTIVE', emailVerifiedAt: new Date() } });
    const member = await prisma.organizationMember.create({ data: { organizationId, userId: user.id, role, status: 'ACTIVE', allLocations: options.allLocations ?? false, permissions: options.permissions ?? [], acceptedAt: new Date() } });
    if (!member.allLocations) await prisma.organizationMemberLocation.create({ data: { organizationId, organizationMemberId: member.id, locationId } });
    const token = crypto.opaqueToken();
    await prisma.session.create({ data: { userId: user.id, tokenHash: crypto.tokenHash(token), expiresAt: new Date(Date.now() + 86_400_000), absoluteExpiresAt: new Date(Date.now() + 86_400_000) } });
    return { user, member, cookie: `daify_session=${token}` };
  }

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    prisma = app.get(PrismaService);
    crypto = app.get(CryptoService);

    await prisma.securityEvent.deleteMany();
    await prisma.actionToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.theme.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.menuSection.deleteMany();
    await prisma.menu.deleteMany();
    await prisma.organizationMemberLocation.deleteMany();
    await prisma.location.deleteMany();
    await prisma.organizationMember.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();

    const owner = await signupVerifyLogin('owner@example.com');
    ownerCookie = owner.cookie;
    const created = await request(httpServer()).post('/api/v1/organizations').set(unsafe()).set('Cookie', ownerCookie).send({ name: 'Tenant A', slug: 'tenant-a' }).expect(201);
    organizationId = bodyOf<{ id: string }>(created).id;
    ownerMemberId = (await prisma.organizationMember.findUniqueOrThrow({ where: { organizationId_userId: { organizationId, userId: owner.userId } } })).id;
    const first = await request(httpServer()).post(`/api/v1/organizations/${organizationId}/locations`).set(unsafe()).set('Cookie', ownerCookie).send({ name: 'Main Branch', slug: 'main', timezone: 'Asia/Kuwait', currency: 'KWD', defaultLanguage: 'ar' }).expect(201);
    locationId = bodyOf<{ id: string }>(first).id;
    const second = await request(httpServer()).post(`/api/v1/organizations/${organizationId}/locations`).set(unsafe()).set('Cookie', ownerCookie).send({ name: 'Second Branch', slug: 'second', timezone: 'Asia/Kuwait', currency: 'KWD', defaultLanguage: 'en' }).expect(201);
    secondLocationId = bodyOf<{ id: string }>(second).id;
    outsiderCookie = (await signupVerifyLogin('outsider@example.com')).cookie;
  });

  afterAll(async () => { await app.close(); });

  it('serves health and OpenAPI while protecting organization routes', async () => {
    await request(httpServer()).get('/api/v1/health').expect(200);
    await request(httpServer()).get('/api/docs/openapi.json').expect(200);
    await request(httpServer()).get(`/api/v1/organizations/${organizationId}`).expect(401);
  });

  it('requires an allowed origin for state-changing cookie requests', async () => {
    await request(httpServer()).post('/api/v1/organizations').set('Cookie', ownerCookie).send({ name: 'Denied', slug: 'denied' }).expect(403);
  });

  it('prevents one organization user from reading another tenant or location', async () => {
    await request(httpServer()).get(`/api/v1/organizations/${organizationId}`).set('Cookie', outsiderCookie).expect(404);
    await request(httpServer()).get(`/api/v1/organizations/${organizationId}/locations/${locationId}`).set('Cookie', outsiderCookie).expect(404);
  });

  it('enforces role presets and explicit location scope at the API boundary', async () => {
    const manager = await createDirectMember('MANAGER');
    const staff = await createDirectMember('STAFF');
    const viewer = await createDirectMember('VIEWER');

    await request(httpServer()).get(`/api/v1/organizations/${organizationId}`).set('Cookie', manager.cookie).expect(200);
    await request(httpServer()).post(`/api/v1/organizations/${organizationId}/locations`).set(unsafe()).set('Cookie', manager.cookie).send({ name: 'No Grant', slug: 'no-grant', timezone: 'Asia/Kuwait', currency: 'KWD', defaultLanguage: 'en' }).expect(404);
    await request(httpServer()).get(`/api/v1/organizations/${organizationId}`).set('Cookie', staff.cookie).expect(404);
    await request(httpServer()).get(`/api/v1/organizations/${organizationId}/locations/${locationId}`).set('Cookie', staff.cookie).expect(200);
    await request(httpServer()).get(`/api/v1/organizations/${organizationId}/locations/${secondLocationId}`).set('Cookie', staff.cookie).expect(404);
    await request(httpServer()).get(`/api/v1/organizations/${organizationId}`).set('Cookie', viewer.cookie).expect(200);
    const scoped = await request(httpServer()).get(`/api/v1/organizations/${organizationId}`).set('Cookie', viewer.cookie).expect(200);
    expect(bodyOf<{ locations: { id: string }[] }>(scoped).locations.map(location => location.id)).toEqual([locationId]);
    const listed = await request(httpServer()).get('/api/v1/organizations').set('Cookie', viewer.cookie).expect(200);
    const workspaces = bodyOf<{ locations: { id: string }[]; membership: { permissions: string[] } }[]>(listed);
    expect(workspaces[0]?.locations.map(location => location.id)).toEqual([locationId]);
    expect(workspaces[0]?.membership.permissions).not.toContain('team.manage');
    await request(httpServer()).get(`/api/v1/organizations/${organizationId}/members`).set('Cookie', viewer.cookie).expect(404);
  });

  it('prevents managers from granting a broader role or scope', async () => {
    const manager = await prisma.organizationMember.findFirstOrThrow({ where: { organizationId, role: 'MANAGER' } });
    await prisma.organizationMember.update({ where: { id: manager.id }, data: { permissions: ['team.manage'] } });
    const session = await prisma.session.findFirstOrThrow({ where: { userId: manager.userId } });
    const rawToken = crypto.opaqueToken();
    await prisma.session.update({ where: { id: session.id }, data: { tokenHash: crypto.tokenHash(rawToken) } });
    const cookie = `daify_session=${rawToken}`;
    await request(httpServer()).post(`/api/v1/organizations/${organizationId}/invitations`).set(unsafe()).set('Cookie', cookie).send({ email: 'owner2@example.com', role: 'OWNER', permissions: [], allLocations: false, locationIds: [locationId] }).expect(403);
    await request(httpServer()).post(`/api/v1/organizations/${organizationId}/invitations`).set(unsafe()).set('Cookie', cookie).send({ email: 'broad@example.com', role: 'STAFF', permissions: [], allLocations: false, locationIds: [secondLocationId] }).expect(403);
    const members = await request(httpServer()).get(`/api/v1/organizations/${organizationId}/members`).set('Cookie', cookie).expect(200);
    expect(bodyOf<{ role: string }[]>(members).every(member => ['STAFF', 'VIEWER'].includes(member.role))).toBe(true);
  });

  it('supports scoped invitations and makes suspension effective immediately', async () => {
    const invited = await request(httpServer()).post(`/api/v1/organizations/${organizationId}/invitations`).set(unsafe()).set('Cookie', ownerCookie).send({ email: 'outsider@example.com', role: 'VIEWER', permissions: [], allLocations: false, locationIds: [locationId] }).expect(201);
    await request(httpServer()).post('/api/v1/organizations/invitations/accept').set(unsafe()).set('Cookie', outsiderCookie).send({ token: bodyOf<{ invitationToken: string }>(invited).invitationToken }).expect(201);
    await request(httpServer()).get(`/api/v1/organizations/${organizationId}/locations/${locationId}`).set('Cookie', outsiderCookie).expect(200);
    await request(httpServer()).get(`/api/v1/organizations/${organizationId}/locations/${secondLocationId}`).set('Cookie', outsiderCookie).expect(404);
    const member = await prisma.organizationMember.findFirstOrThrow({ where: { organizationId, user: { email: 'outsider@example.com' } } });
    await request(httpServer()).patch(`/api/v1/organizations/${organizationId}/members/${member.id}`).set(unsafe()).set('Cookie', ownerCookie).send({ status: 'SUSPENDED' }).expect(200);
    await request(httpServer()).get(`/api/v1/organizations/${organizationId}/locations/${locationId}`).set('Cookie', outsiderCookie).expect(404);
  });

  it('protects the last active owner', async () => {
    await request(httpServer()).patch(`/api/v1/organizations/${organizationId}/members/${ownerMemberId}`).set(unsafe()).set('Cookie', ownerCookie).send({ role: 'MANAGER' }).expect(409);
  });

  it('rejects invitation-based owner demotion, including previously issued invitations', async () => {
    await request(httpServer()).post(`/api/v1/organizations/${organizationId}/invitations`).set(unsafe()).set('Cookie', ownerCookie).send({ email: 'owner@example.com', role: 'VIEWER', allLocations: true }).expect(409);
    const raw = crypto.opaqueToken();
    await prisma.actionToken.create({ data: { purpose: 'ORGANIZATION_INVITATION', tokenHash: crypto.tokenHash(raw), organizationId, email: 'owner@example.com', role: 'VIEWER', allLocations: true, permissions: [], locationIds: [], expiresAt: new Date(Date.now() + 60_000) } });
    await request(httpServer()).post('/api/v1/organizations/invitations/accept').set(unsafe()).set('Cookie', ownerCookie).send({ token: raw }).expect(409);
    expect(await prisma.organizationMember.count({ where: { organizationId, role: 'OWNER', status: 'ACTIVE' } })).toBe(1);
  });

  it('serializes concurrent owner demotions so an active owner always remains', async () => {
    const first = await createDirectMember('VIEWER');
    const second = await createDirectMember('VIEWER');
    const organization = await prisma.organization.create({ data: { name: 'Concurrent owners', slug: `owners-${randomUUID()}` } });
    const members = await Promise.all([first, second].map(fixture => prisma.organizationMember.create({ data: { organizationId: organization.id, userId: fixture.user.id, role: 'OWNER', status: 'ACTIVE', allLocations: true, permissions: [] } })));
    const results = await Promise.all([first, second].map((fixture, index) => request(httpServer()).patch(`/api/v1/organizations/${organization.id}/members/${members[index]!.id}`).set(unsafe()).set('Cookie', fixture.cookie).send({ role: 'MANAGER' })));
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    expect(await prisma.organizationMember.count({ where: { organizationId: organization.id, role: 'OWNER', status: 'ACTIVE' } })).toBe(1);
  });

  it('does not let a manager demote an owner by requesting a lower target role', async () => {
    const manager = await createDirectMember('MANAGER', { allLocations: true, permissions: ['team.manage'] });
    await request(httpServer()).patch(`/api/v1/organizations/${organizationId}/members/${ownerMemberId}`).set(unsafe()).set('Cookie', manager.cookie).send({ role: 'VIEWER' }).expect(403);
  });

  it('allows only one concurrent password-reset claim', async () => {
    const fixture = await createDirectMember('VIEWER');
    const forgot = await request(httpServer()).post('/api/v1/auth/forgot-password').set(unsafe()).send({ email: fixture.user.email }).expect(202);
    const token = bodyOf<{ resetToken: string }>(forgot).resetToken;
    const results = await Promise.all(['first replacement password', 'second replacement password'].map(password => request(httpServer()).post('/api/v1/auth/reset-password').set(unsafe()).send({ token, password })));
    expect(results.map(result => result.status).sort()).toEqual([201, 401]);
    await request(httpServer()).get('/api/v1/auth/me').set('Cookie', fixture.cookie).expect(401);
  });

  it('reissues verification without reactivating a disabled account', async () => {
    const signup = await request(httpServer()).post('/api/v1/auth/signup').set(unsafe()).send({ email: 'resend@example.com', displayName: 'Resend', password: PASSWORD }).expect(201);
    const original = bodyOf<{ verificationToken: string; user: { id: string } }>(signup);
    const resend = await request(httpServer()).post('/api/v1/auth/resend-verification').set(unsafe()).send({ email: 'resend@example.com' }).expect(202);
    await request(httpServer()).post('/api/v1/auth/verify-email').set(unsafe()).send({ token: original.verificationToken }).expect(401);
    await prisma.user.update({ where: { id: original.user.id }, data: { status: 'DISABLED' } });
    await request(httpServer()).post('/api/v1/auth/verify-email').set(unsafe()).send({ token: bodyOf<{ verificationToken: string }>(resend).verificationToken }).expect(401);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: original.user.id } })).status).toBe('DISABLED');
  });

  it('validates names, location settings and duplicate slugs without server errors', async () => {
    await request(httpServer()).post('/api/v1/organizations').set(unsafe()).set('Cookie', ownerCookie).send({ name: '  ', slug: 'empty-name' }).expect(400);
    await request(httpServer()).post(`/api/v1/organizations/${organizationId}/locations`).set(unsafe()).set('Cookie', ownerCookie).send({ name: 'Invalid', slug: 'invalid', timezone: 'Not/A_Timezone', currency: 'ZZZ', defaultLanguage: 'bad-locale' }).expect(400);
    await request(httpServer()).post(`/api/v1/organizations/${organizationId}/locations`).set(unsafe()).set('Cookie', ownerCookie).send({ name: 'Duplicate', slug: 'main', timezone: 'Asia/Kuwait', currency: 'KWD', defaultLanguage: 'en' }).expect(409);
    await request(httpServer()).get('/api/v1/auth/me').set('Cookie', 'daify_session=%ZZ').expect(401);
  });

  it('revokes all sessions after a password reset and consumes the token once', async () => {
    const forgot = await request(httpServer()).post('/api/v1/auth/forgot-password').set(unsafe()).send({ email: 'owner@example.com' }).expect(202);
    const resetToken = bodyOf<{ resetToken: string }>(forgot).resetToken;
    await request(httpServer()).post('/api/v1/auth/reset-password').set(unsafe()).send({ token: resetToken, password: 'a different secure password' }).expect(201);
    await request(httpServer()).get('/api/v1/auth/me').set('Cookie', ownerCookie).expect(401);
    await request(httpServer()).post('/api/v1/auth/reset-password').set(unsafe()).send({ token: resetToken, password: PASSWORD }).expect(401);
  });

  it('requires AAL2 and records a reason for Platform Admin access', async () => {
    await prisma.user.create({ data: { email: 'platform@example.com', displayName: 'Platform', passwordHash: await crypto.hashPassword(PASSWORD), status: 'ACTIVE', emailVerifiedAt: new Date(), platformAdmin: true, mfaSecret: MFA_SECRET } });
    await request(httpServer()).post('/api/v1/auth/login').set(unsafe()).send({ email: 'platform@example.com', password: PASSWORD }).expect(401);
    const mfaCode = currentMfaCode();
    const login = await request(httpServer()).post('/api/v1/auth/login').set(unsafe()).send({ email: 'platform@example.com', password: PASSWORD, mfaCode }).expect(200);
    const cookie = cookieFrom(login);
    await request(httpServer()).get('/api/v1/platform/organizations').set('Cookie', cookie).expect(400);
    const accessed = await request(httpServer()).get('/api/v1/platform/organizations').set('Cookie', cookie).set('x-support-reason', 'Investigating customer support case').expect(200);
    expect(bodyOf<unknown>(accessed)).toEqual(expect.arrayContaining([expect.objectContaining({ id: organizationId })]));
    await expect(prisma.securityEvent.findFirst({ where: { type: 'PLATFORM_ACCESS', reason: 'Investigating customer support case' } })).resolves.not.toBeNull();
  });
});
