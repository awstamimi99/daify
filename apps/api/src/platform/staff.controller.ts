import { Body, Controller, Get, Header, Headers, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CsrfOriginGuard } from '../auth/csrf-origin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { requestMetadata } from '../auth/request-metadata';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformPermission } from './staff-policy';
import { StaffService } from './staff.service';
import { InviteStaffDto, UpdateStaffDto } from './staff.dto';
import { DirectoryQuery } from './platform.dto';

@Controller({ path: 'platform/staff', version: '1' })
@UseGuards(AuthGuard, CsrfOriginGuard)
export class StaffController {
  constructor(private readonly staff: StaffService) {}
  @Get() @Header('Cache-Control', 'private, no-store') @UseGuards(PlatformAdminGuard) @PlatformPermission('staff.manage')
  list(@CurrentUser() user: AuthenticatedUser, @Headers('x-support-reason') reason: string | undefined, @Query() query: DirectoryQuery, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.staff.list(user, reason, query, requestMetadata(req, res)); }
  @Post() @UseGuards(PlatformAdminGuard) @PlatformPermission('staff.manage')
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteStaffDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.staff.invite(user, dto, requestMetadata(req, res)); }
  @Patch(':id') @UseGuards(PlatformAdminGuard) @PlatformPermission('staff.manage')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: UpdateStaffDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.staff.update(user, id, dto, requestMetadata(req, res)); }
  @Get('invitation') @Header('Cache-Control', 'private, no-store')
  invitation(@CurrentUser() user: AuthenticatedUser) { return this.staff.invitation(user); }
  @Post('accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.staff.accept(user, requestMetadata(req, res)); }
}
