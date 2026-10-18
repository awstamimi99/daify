import { PlatformOffersController, CustomerOffersController } from '../offers/offers.controller';
import { OffersService } from '../offers/offers.service';
import { Global, Module } from '@nestjs/common';
import { BillingController, BillingAdminController } from './billing.controller';
import { BillingService } from './billing.service';
import { EntitlementsService } from './entitlements.service';
import { MyFatoorahSandboxService } from './myfatoorah-sandbox.service';
import { BillingReconciler } from './billing-reconciler.service';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingWebhookService } from './billing-webhook.service';

@Global()
@Module({ controllers: [PlatformOffersController, CustomerOffersController, BillingController, BillingAdminController, BillingWebhookController], providers: [OffersService, BillingService, EntitlementsService, MyFatoorahSandboxService, BillingReconciler, BillingWebhookService], exports: [EntitlementsService] })
export class BillingModule {}
