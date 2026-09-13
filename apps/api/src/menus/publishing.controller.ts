import { Body, Controller, Get, Header, Param, Patch, Post, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CsrfOriginGuard } from '../auth/csrf-origin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { RequestMetadata } from '../auth/request-metadata';
import { Details, MenuParams, scope } from './menus.controller';
import { DesignDto, PublicationDto, PublishDto, RollbackDto, PublicParams, PublicImageParams } from './dto/publishing.dto';
import { PublishingService } from './publishing.service';
@Controller({ path: 'organizations/:organizationId/locations/:locationId/menus/:menuId', version: '1' })
@UseGuards(AuthGuard, CsrfOriginGuard)
export class PublishingController {
  constructor(private readonly publishing: PublishingService) {}
  @Get('publication') @Header('Cache-Control', 'private, no-store') get(@CurrentUser() user: AuthenticatedUser, @Param() params: MenuParams) { return this.publishing.get(scope(user, params)); }
  @Get('preview') @Header('Cache-Control', 'private, no-store') preview(@CurrentUser() user: AuthenticatedUser, @Param() params: MenuParams) { return this.publishing.preview(scope(user, params)); }
  @Get('qr') @Header('Cache-Control', 'private, no-store') qr(@CurrentUser() user: AuthenticatedUser, @Param() params: MenuParams) { return this.publishing.qr(scope(user, params)); }
  @Patch('design') design(@CurrentUser() user: AuthenticatedUser, @Param() params: MenuParams, @Body() dto: DesignDto, @Details() metadata: RequestMetadata) { return this.publishing.saveDesign(scope(user, params), dto, metadata); }
  @Post('publish') publish(@CurrentUser() user: AuthenticatedUser, @Param() params: MenuParams, @Body() dto: PublishDto, @Details() metadata: RequestMetadata) { return this.publishing.publish(scope(user, params), dto, metadata); }
  @Post('rollback') rollback(@CurrentUser() user: AuthenticatedUser, @Param() params: MenuParams, @Body() dto: RollbackDto, @Details() metadata: RequestMetadata) { return this.publishing.rollback(scope(user, params), dto, metadata); }
  @Post('unpublish') unpublish(@CurrentUser() user: AuthenticatedUser, @Param() params: MenuParams, @Body() dto: PublicationDto, @Details() metadata: RequestMetadata) { return this.publishing.unpublish(scope(user, params), dto, metadata); }
}
@Controller({ path: 'public/menus/:slug', version: '1' })
export class PublicMenusController {
  constructor(private readonly publishing: PublishingService) {}
  @Get() @Header('Cache-Control', 'no-store') @Header('X-Robots-Tag', 'noindex') get(@Param() params: PublicParams) { return this.publishing.publicMenu(params.slug); }
  @Get('versions/:versionId/images/:imageId') @Header('Cache-Control', 'no-store') @Header('X-Content-Type-Options', 'nosniff')
  async image(@Param() params: PublicImageParams) { return new StreamableFile(await this.publishing.publicImage(params.slug, params.versionId, params.imageId), { type: 'image/jpeg' }); }
}
