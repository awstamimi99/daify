import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PostgresThrottlerStorage implements ThrottlerStorage, OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly logger = new Logger(PostgresThrottlerStorage.name);
  constructor(private readonly prisma: PrismaService) {}
  onModuleInit() {
    this.timer = setInterval(() => { void this.cleanup().catch(() => this.logger.error('Rate-limit cleanup failed.')); }, 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { clearInterval(this.timer); }
  async cleanup() {
    await this.prisma.$executeRaw`DELETE FROM rate_limit_buckets WHERE key IN (SELECT key FROM rate_limit_buckets WHERE expires_at < NOW() AND blocked_until < NOW() LIMIT 1000)`;
  }
  async increment(key: string, ttl: number, limit: number, blockDuration: number) {
    // One statement serializes concurrent claims across API instances. Blocked
    // attempts neither extend the block nor increment the counter indefinitely.
    const [record] = await this.prisma.$queryRaw<Array<{ hits: number; expires: number; blocked: number }>>`
      INSERT INTO rate_limit_buckets (key, hits, expires_at, blocked_until)
      VALUES (${key}, 1, NOW() + ${ttl} * INTERVAL '1 millisecond', TO_TIMESTAMP(0))
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE WHEN rate_limit_buckets.blocked_until > NOW() THEN rate_limit_buckets.hits
          WHEN rate_limit_buckets.expires_at <= NOW() THEN 1 ELSE rate_limit_buckets.hits + 1 END,
        expires_at = CASE WHEN rate_limit_buckets.blocked_until <= NOW() AND rate_limit_buckets.expires_at <= NOW()
          THEN NOW() + ${ttl} * INTERVAL '1 millisecond' ELSE rate_limit_buckets.expires_at END,
        blocked_until = CASE WHEN rate_limit_buckets.blocked_until > NOW() THEN rate_limit_buckets.blocked_until
          WHEN rate_limit_buckets.expires_at > NOW() AND rate_limit_buckets.hits >= ${limit}
          THEN NOW() + ${blockDuration} * INTERVAL '1 millisecond' ELSE TO_TIMESTAMP(0) END
      RETURNING hits, GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - NOW()))))::int AS expires,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (blocked_until - NOW()))))::int AS blocked`;
    return { totalHits: record!.hits, timeToExpire: record!.expires, isBlocked: record!.blocked > 0, timeToBlockExpire: record!.blocked };
  }
}
