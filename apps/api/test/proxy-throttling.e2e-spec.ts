import { createHmac, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { PostgresThrottlerStorage } from '../src/common/postgres-throttler.storage';

const key = Buffer.alloc(32, 8).toString('base64');
const path = '/api/v1/auth/login';
function proof(ip: string, timestamp = String(Date.now()), target = path) {
  return { 'x-daify-client-ip': ip, 'x-daify-client-time': timestamp, 'x-daify-client-signature': createHmac('sha256', Buffer.from(key, 'base64')).update([timestamp, 'POST', target, ip].join('\n')).digest('hex') };
}
describe('Trusted client identity and shared throttling', () => {
  let first: INestApplication; let second: INestApplication; let prisma: PrismaService;
  const oldKey = process.env.PROXY_SIGNING_KEY;
  const post = (app = first) => request(app.getHttpServer() as Server).post(path).set('Origin', 'http://localhost:3000');
  beforeAll(async () => {
    process.env.PROXY_SIGNING_KEY = key;
    first = await createApp(); second = await createApp(); await first.listen(0, '127.0.0.1'); await second.listen(0, '127.0.0.1'); prisma = first.get(PrismaService);
  });
  beforeEach(async () => { await prisma.rateLimitBucket.deleteMany(); });
  afterAll(async () => { await first.close(); await second.close(); if (oldKey) process.env.PROXY_SIGNING_KEY = oldKey; else delete process.env.PROXY_SIGNING_KEY; });

  it('isolates clients behind one proxy, shares limits across instances and supplies Retry-After', async () => {
    const results = await Promise.all(Array.from({ length: 12 }, (_, index) => post(index % 2 ? first : second).set(proof('192.0.2.20')).send({})));
    expect(results.filter(result => result.status === 400)).toHaveLength(5);
    expect(results.filter(result => result.status === 429)).toHaveLength(7);
    expect(Number(results.find(result => result.status === 429)!.headers['retry-after'])).toBeGreaterThan(0);
    await post(second).set(proof('192.0.2.21')).send({}).expect(400);
  });
  it('rejects tampering, old proof, wrong target and malformed addresses', async () => {
    await post().set({ ...proof('192.0.2.20'), 'x-daify-client-ip': '192.0.2.21' }).send({}).expect(403);
    await post().set(proof('192.0.2.20', String(Date.now() - 60_000))).send({}).expect(403);
    await post().set(proof('192.0.2.20', undefined, '/api/v1/auth/signup')).send({}).expect(403);
    await post().set(proof('not-an-ip')).send({}).expect(403);
    expect(await prisma.rateLimitBucket.count()).toBe(0);
  });
  it('does not trust changing forwarding headers on unsigned direct requests', async () => {
    for (let i = 0; i < 5; i++) await post().set('X-Forwarded-For', `198.51.100.${i}`).set('CF-Connecting-IP', `198.51.100.${i}`).send({}).expect(400);
    await post().set('X-Forwarded-For', '203.0.113.123').send({}).expect(429);
  });
  it('resets expired counters and cleans only expired buckets', async () => {
    const storage = new PostgresThrottlerStorage(prisma); const id = randomUUID();
    expect((await storage.increment(id, 60_000, 1, 60_000)).isBlocked).toBe(false);
    expect((await storage.increment(id, 60_000, 1, 60_000)).isBlocked).toBe(true);
    await prisma.rateLimitBucket.update({ where: { key: id }, data: { expiresAt: new Date(0), blockedUntil: new Date(0) } });
    expect((await storage.increment(id, 60_000, 1, 60_000)).totalHits).toBe(1);
    await prisma.rateLimitBucket.create({ data: { key: 'expired', hits: 1, expiresAt: new Date(0), blockedUntil: new Date(0) } });
    await storage.cleanup();
    expect(await prisma.rateLimitBucket.findUnique({ where: { key: 'expired' } })).toBeNull();
    expect(await prisma.rateLimitBucket.findUnique({ where: { key: id } })).not.toBeNull();
  });
});
