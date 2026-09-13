import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
@Injectable()
export class PublicationOutbox implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer?: NodeJS.Timeout;
  private busy = false;
  private readonly logger = new Logger(PublicationOutbox.name);
  constructor(private readonly prisma: PrismaService) {}
  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => { if (!this.busy) { this.busy = true; void this.drain().catch(() => this.logger.error('Publication delivery failed; retrying.')).finally(() => { this.busy = false; }); } }, 1000); this.timer.unref();
  }
  onApplicationShutdown() { if (this.timer) clearInterval(this.timer); }
  async drain() {
    return this.prisma.$transaction(async tx => {
      const events = await tx.$queryRaw<{ id: string; menuId: string; kind: string }[]>`SELECT id, "menuId", kind FROM publication_events WHERE "processedAt" IS NULL ORDER BY "createdAt" LIMIT 50 FOR UPDATE SKIP LOCKED`;
      for (const event of events) {
        // NOTIFY is delivered only on commit, with the durable event id for consumer deduplication.
        await tx.$queryRaw`SELECT pg_notify('daify_menu_publications', ${JSON.stringify(event)})::text`;
        await tx.publicationEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
      }
      return events.length;
    });
  }
}
