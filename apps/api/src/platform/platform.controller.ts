import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Patch, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { requestMetadata } from '../auth/request-metadata';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PlatformAdminGuard } from './platform-admin.guard';
import { CsrfOriginGuard } from '../auth/csrf-origin.guard';
import { PlatformService } from './platform.service';
import { AuditQuery, DirectoryQuery, OrganizationStatusDto, UserStatusDto } from './platform.dto';

@Controller({ path: 'platform', version: '1' })
@UseGuards(AuthGuard, PlatformAdminGuard, CsrfOriginGuard)
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('organizations') @Header('Cache-Control', 'private, no-store')
  organizations(@CurrentUser() user: AuthenticatedUser, @Headers('x-support-reason') reason: string | undefined, @Query() query: DirectoryQuery, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.platform.organizations(user, reason, requestMetadata(req, res), query); }

  @Get('users') @Header('Cache-Control', 'private, no-store')
  users(@CurrentUser() user: AuthenticatedUser, @Headers('x-support-reason') reason: string | undefined, @Query() query: DirectoryQuery, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.platform.users(user, reason, requestMetadata(req, res), query); }

  @Get('audit') @Header('Cache-Control', 'private, no-store')
  audit(@CurrentUser() user: AuthenticatedUser, @Headers('x-support-reason') reason: string | undefined, @Query() query: AuditQuery, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.platform.events(user, reason, requestMetadata(req, res), query); }

  @Patch('organizations/:id/status')
  organizationStatus(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: OrganizationStatusDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.platform.organizationStatus(user, id, dto, requestMetadata(req, res)); }

  @Patch('users/:id/status')
  userStatus(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: UserStatusDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.platform.userStatus(user, id, dto, requestMetadata(req, res)); }
}
