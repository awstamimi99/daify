import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/database/prisma.service';
import { SecurityNotificationsService } from '../src/auth/security-notifications.service';
import type { EmailDeliveryService } from '../src/auth/email-delivery.service';

describe('Durable security alerts', () => {
  const prisma = new PrismaService(new ConfigService(process.env));
  const send = jest.fn<Promise<void>, unknown[]>();
  const worker = new SecurityNotificationsService(prisma, { sendSecurityNotification: send } as unknown as EmailDeliveryService, new ConfigService({ NODE_ENV: 'test' }));
  let userId: string;
  beforeEach(async () => {
    // This suite uses the explicitly disposable integration database.
    await prisma.securityNotification.deleteMany(); send.mockReset(); send.mockResolvedValue(undefined);
    userId = (await prisma.user.create({ data: { email: `alerts-${randomUUID()}@example.com`, passwordHash: 'unused-test-hash' } })).id;
  });
  afterEach(async () => { await prisma.user.delete({ where: { id: userId } }); });
  afterAll(async () => { await prisma.$disconnect(); });
  it('keeps SQL and application timestamps on UTC even on a non-UTC server', async () => {
    const [row] = await prisma.$queryRaw<Array<{ timezone: string; now: Date }>>`SELECT current_setting('TimeZone') AS timezone, NOW() AS now`;
    expect(row!.timezone).toBe('UTC');
    expect(Math.abs(row!.now.getTime() - Date.now())).toBeLessThan(5000);
  });
  it('claims an alert once across concurrent workers and marks delivery', async () => {
    const job = await prisma.securityNotification.create({ data: { userId, kind: 'MFA_ENABLED' } });
    expect((await Promise.all([worker.deliverNext(), worker.deliverNext()])).filter(Boolean)).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect((await prisma.securityNotification.findUniqueOrThrow({ where: { id: job.id } })).sentAt).not.toBeNull();
  });
  it('persists retry state, waits for retry time and recovers a failed send', async () => {
    const job = await prisma.securityNotification.create({ data: { userId, kind: 'MFA_RECOVERY_USED' } });
    send.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await worker.deliverNext();
    const retry = await prisma.securityNotification.findUniqueOrThrow({ where: { id: job.id } });
    expect(retry.sentAt).toBeNull(); expect(retry.failedAt).toBeNull(); expect(retry.attempts).toBe(1);
    expect(await worker.deliverNext()).toBe(false);
    await prisma.securityNotification.update({ where: { id: job.id }, data: { nextAttemptAt: new Date(0) } });
    await worker.deliverNext();
    expect((await prisma.securityNotification.findUniqueOrThrow({ where: { id: job.id } })).sentAt).not.toBeNull();
  });
  it('recovers expired leases and stops retrying after five failed deliveries', async () => {
    const job = await prisma.securityNotification.create({ data: { userId, kind: 'MFA_ENABLED', lockedUntil: new Date(0), attempts: 4 } });
    send.mockRejectedValue(new Error('SMTP unavailable')); await worker.deliverNext();
    const exhausted = await prisma.securityNotification.findUniqueOrThrow({ where: { id: job.id } });
    expect(exhausted.failedAt).not.toBeNull(); expect(exhausted.lockedUntil).toBeNull();
    expect(await worker.deliverNext()).toBe(false);
  });
});
