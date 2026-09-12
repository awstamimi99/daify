import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { EmailDeliveryService } from './email-delivery.service';

@Injectable()
export class SecurityNotificationsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  private readonly logger = new Logger(SecurityNotificationsService.name);
  constructor(private readonly prisma: PrismaService, private readonly email: EmailDeliveryService, private readonly config: ConfigService) {}
  onModuleInit() {
    if (this.config.get('NODE_ENV') === 'test') return;
    this.timer = setInterval(() => {
      if (!this.running) this.running = this.drain().catch(() => this.logger.error('Security notification worker failed.')).finally(() => { this.running = undefined; });
    }, 5_000);
    this.timer.unref();
  }
  async onModuleDestroy() { clearInterval(this.timer); await this.running; }
  private async drain() { for (let i = 0; i < 10; i++) if (!await this.deliverNext()) break; }

  async deliverNext(): Promise<boolean> {
    // Lease and claim are atomic; delivery is outside the database transaction.
    // Stable message IDs help deduplication, but SMTP is at-least-once delivery.
    const [job] = await this.prisma.$queryRaw<Array<{ id: string; userId: string; kind: string; attempts: number; createdAt: Date }>>`
      UPDATE security_notifications SET attempts = attempts + 1, "lockedUntil" = NOW() + INTERVAL '60 seconds'
      WHERE id = (SELECT id FROM security_notifications
        WHERE "sentAt" IS NULL AND "failedAt" IS NULL AND "nextAttemptAt" <= NOW()
          AND ("lockedUntil" IS NULL OR "lockedUntil" <= NOW())
        ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING id, "userId", kind, attempts, "createdAt"`;
    if (!job) return false;
    const where = { id: job.id, attempts: job.attempts, sentAt: null };
    if (job.attempts > 5) {
      await this.prisma.securityNotification.updateMany({ where, data: { failedAt: new Date(), lockedUntil: null } });
      this.logger.error({ event: 'security-notification.exhausted', notificationId: job.id });
      return true;
    }
    try {
      const user = await this.prisma.user.findUnique({ where: { id: job.userId }, select: { email: true } });
      if (!user) return true; // Cascaded deletion also removes the job.
      await this.email.sendSecurityNotification(user.email, job.kind, job.createdAt, job.id);
      await this.prisma.securityNotification.updateMany({ where, data: { sentAt: new Date(), lockedUntil: null } });
    } catch {
      await this.prisma.securityNotification.updateMany({ where, data: {
        lockedUntil: null, nextAttemptAt: new Date(Date.now() + 30_000 * 2 ** (job.attempts - 1)),
        failedAt: job.attempts >= 5 ? new Date() : null,
      } });
      this.logger.error({ event: job.attempts >= 5 ? 'security-notification.exhausted' : 'security-notification.retry', notificationId: job.id });
    }
    return true;
  }
}
