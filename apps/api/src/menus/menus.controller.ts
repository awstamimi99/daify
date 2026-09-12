import { Body, Controller, Delete, Get, Param, Patch, Post, StreamableFile, UseGuards, Header, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsUUID } from 'class-validator';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CsrfOriginGuard } from '../auth/csrf-origin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { requestMetadata } from '../auth/request-metadata';
import type { RequestMetadata } from '../auth/request-metadata';
import { AvailabilityDto, CreateMenuDto, ImageUpdateDto, ImageUploadDto, ItemDto, RevisionDto, SectionDto, UpdateMenuDto } from './dto/menu.dto';
import { MenusService } from './menus.service';

export class LocationParams { @IsUUID('4') organizationId!: string; @IsUUID('4') locationId!: string; }
export class MenuParams extends LocationParams { @IsUUID('4') menuId!: string; }
export class SectionParams extends MenuParams { @IsUUID('4') sectionId!: string; }
export class ItemParams extends MenuParams { @IsUUID('4') itemId!: string; }
export class ImageParams extends MenuParams { @IsUUID('4') imageId!: string; }
const Details = createParamDecorator((_data: unknown, context: ExecutionContext) => requestMetadata(context.switchToHttp().getRequest<Request>(), context.switchToHttp().getResponse<Response>()));
const scope = (user: AuthenticatedUser, params: LocationParams & { menuId?: string }) => ({ userId: user.id, organizationId: params.organizationId, locationId: params.locationId, menuId: params.menuId ?? '' });

@Controller({ path: 'organizations/:organizationId/locations/:locationId/menus', version: '1' })
@UseGuards(AuthGuard, CsrfOriginGuard)
export class MenusController {
  constructor(private readonly menus: MenusService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser, @Param() params: LocationParams) { return this.menus.list(scope(user, params)); }
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Param() params: LocationParams, @Body() dto: CreateMenuDto, @Details() details: RequestMetadata) { return this.menus.create(scope(user, params), dto, details); }
  @Get(':menuId') get(@CurrentUser() user: AuthenticatedUser, @Param() params: MenuParams) { return this.menus.get(scope(user, params)); }
  @Patch(':menuId') update(@CurrentUser() user: AuthenticatedUser, @Param() params: MenuParams, @Body() dto: UpdateMenuDto, @Details() details: RequestMetadata) { return this.menus.update(scope(user, params), dto, details); }
  @Delete(':menuId') archive(@CurrentUser() user: AuthenticatedUser, @Param() params: MenuParams, @Body() dto: RevisionDto, @Details() details: RequestMetadata) { return this.menus.archive(scope(user, params), dto, details); }
  @Post(':menuId/sections') section(@CurrentUser() user: AuthenticatedUser, @Param() params: MenuParams, @Body() dto: SectionDto, @Details() details: RequestMetadata) { return this.menus.section(scope(user, params), dto, details); }
  @Patch(':menuId/sections/:sectionId') updateSection(@CurrentUser() user: AuthenticatedUser, @Param() params: SectionParams, @Body() dto: SectionDto, @Details() details: RequestMetadata) { return this.menus.section(scope(user, params), dto, details, params.sectionId); }
  @Delete(':menuId/sections/:sectionId') removeSection(@CurrentUser() user: AuthenticatedUser, @Param() params: SectionParams, @Body() dto: RevisionDto, @Details() details: RequestMetadata) { return this.menus.removeSection(scope(user, params), params.sectionId, dto, details); }
  @Post(':menuId/sections/:sectionId/items') item(@CurrentUser() user: AuthenticatedUser, @Param() params: SectionParams, @Body() dto: ItemDto, @Details() details: RequestMetadata) { return this.menus.item(scope(user, params), params.sectionId, dto, details); }
  @Patch(':menuId/items/:itemId') updateItem(@CurrentUser() user: AuthenticatedUser, @Param() params: ItemParams, @Body() dto: ItemDto, @Details() details: RequestMetadata) { return this.menus.item(scope(user, params), undefined, dto, details, params.itemId); }
  @Delete(':menuId/items/:itemId') removeItem(@CurrentUser() user: AuthenticatedUser, @Param() params: ItemParams, @Body() dto: RevisionDto, @Details() details: RequestMetadata) { return this.menus.removeItem(scope(user, params), params.itemId, dto, details); }
  @Patch(':menuId/items/:itemId/availability') availability(@CurrentUser() user: AuthenticatedUser, @Param() params: ItemParams, @Body() dto: AvailabilityDto, @Details() details: RequestMetadata) { return this.menus.availability(scope(user, params), params.itemId, dto, details); }
  @Post(':menuId/items/:itemId/images') @Throttle({ default: { limit: 10, ttl: 60_000 } }) upload(@CurrentUser() user: AuthenticatedUser, @Param() params: ItemParams, @Body() dto: ImageUploadDto, @Details() details: RequestMetadata) { return this.menus.upload(scope(user, params), params.itemId, dto, details); }
  @Patch(':menuId/images/:imageId') imageText(@CurrentUser() user: AuthenticatedUser, @Param() params: ImageParams, @Body() dto: ImageUpdateDto, @Details() details: RequestMetadata) { return this.menus.image(scope(user, params), params.imageId, dto, details); }
  @Delete(':menuId/images/:imageId') removeImage(@CurrentUser() user: AuthenticatedUser, @Param() params: ImageParams, @Body() dto: RevisionDto, @Details() details: RequestMetadata) { return this.menus.image(scope(user, params), params.imageId, dto, details, true); }
  @Get(':menuId/images/:imageId') @Header('Cache-Control', 'private, no-store') @Header('X-Content-Type-Options', 'nosniff')
  async image(@CurrentUser() user: AuthenticatedUser, @Param() params: ImageParams) { return new StreamableFile(await this.menus.imageBytes(scope(user, params), params.imageId), { type: 'image/jpeg' }); }
}
