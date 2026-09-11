import { BadRequestException, Controller, Get, Headers, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { requestMetadata } from '../auth/request-metadata';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { PlatformAdminGuard } from './platform-admin.guard';

@Controller({ path: 'platform', version: '1' })
@UseGuards(AuthGuard, PlatformAdminGuard)
export class PlatformController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('organizations')
  async organizations(@CurrentUser() user: AuthenticatedUser, @Headers('x-support-reason') reason: string | undefined, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!reason || reason.trim().length < 10) throw new BadRequestException('A meaningful support reason is required.');
    const metadata = requestMetadata(req, res);
    await this.prisma.securityEvent.create({ data: { type: 'PLATFORM_ACCESS', actorUserId: user.id, outcome: 'SUCCESS', reason: reason.trim(), requestId: metadata.requestId, ipAddress: metadata.ipAddress, targetType: 'OrganizationDirectory' } });
    return this.prisma.organization.findMany({ select: { id: true, name: true, slug: true, status: true }, orderBy: { createdAt: 'desc' } });
  }
}
