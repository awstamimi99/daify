import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BillingWebhookService } from './billing-webhook.service';

@Controller({ path: 'billing/myfatoorah/webhook', version: '1' })
export class BillingWebhookController {
  constructor(private readonly webhook: BillingWebhookService) {}
  // Provider authentication replaces browser session/Origin on this exact route.
  // Sandbox configuration refuses production; live ingress is not enabled.
  @Post() @HttpCode(204) @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async receive(@Body() body: unknown, @Headers('myfatoorah-signature') signature?: string) {
    await this.webhook.receive(body, signature);
  }
}
