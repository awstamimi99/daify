import { PlatformPermission, requirePlatform } from '../platform/staff-policy';
import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CsrfOriginGuard } from '../auth/csrf-origin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { requestMetadata } from '../auth/request-metadata';
import { PlatformAdminGuard } from '../platform/platform-admin.guard';
import { BillingPlanChoiceDto, CheckoutDto, OverrideDto, PlanAvailabilityDto, PlanDto } from './billing.dto';
import { BillingService } from './billing.service';

@Controller({ path: 'organizations/:organizationId/billing', version: '1' })
@UseGuards(AuthGuard, CsrfOriginGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}
  @Get() @Header('Cache-Control', 'private, no-store')
  state(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.billing.state(user, id); }
  @Post('trial')
  trial(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: BillingPlanChoiceDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.billing.enroll(user, id, dto.planId, requestMetadata(req, res)); }
  @Post('cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.billing.cancel(user, id, requestMetadata(req, res)); }
  @Post('checkout') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  checkout(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: CheckoutDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.billing.checkout(user, id, dto, requestMetadata(req, res)); }
  @Post('checkouts/:checkoutId/reconcile') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  reconcile(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string, @Param('checkoutId', new ParseUUIDPipe({ version: '4' })) checkoutId: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.billing.reconcile(user, id, checkoutId, requestMetadata(req, res)); }
}

@Controller({ path: 'platform/billing', version: '1' })
@UseGuards(AuthGuard, PlatformAdminGuard, CsrfOriginGuard)
export class BillingAdminController {
  constructor(private readonly billing: BillingService) {}
  @Post('plans')
  plan(@CurrentUser() user: AuthenticatedUser, @Body() dto: PlanDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.billing.createPlan(user, dto, requestMetadata(req, res)); }
  @Patch('plans/:planId')
  availability(@CurrentUser() user: AuthenticatedUser, @Param('planId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: PlanAvailabilityDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.billing.planAvailability(user, id, dto.active, dto.reason, requestMetadata(req, res)); }
  @PlatformPermission('billing.manage') @Post('organizations/:organizationId/override')
  override(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: OverrideDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { requirePlatform(user, 'billing.manage', id); return this.billing.override(user, id, dto, requestMetadata(req, res)); }
}
