import { Body, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CsrfOriginGuard } from '../auth/csrf-origin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PublicParams } from '../menus/dto/publishing.dto';
import { AnalyticsEventDto, AnalyticsQuery } from './analytics.dto';
import { AnalyticsService } from './analytics.service';

@Controller({ path: 'public/menus/:slug/events', version: '1' })
@UseGuards(CsrfOriginGuard)
export class AnalyticsIngestController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Post() @HttpCode(204) @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async receive(@Param() params: PublicParams, @Body() dto: AnalyticsEventDto, @Req() request: Request) { await this.analytics.receive(params.slug, dto, request); }
}
@Controller({ path: 'organizations/:organizationId/analytics', version: '1' })
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get() @Header('Cache-Control', 'private, no-store')
  report(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string, @Query() query: AnalyticsQuery) { return this.analytics.report(user.id, organizationId, query); }
}
