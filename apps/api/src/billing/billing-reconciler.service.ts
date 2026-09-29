import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { BillingService } from './billing.service';
import { MyFatoorahSandboxService } from './myfatoorah-sandbox.service';
import { BillingWebhookService } from './billing-webhook.service';

@Injectable()
export class BillingReconciler implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<number>;
  private readonly logger = new Logger(BillingReconciler.name);
  constructor(private readonly prisma: PrismaService, private readonly billing: BillingService, private readonly provider: MyFatoorahSandboxService, private readonly config: ConfigService, private readonly webhook: BillingWebhookService) {}
  onModuleInit() {
    if (this.config.get('NODE_ENV') === 'test' || !this.provider.ready()) return;
    this.timer = setInterval(() => { void this.drain().catch(() => this.logger.warn('Sandbox reconciliation will retry.')); }, 60_000);
    this.timer.unref();
  }
  async onModuleDestroy() { clearInterval(this.timer); await this.running; }
  drain(): Promise<number> {
    if (this.running) return this.running;
    this.running = this.process().finally(() => { this.running = undefined; });
    return this.running;
  }
  private async process() {
    if (!this.provider.ready()) return 0;
    await this.webhook.drain();
    const rows = await this.prisma.billingCheckout.findMany({ where: { state: { in: ['CREATING', 'UNKNOWN', 'READY'] }, updatedAt: { lt: new Date(Date.now() - 60_000) } }, orderBy: { updatedAt: 'asc' }, take: 10 });
    let count = 0;
    for (const row of rows) {
      try { await this.billing.reconcileInvoice(row.organizationId, row.id); count++; }
      catch { this.logger.warn({ event: 'sandbox-payment.retry', checkoutId: row.id }); }
      // Rotate even unresolved invoices so one outage cannot starve later rows.
      await this.prisma.billingCheckout.update({ where: { id: row.id }, data: { updatedAt: new Date() } });
    }
    return count;
  }
}
