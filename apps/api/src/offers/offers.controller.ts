import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CsrfOriginGuard } from '../auth/csrf-origin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { requestMetadata } from '../auth/request-metadata';
import { PlatformAdminGuard } from '../platform/platform-admin.guard';
import { PlatformPermission } from '../platform/staff-policy';
import { DirectoryQuery } from '../platform/platform.dto';
import { AllowanceDto, CouponAcceptDto, CouponDto, CouponReviewDto, OfferReasonDto, QuoteAcceptDto, QuoteDecisionDto, QuoteDto, QuoteUpdateDto } from './offers.dto';
import { OffersService } from './offers.service';
const uuid = () => new ParseUUIDPipe({ version: '4' });
@Controller({ path: 'platform/offers', version: '1' })
@UseGuards(AuthGuard, PlatformAdminGuard, CsrfOriginGuard)
export class PlatformOffersController {
  constructor(private readonly offers: OffersService) {}
  @Header('Cache-Control', 'private, no-store') @Get() @PlatformPermission('offers.read')
  list(@CurrentUser() u: AuthenticatedUser, @Headers('x-support-reason') reason: string | undefined, @Query() query: DirectoryQuery, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.offers.directory(u, reason, query, requestMetadata(req, res)); }
  @Header('Cache-Control', 'private, no-store') @Post('coupons') @PlatformPermission('offers.create')
  createCoupon(@CurrentUser() u: AuthenticatedUser, @Body() dto: CouponDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.offers.createCoupon(u, dto, requestMetadata(req, res)); }
  @Header('Cache-Control', 'private, no-store') @Post('coupons/:id/revoke') @PlatformPermission('offers.create')
  revokeCoupon(@CurrentUser() u: AuthenticatedUser, @Param('id', uuid()) id: string, @Body() dto: OfferReasonDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.offers.revokeCoupon(u, id, dto, requestMetadata(req, res)); }
  @Header('Cache-Control', 'private, no-store') @Patch('allowances/:id') @PlatformPermission('discounts.manage')
  allowance(@CurrentUser() u: AuthenticatedUser, @Param('id', uuid()) id: string, @Body() dto: AllowanceDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.offers.setAllowance(u, id, dto, requestMetadata(req, res)); }
  @Header('Cache-Control', 'private, no-store') @Post('quotes') @PlatformPermission('offers.create')
  createQuote(@CurrentUser() u: AuthenticatedUser, @Body() dto: QuoteDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.offers.createQuote(u, dto, requestMetadata(req, res)); }
  @Header('Cache-Control', 'private, no-store') @Patch('quotes/:id') @PlatformPermission('offers.create')
  reviseQuote(@CurrentUser() u: AuthenticatedUser, @Param('id', uuid()) id: string, @Body() dto: QuoteUpdateDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.offers.updateQuote(u, id, dto, requestMetadata(req, res)); }
  @Header('Cache-Control', 'private, no-store') @Post('quotes/:id/decision') @PlatformPermission('offers.read')
  decideQuote(@CurrentUser() u: AuthenticatedUser, @Param('id', uuid()) id: string, @Body() dto: QuoteDecisionDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.offers.decideQuote(u, id, dto, requestMetadata(req, res)); }
}
@Controller({ path: 'organizations/:organizationId/offers', version: '1' })
@UseGuards(AuthGuard, CsrfOriginGuard)
export class CustomerOffersController {
  constructor(private readonly offers: OffersService) {}
  @Header('Cache-Control', 'private, no-store') @Get()
  state(@CurrentUser() u: AuthenticatedUser, @Param('organizationId', uuid()) org: string) { return this.offers.customerOffers(u, org); }
  @Header('Cache-Control', 'private, no-store') @Post('coupon-review')
  review(@CurrentUser() u: AuthenticatedUser, @Param('organizationId', uuid()) org: string, @Body() dto: CouponReviewDto) { return this.offers.reviewCoupon(u, org, dto); }
  @Header('Cache-Control', 'private, no-store') @Post('coupon-accept')
  coupon(@CurrentUser() u: AuthenticatedUser, @Param('organizationId', uuid()) org: string, @Body() dto: CouponAcceptDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.offers.acceptCoupon(u, org, dto, requestMetadata(req, res)); }
  @Header('Cache-Control', 'private, no-store') @Post('quotes/:id/accept')
  quote(@CurrentUser() u: AuthenticatedUser, @Param('organizationId', uuid()) org: string, @Param('id', uuid()) id: string, @Body() dto: QuoteAcceptDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.offers.acceptQuote(u, org, id, dto, requestMetadata(req, res)); }
}
