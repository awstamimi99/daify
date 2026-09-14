import { Global, Module } from '@nestjs/common';
import { BillingController, BillingAdminController } from './billing.controller';
import { BillingService } from './billing.service';
import { EntitlementsService } from './entitlements.service';
import { MyFatoorahSandboxService } from './myfatoorah-sandbox.service';
import { BillingReconciler } from './billing-reconciler.service';

@Global()
@Module({ controllers: [BillingController, BillingAdminController], providers: [BillingService, EntitlementsService, MyFatoorahSandboxService, BillingReconciler], exports: [EntitlementsService] })
export class BillingModule {}
