import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';
import { CsrfOriginGuard } from './csrf-origin.guard';
import { EmailDeliveryService } from './email-delivery.service';
import { TotpService } from './totp.service';
import { AppConfigService } from '../common/config/app-config.service';
import { MfaController } from './mfa.controller';
import { MfaService } from './mfa.service';
import { MfaSecretsService } from './mfa-secrets.service';
import { SecurityNotificationsService } from './security-notifications.service';

@Global()
@Module({
  controllers: [AuthController, MfaController],
  providers: [AppConfigService, AuthService, CryptoService, EmailDeliveryService, TotpService, AuthGuard, CsrfOriginGuard, MfaService, MfaSecretsService, SecurityNotificationsService],
  exports: [AppConfigService, AuthService, CryptoService, EmailDeliveryService, TotpService, AuthGuard, CsrfOriginGuard],
})
export class AuthModule {}
