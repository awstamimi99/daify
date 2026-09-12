import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CsrfOriginGuard } from '../auth/csrf-origin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { requestMetadata } from '../auth/request-metadata';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AcceptInvitationDto, CreateLocationDto, CreateOrganizationDto, InviteMemberDto, UpdateMemberDto } from './dto/organizations.dto';
import { OrganizationsService } from './organizations.service';

@Controller({ path: 'organizations', version: '1' })
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.organizations.list(user.id); }
  @Get(':organizationId') get(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string) { return this.organizations.get(user.id, id); }

  @Get(':organizationId/members')
  members(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.organizations.listMembers(user.id, id);
  }

  @Post()
  @UseGuards(CsrfOriginGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrganizationDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.organizations.create(user.id, dto, requestMetadata(req, res)); }

  @Post(':organizationId/locations')
  @UseGuards(CsrfOriginGuard)
  createLocation(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: CreateLocationDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.organizations.createLocation(user.id, id, dto, requestMetadata(req, res)); }

  @Get(':organizationId/locations/:locationId')
  getLocation(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string, @Param('locationId', new ParseUUIDPipe({ version: '4' })) locationId: string) { return this.organizations.getLocation(user.id, id, locationId); }

  @Patch(':organizationId/locations/:locationId')
  @UseGuards(CsrfOriginGuard)
  updateLocation(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string, @Param('locationId', new ParseUUIDPipe({ version: '4' })) locationId: string, @Body() dto: CreateLocationDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.organizations.updateLocation(user.id, id, locationId, dto, requestMetadata(req, res)); }

  @Delete(':organizationId/locations/:locationId')
  @UseGuards(CsrfOriginGuard)
  archiveLocation(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string, @Param('locationId', new ParseUUIDPipe({ version: '4' })) locationId: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.organizations.updateLocation(user.id, id, locationId, null, requestMetadata(req, res)); }

  @Post(':organizationId/invitations')
  @UseGuards(CsrfOriginGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  invite(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: InviteMemberDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.organizations.invite(user.id, id, dto, requestMetadata(req, res)); }

  @Post('invitations/accept')
  @UseGuards(CsrfOriginGuard)
  accept(@CurrentUser() user: AuthenticatedUser, @Body() dto: AcceptInvitationDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.organizations.acceptInvitation(user.id, user.email, dto, requestMetadata(req, res)); }

  @Patch(':organizationId/members/:memberId')
  @UseGuards(CsrfOriginGuard)
  updateMember(@CurrentUser() user: AuthenticatedUser, @Param('organizationId', new ParseUUIDPipe({ version: '4' })) id: string, @Param('memberId', new ParseUUIDPipe({ version: '4' })) memberId: string, @Body() dto: UpdateMemberDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.organizations.updateMember(user.id, id, memberId, dto, requestMetadata(req, res)); }
}
