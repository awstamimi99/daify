import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';
import { CsrfOriginGuard } from './csrf-origin.guard';
import { EmailDeliveryService } from './email-delivery.service';
import { TotpService } from './totp.service';
import { AppConfigService } from '../common/config/app-config.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AppConfigService, AuthService, CryptoService, EmailDeliveryService, TotpService, AuthGuard, CsrfOriginGuard],
  exports: [AppConfigService, AuthService, CryptoService, EmailDeliveryService, TotpService, AuthGuard, CsrfOriginGuard],
})
export class AuthModule {}
