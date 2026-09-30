import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CsrfOriginGuard } from '../auth/csrf-origin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { requestMetadata } from '../auth/request-metadata';
import { PlatformAdminGuard } from '../platform/platform-admin.guard';
import { DirectoryQuery } from '../platform/platform.dto';
import { SupportCreateDto, SupportQuery, SupportReplyDto, SupportStatusDto } from './support.dto';
import { SupportService } from './support.service';

@Controller({ path: 'organizations/:organizationId/support', version: '1' })
@UseGuards(AuthGuard, CsrfOriginGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}
  @Get() @Header('Cache-Control', 'private, no-store')
  list(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string, @Query() query: SupportQuery, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.support.list(user, { organizationId }, query, requestMetadata(req, res)); }
  @Post() @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string, @Body() dto: SupportCreateDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.support.create(user, organizationId, dto, requestMetadata(req, res)); }
  @Get('notifications') @Header('Cache-Control', 'private, no-store')
  notifications(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string, @Query() query: DirectoryQuery) { return this.support.notifications(user, organizationId, query); }
  @Patch('notifications/:id/read')
  read(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.support.markRead(user, organizationId, id); }
  @Get(':id') @Header('Cache-Control', 'private, no-store')
  thread(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query() query: DirectoryQuery, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.support.thread(user, { organizationId }, id, query, requestMetadata(req, res)); }
  @Post(':id/messages') @Throttle({ default: { limit: 20, ttl: 60000 } })
  reply(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: SupportReplyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.support.reply(user, { organizationId }, id, dto, requestMetadata(req, res)); }
  @Patch(':id/status')
  status(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) organizationId: string, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: SupportStatusDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.support.status(user, { organizationId }, id, dto, requestMetadata(req, res)); }
}

@Controller({ path: 'platform/support', version: '1' })
@UseGuards(AuthGuard, PlatformAdminGuard, CsrfOriginGuard)
export class PlatformSupportController {
  constructor(private readonly support: SupportService) {}
  @Get() @Header('Cache-Control', 'private, no-store')
  list(@CurrentUser() user: AuthenticatedUser, @Headers('x-support-reason') reason: string | undefined, @Query() query: SupportQuery, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.support.list(user, { reason }, query, requestMetadata(req, res)); }
  @Get(':id') @Header('Cache-Control', 'private, no-store')
  thread(@CurrentUser() user: AuthenticatedUser, @Headers('x-support-reason') reason: string | undefined, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query() query: DirectoryQuery, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.support.thread(user, { reason }, id, query, requestMetadata(req, res)); }
  @Post(':id/messages') @Throttle({ default: { limit: 20, ttl: 60000 } })
  reply(@CurrentUser() user: AuthenticatedUser, @Headers('x-support-reason') reason: string | undefined, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: SupportReplyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.support.reply(user, { reason }, id, dto, requestMetadata(req, res)); }
  @Patch(':id/status')
  status(@CurrentUser() user: AuthenticatedUser, @Headers('x-support-reason') reason: string | undefined, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: SupportStatusDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.support.status(user, { reason }, id, dto, requestMetadata(req, res)); }
}
