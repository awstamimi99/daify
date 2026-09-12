import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppConfigService } from '../common/config/app-config.service';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CsrfOriginGuard } from './csrf-origin.guard';
import { CurrentUser } from './current-user.decorator';
import { EmailDto, LoginDto, ResetPasswordDto, SignupDto, TokenDto } from './dto/auth.dto';
import { requestMetadata } from './request-metadata';
import type { AuthenticatedUser } from './auth.types';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: AppConfigService) {}

  @Post('signup')
  @UseGuards(CsrfOriginGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  signup(@Body() dto: SignupDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.auth.signup(dto, requestMetadata(request, response));
  }

  @Post('verify-email')
  @UseGuards(CsrfOriginGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body() dto: TokenDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.auth.verifyEmail(dto.token, requestMetadata(request, response));
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(CsrfOriginGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto, requestMetadata(request, response));
    response.cookie(this.config.sessionCookieName, result.token, { httpOnly: true, secure: this.config.environment === 'production', sameSite: 'lax', path: '/', expires: result.absoluteExpiresAt });
    return { user: result.user, assuranceLevel: result.assuranceLevel };
  }

  @Post('resend-verification')
  @HttpCode(202)
  @UseGuards(CsrfOriginGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resendVerification(@Body() dto: EmailDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(AuthGuard, CsrfOriginGuard)
  async logout(@CurrentUser() user: AuthenticatedUser, @Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(user.sessionId, requestMetadata(request, response));
    response.clearCookie(this.config.sessionCookieName, { httpOnly: true, secure: this.config.environment === 'production', sameSite: 'lax', path: '/' });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Post('forgot-password')
  @HttpCode(202)
  @UseGuards(CsrfOriginGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() dto: EmailDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.auth.requestPasswordReset(dto.email, requestMetadata(request, response));
  }

  @Post('reset-password')
  @UseGuards(CsrfOriginGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.auth.resetPassword(dto, requestMetadata(request, response));
  }
}
