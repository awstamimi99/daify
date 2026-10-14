import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { BillingService } from './billing.service';
import { MyFatoorahSandboxService } from './myfatoorah-sandbox.service';
import { verifyPaymentNotification } from './billing-webhook.signature';

@Injectable()
export class BillingWebhookService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly billing: BillingService, private readonly provider: MyFatoorahSandboxService) {}

  private secret() {
    const secret = this.config.get<string>('MYFATOORAH_TEST_WEBHOOK_SECRET');
    if (!this.provider.ready() || !secret) throw new ServiceUnavailableException('Sandbox payment notifications are disabled.');
    return secret;
  }

  async receive(body: unknown, signature?: string) {
    const verified = verifyPaymentNotification(body, signature, this.secret());
    // Bind only by the signed invoice ID saved from our checkout API response.
    // Unknown invoices (including other users of the public token) grant nothing.
    const checkout = await this.prisma.billingCheckout.findUnique({ where: { providerInvoiceId: verified.invoiceId }, select: { id: true } });
    if (!checkout) return;
    await this.prisma.billingWebhookEvent.createMany({ data: [{ checkoutId: checkout.id, fingerprint: verified.fingerprint }], skipDuplicates: true });
    // Acknowledge only after durable storage. Provider I/O runs in the worker;
    // duplicates neither create work nor reset its backoff or completion marker.
  }

  async drain(now = new Date()) {
    if (!this.provider.ready() || !this.config.get('MYFATOORAH_TEST_WEBHOOK_SECRET')) return 0;
    const rows = await this.prisma.billingWebhookEvent.findMany({ where: { processedAt: null, nextAttemptAt: { lte: now } }, orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }], take: 10, include: { checkout: { select: { organizationId: true } } } });
    let processed = 0;
    for (const row of rows) {
      // Conditional claim is shared across workers. A crash leaves a two-minute
      // lease; authoritative reconciliation itself is transactionally idempotent.
      const claim = await this.prisma.billingWebhookEvent.updateMany({ where: { id: row.id, processedAt: null, attempts: row.attempts, nextAttemptAt: { lte: now } }, data: { attempts: { increment: 1 }, nextAttemptAt: new Date(now.getTime() + 120_000) } });
      if (!claim.count) continue;
      // A worker that outlives its lease must not overwrite a newer attempt.
      const claimed = { id: row.id, processedAt: null, attempts: row.attempts + 1 };
      try {
        await this.billing.reconcileInvoice(row.checkout.organizationId, row.checkoutId);
        const completed = await this.prisma.billingWebhookEvent.updateMany({ where: claimed, data: { processedAt: new Date() } });
        processed += completed.count;
      } catch {
        // Minimal inbox contains no customer/card payload. A provider outage
        // retains the event and retries with bounded exponential delay.
        const delay = Math.min(3_600_000, 60_000 * 2 ** Math.min(row.attempts, 6));
        await this.prisma.billingWebhookEvent.updateMany({ where: claimed, data: { nextAttemptAt: new Date(Date.now() + delay) } });
      }
    }
    return processed;
  }
}
