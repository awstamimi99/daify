import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import type request from 'supertest';
import { contractRequest } from './support/contract-request';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { CryptoService } from '../src/auth/crypto.service';
import { promotePlatformAdmin } from '../src/platform/promote-platform-admin';

const password = 'correct horse battery staple';
const origin = { Origin: 'http://localhost:3000' };
function code(secret: string, offset = 0) {
  const bits = [...secret].map(char => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char).toString(2).padStart(5, '0')).join('');
  const key = Buffer.from(bits.match(/.{8}/g)!.map(byte => Number.parseInt(byte, 2)));
  const input = Buffer.alloc(8); input.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000) + offset));
  const digest = createHmac('sha1', key).update(input).digest();
  const start = digest[digest.length - 1]! & 15;
  return ((digest.readUInt32BE(start) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}
const body = <T>(response: request.Response) => response.body as T;
function cookie(response: request.Response) { return String(response.headers['set-cookie']!.at(-1)).split(';')[0]!; }

describe('Recoverable MFA', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let crypto: CryptoService;
  let userId: string;
  let email: string;
  let sessionCookie: string;
  const http = () => app.getHttpServer() as Server;
  const post = (path: string, session = sessionCookie) => contractRequest(http()).post(`/api/v1/${path}`).set(origin).set('Cookie', session);
  async function session() {
    const token = crypto.opaqueToken();
    await prisma.session.create({ data: { userId, tokenHash: crypto.tokenHash(token), expiresAt: new Date(Date.now() + 3_600_000), absoluteExpiresAt: new Date(Date.now() + 3_600_000) } });
    return `daify_session=${token}`;
  }
  async function enroll() {
    const setup = await post('auth/mfa/setup').send({ password }).expect(200);
    const secret = body<{ secret: string }>(setup).secret;
    const confirmedCode = code(secret);
    const confirmed = await post('auth/mfa/confirm').send({ password, code: confirmedCode }).expect(200);
    expect(await prisma.securityNotification.count({ where: { userId, kind: 'MFA_ENABLED', sentAt: null } })).toBeGreaterThan(0);
    const previousCookie = sessionCookie; sessionCookie = cookie(confirmed);
    return { secret, confirmedCode, previousCookie, codes: body<{ recoveryCodes: string[] }>(confirmed).recoveryCodes };
  }
  beforeEach(async () => {
    app = await createApp(); await app.init(); prisma = app.get(PrismaService); crypto = app.get(CryptoService);
    await prisma.rateLimitBucket.deleteMany();
    email = `mfa-${randomUUID()}@example.com`;
    const user = await prisma.user.create({ data: { email, displayName: 'MFA reviewer', passwordHash: await crypto.hashPassword(password), status: 'ACTIVE', emailVerifiedAt: new Date() } });
    userId = user.id; sessionCookie = await session();
  });
  afterEach(async () => { await prisma.securityEvent.deleteMany({ where: { actorUserId: userId } }); await prisma.user.delete({ where: { id: userId } }); await app.close(); });

  it('requires a current session, allowed origin, and password before revealing setup', async () => {
    await contractRequest(http()).get('/api/v1/auth/mfa').expect(401);
    await contractRequest(http()).post('/api/v1/auth/mfa/setup').set('Cookie', sessionCookie).send({ password }).expect(403);
    await post('auth/mfa/setup').send({ password: 'wrong' }).expect(401);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.mfaPendingSecret).toBeNull();
  });

  it('binds expiring encrypted setup to its originating session', async () => {
    const setup = await post('auth/mfa/setup').send({ password }).expect(200);
    const secret = body<{ secret: string }>(setup).secret;
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.mfaPendingSecret).toMatch(/^v1\./); expect(user.mfaPendingSecret).not.toContain(secret);
    expect(user.mfaSecret).toBeNull();
    await post('auth/mfa/confirm', await session()).send({ password, code: code(secret) }).expect(401);
    await prisma.user.update({ where: { id: userId }, data: { mfaPendingExpiresAt: new Date(0) } });
    await post('auth/mfa/confirm').send({ password, code: code(secret) }).expect(401);
  });

  it('enforces MFA after confirmation, rotates sessions, and consumes a TOTP only once', async () => {
    const { secret, confirmedCode, previousCookie, codes } = await enroll();
    expect(codes).toHaveLength(10); expect(new Set(codes).size).toBe(10);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.mfaRecoveryHashes).toHaveLength(10);
    expect(JSON.stringify(user)).not.toContain(codes[0]); expect(user.platformAdmin).toBe(false);
    await contractRequest(http()).get('/api/v1/auth/me').set('Cookie', previousCookie).expect(401);
    await post('auth/login').send({ email, password }).expect(401);
    await post('auth/login').send({ email, password, mfaCode: confirmedCode }).expect(401);
    const nextCode = code(secret, 1);
    const results = await Promise.all([0, 1].map(() => post('auth/login').send({ email, password, mfaCode: nextCode })));
    expect(results.map(value => value.status).sort()).toEqual([200, 401]);
    await post('auth/mfa/confirm').send({ password, code: nextCode }).expect(401);
  });

  it('allows only one concurrent recovery login and retains the enrolled authenticator', async () => {
    const { codes } = await enroll();
    await post('auth/login').send({ email, password: 'wrong', recoveryCode: codes[0] }).expect(401);
    const results = await Promise.all([0, 1].map(() => post('auth/login').send({ email, password, recoveryCode: codes[0] })));
    expect(results.map(value => value.status).sort()).toEqual([200, 401]);
    const success = results.find(value => value.status === 200)!;
    expect(body<{ assuranceLevel: string }>(success).assuranceLevel).toBe('AAL2');
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.mfaSecret).not.toBeNull(); expect(user.mfaRecoveryHashes).toHaveLength(9);
    await contractRequest(http()).get('/api/v1/auth/me').set('Cookie', sessionCookie).expect(401);
    expect(await prisma.securityEvent.count({ where: { actorUserId: userId, type: 'MFA_RECOVERY_USED' } })).toBe(1);
  });

  it('requires the old factor for replacement and invalidates old recovery codes on confirmation', async () => {
    const original = await enroll();
    await post('auth/mfa/setup').send({ password }).expect(401);
    const replacement = await post('auth/mfa/setup').send({ password, recoveryCode: original.codes[0] }).expect(200);
    const secret = body<{ secret: string }>(replacement).secret;
    const confirmed = await post('auth/mfa/confirm').send({ password, code: code(secret) }).expect(200);
    await post('auth/login').send({ email, password, recoveryCode: original.codes[1] }).expect(401);
    const newCodes = body<{ recoveryCodes: string[] }>(confirmed).recoveryCodes;
    await post('auth/login').send({ email, password, recoveryCode: newCodes[0] }).expect(200);
  });

  it('preserves MFA and cancels pending enrollment after password reset', async () => {
    const original = await enroll();
    await post('auth/mfa/setup').send({ password, recoveryCode: original.codes[0] }).expect(200);
    const forgot = await post('auth/forgot-password').send({ email }).expect(202);
    const replacementPassword = 'a different password for recovery';
    await post('auth/reset-password').send({ token: body<{ resetToken: string }>(forgot).resetToken, password: replacementPassword }).expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.mfaPendingSecret).toBeNull(); expect(user.mfaSecret).not.toBeNull();
    await post('auth/login').send({ email, password: replacementPassword }).expect(401);
    await post('auth/login').send({ email, password: replacementPassword, recoveryCode: original.codes[1] }).expect(200);
  });

  it('permits operator promotion only after recoverable MFA and revokes prior sessions', async () => {
    await expect(promotePlatformAdmin(prisma, email)).rejects.toThrow('confirmed encrypted MFA');
    const { codes } = await enroll();
    await promotePlatformAdmin(prisma, email);
    await contractRequest(http()).get('/api/v1/auth/me').set('Cookie', sessionCookie).expect(401);
    const login = await post('auth/login').send({ email, password, recoveryCode: codes[0] }).expect(200);
    await contractRequest(http()).get('/api/v1/platform/organizations').set('Cookie', cookie(login)).set('x-support-reason', 'Testing recoverable administrator access').expect(200);
    const event = await prisma.securityEvent.findFirst({ where: { targetId: userId, reason: 'platform-admin.granted by operator CLI' } });
    expect(event).not.toBeNull();
  });
});
