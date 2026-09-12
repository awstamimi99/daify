import { Body, Controller, Get, Header, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';
import { CsrfOriginGuard } from './csrf-origin.guard';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedUser } from './auth.types';
import { MfaConfirmDto, MfaSetupDto } from './dto/auth.dto';
import { MfaService } from './mfa.service';
import { AppConfigService } from '../common/config/app-config.service';
import { requestMetadata } from './request-metadata';

@Controller({ path: 'auth/mfa', version: '1' })
@UseGuards(AuthGuard, CsrfOriginGuard)
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class MfaController {
  constructor(private readonly mfa: MfaService, private readonly config: AppConfigService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  status(@CurrentUser() user: AuthenticatedUser) { return this.mfa.status(user.id); }

  @Post('setup')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  setup(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaSetupDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.mfa.setup(user, dto, requestMetadata(request, response));
  }

  @Post('confirm')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async confirm(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaConfirmDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.mfa.confirm(user, dto, requestMetadata(request, response));
    response.cookie(this.config.sessionCookieName, result.token, { httpOnly: true, secure: this.config.environment === 'production', sameSite: 'lax', path: '/', expires: result.absoluteExpiresAt });
    return { enabled: result.enabled, recoveryCodes: result.recoveryCodes };
  }
}
