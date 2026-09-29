import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsWorker implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue;
  private worker?: Worker;
  private timer?: ReturnType<typeof setInterval>;
  private scheduling?: Promise<void>;
  private readonly logger = new Logger(AnalyticsWorker.name);
  constructor(private readonly config: ConfigService, private readonly analytics: AnalyticsService) {}
  onModuleInit() {
    const address = this.config.get<string>('ANALYTICS_REDIS_URL');
    if (!this.analytics.enabled() || !address) return;
    const url = new URL(address);
    const connection = { host: url.hostname, port: Number(url.port || 6379), username: url.username ? decodeURIComponent(url.username) : undefined, password: url.password ? decodeURIComponent(url.password) : undefined, db: Number(url.pathname.slice(1) || 0), ...(url.protocol === 'rediss:' ? { tls: {} } : {}) };
    this.queue = new Queue('daify-analytics', { connection: { ...connection, maxRetriesPerRequest: 1, enableOfflineQueue: false }, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 100, removeOnFail: 100 } });
    this.worker = new Worker('daify-analytics', async () => {
      let count = 0;
      for (let i = 0; i < 10; i++) { const batch = await this.analytics.aggregate(); count += batch; if (batch < 250) break; }
      this.logger.log({ event: 'analytics.aggregated', count });
      return count;
    }, { connection: { ...connection, maxRetriesPerRequest: null }, concurrency: 1 });
    this.queue.on('error', () => this.logger.warn({ event: 'analytics.queue.unavailable' }));
    this.worker.on('error', () => this.logger.warn({ event: 'analytics.worker.unavailable' }));
    this.worker.on('failed', job => this.logger.warn({ event: 'analytics.retry', jobId: job?.id, attempts: job?.attemptsMade }));
    const schedule = () => {
      if (this.scheduling) return;
      this.scheduling = this.queue!.add('aggregate', {}, { jobId: `aggregate-${Math.floor(Date.now() / 60000)}` }).then(() => undefined).catch(() => { this.logger.warn({ event: 'analytics.schedule.retry' }); }).finally(() => { this.scheduling = undefined; });
    };
    schedule(); this.timer = setInterval(schedule, 60_000); this.timer.unref();
  }
  async onModuleDestroy() { clearInterval(this.timer); await this.scheduling; await this.worker?.close(); await this.queue?.close(); }
}
