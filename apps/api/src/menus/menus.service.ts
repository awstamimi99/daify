import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { AuthorizationService } from '../authorization/authorization.service';
import type { Permission } from '../authorization/permissions';
import type { RequestMetadata } from '../auth/request-metadata';
import type { AvailabilityDto, CreateMenuDto, ImageUpdateDto, ImageUploadDto, ItemDto, RevisionDto, SectionDto, UpdateMenuDto } from './dto/menu.dto';
import { canonicalLanguage, completeness, languages, translations } from './localization';
import { MediaStorageService } from './media-storage.service';

export interface MenuScope { userId: string; organizationId: string; locationId: string; menuId: string; }
const localized = { languageTag: true, name: true, description: true } as const;
const imageFields = { id: true, mimeType: true, bytes: true, width: true, height: true, position: true, translations: { select: { languageTag: true, altText: true } } } as const;
@Injectable()
export class MenusService {
  private readonly logger = new Logger(MenusService.name);
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService, private readonly media: MediaStorageService) {}

  private async access(tx: Prisma.TransactionClient, scope: MenuScope, permission: Permission) {
    const membership = await this.authorization.requireOrganization(scope.userId, scope.organizationId, permission, tx);
    const location = await tx.location.findFirst({ where: { id: scope.locationId, organizationId: scope.organizationId, status: 'ACTIVE', archivedAt: null } });
    if (!location || (!membership.allLocations && !membership.locationScopes.some(value => value.locationId === location.id))) throw new NotFoundException('Location was not found.');
    return location;
  }
  async list(scope: MenuScope) {
    await this.access(this.prisma, scope, 'menu.read');
    return this.prisma.menu.findMany({ where: { locationId: scope.locationId, archivedAt: null }, select: { id: true, name: true, slug: true, defaultLanguage: true, supportedLanguages: true, draftRevision: true, updatedAt: true, status: true }, orderBy: { createdAt: 'asc' } });
  }
  private async draft(tx: Prisma.TransactionClient, scope: MenuScope) {
    const menu = await tx.menu.findFirst({ where: { id: scope.menuId, locationId: scope.locationId, archivedAt: null, location: { organizationId: scope.organizationId, status: 'ACTIVE', archivedAt: null } }, select: {
      id: true, name: true, slug: true, locationId: true, status: true, defaultLanguage: true, supportedLanguages: true, draftRevision: true, updatedAt: true,
      location: { select: { currency: true } }, translations: { select: localized },
      sections: { where: { archivedAt: null }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: {
        id: true, stableKey: true, position: true, isVisible: true, translations: { select: localized },
        items: { where: { archivedAt: null }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: {
          id: true, sectionId: true, stableKey: true, position: true, price: true, currency: true, isAvailable: true, isFeatured: true, allergens: true, dietaryTags: true,
          translations: { select: localized }, images: { where: { archivedAt: null }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: imageFields },
        } },
      } },
    } });
    if (!menu) throw new NotFoundException('Menu was not found.');
    const { location, ...result } = menu;
    return { ...result, currency: location.currency, sections: menu.sections.map(section => ({ ...section, items: section.items.map(item => ({ ...item, price: item.price.toFixed(this.fraction(item.currency)) })) })), completeness: completeness(menu) };
  }
  async get(scope: MenuScope) { await this.access(this.prisma, scope, 'menu.read'); return this.draft(this.prisma, scope); }
  private fraction(currency: string) { return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2; }
  private price(value: string, currency: string) {
    if ((value.split('.')[1]?.length ?? 0) > this.fraction(currency)) throw new BadRequestException(`Price has too many decimal places for ${currency}.`);
    return value;
  }
  async create(scope: MenuScope, dto: CreateMenuDto, metadata: RequestMetadata) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${scope.organizationId}::uuid FOR UPDATE`;
      await this.access(tx, scope, 'menu.edit');
      const config = languages(dto.defaultLanguage, dto.supportedLanguages);
      const content = translations(dto.translations, config.defaultLanguage, config.supportedLanguages);
      if (!dto.name.trim()) throw new BadRequestException('Menu name is required.');
      const menu = await tx.menu.create({ data: { locationId: scope.locationId, name: dto.name.trim(), slug: dto.slug, ...config, translations: { create: content } } });
      await this.audit(tx, { ...scope, menuId: menu.id }, metadata, 'menu.created');
      return this.draft(tx, { ...scope, menuId: menu.id });
    });
  }
  private async audit(tx: Prisma.TransactionClient, scope: MenuScope, metadata: RequestMetadata, reason: string) {
    await tx.securityEvent.create({ data: { type: 'MENU_UPDATED', actorUserId: scope.userId, organizationId: scope.organizationId, targetType: 'Menu', targetId: scope.menuId, outcome: 'SUCCESS', reason, requestId: metadata.requestId, ipAddress: metadata.ipAddress } });
  }
  private async edit(scope: MenuScope, revision: number, permission: Permission, metadata: RequestMetadata, reason: string, change: (tx: Prisma.TransactionClient, menu: Awaited<ReturnType<MenusService['draft']>>) => Promise<void>, archived = false) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${scope.organizationId}::uuid FOR UPDATE`;
      await this.access(tx, scope, permission);
      await tx.$queryRaw`SELECT id FROM menus WHERE id = ${scope.menuId}::uuid AND "locationId" = ${scope.locationId}::uuid FOR UPDATE`;
      const menu = await this.draft(tx, scope);
      if (menu.draftRevision !== revision) throw new ConflictException('This menu changed in another session. Reload the latest draft before saving.');
      await change(tx, menu);
      await tx.menu.update({ where: { id: scope.menuId }, data: { draftRevision: { increment: 1 } } });
      await this.audit(tx, scope, metadata, reason);
      return archived ? { archived: true, id: scope.menuId } : this.draft(tx, scope);
    }, { timeout: 15_000 });
  }
  update(scope: MenuScope, dto: UpdateMenuDto, metadata: RequestMetadata) {
    return this.edit(scope, dto.revision, 'menu.edit', metadata, 'menu.updated', async (tx, menu) => {
      const config = languages(dto.defaultLanguage ?? menu.defaultLanguage, dto.supportedLanguages ?? menu.supportedLanguages);
      const rows = translations(dto.translations ?? menu.translations.filter(row => config.supportedLanguages.includes(row.languageTag)), config.defaultLanguage, config.supportedLanguages);
      // Changing the default requires a readable name on all existing entities too.
      for (const section of menu.sections) {
        translations(section.translations.filter(row => config.supportedLanguages.includes(row.languageTag)), config.defaultLanguage, config.supportedLanguages);
        for (const item of section.items) translations(item.translations.filter(row => config.supportedLanguages.includes(row.languageTag)), config.defaultLanguage, config.supportedLanguages);
      }
      if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Menu name is required.');
      await tx.menu.update({ where: { id: menu.id }, data: { name: dto.name?.trim(), slug: dto.slug, ...config } });
      await tx.menuTranslation.deleteMany({ where: { menuId: menu.id } });
      await tx.menuTranslation.createMany({ data: rows.map(row => ({ ...row, menuId: menu.id })) });
    });
  }
  archive(scope: MenuScope, dto: RevisionDto, metadata: RequestMetadata) {
    return this.edit(scope, dto.revision, 'menu.edit', metadata, 'menu.archived', async tx => { await tx.menu.update({ where: { id: scope.menuId }, data: { archivedAt: new Date(), status: 'ARCHIVED' } }); }, true);
  }
  section(scope: MenuScope, dto: SectionDto, metadata: RequestMetadata, id?: string) {
    return this.edit(scope, dto.revision, 'menu.edit', metadata, id ? 'section.updated' : 'section.created', async (tx, menu) => {
      if (id && !menu.sections.some(section => section.id === id)) throw new NotFoundException('Section was not found.');
      if (!id && menu.sections.length >= 100) throw new BadRequestException('A menu can contain up to 100 sections.');
      const rows = translations(dto.translations, menu.defaultLanguage, menu.supportedLanguages);
      const section = id ? await tx.menuSection.update({ where: { id }, data: { isVisible: dto.isVisible } }) : await tx.menuSection.create({ data: { menuId: menu.id, stableKey: randomUUID(), position: menu.sections.length, isVisible: dto.isVisible ?? true } });
      await tx.menuSectionTranslation.deleteMany({ where: { sectionId: section.id } });
      await tx.menuSectionTranslation.createMany({ data: rows.map(row => ({ ...row, sectionId: section.id })) });
      const ids = menu.sections.filter(value => value.id !== section.id).map(value => value.id);
      ids.splice(Math.min(dto.position ?? section.position, ids.length), 0, section.id);
      for (const [position, sectionId] of ids.entries()) await tx.menuSection.update({ where: { id: sectionId }, data: { position } });
    });
  }
  removeSection(scope: MenuScope, id: string, dto: RevisionDto, metadata: RequestMetadata) {
    return this.edit(scope, dto.revision, 'menu.edit', metadata, 'section.archived', async (tx, menu) => {
      if (!menu.sections.some(section => section.id === id)) throw new NotFoundException('Section was not found.');
      await tx.menuSection.update({ where: { id }, data: { archivedAt: new Date() } });
      for (const [position, section] of menu.sections.filter(value => value.id !== id).entries()) await tx.menuSection.update({ where: { id: section.id }, data: { position } });
    });
  }
  item(scope: MenuScope, sectionId: string | undefined, dto: ItemDto, metadata: RequestMetadata, id?: string) {
    return this.edit(scope, dto.revision, 'menu.edit', metadata, id ? 'item.updated' : 'item.created', async (tx, menu) => {
      const old = menu.sections.flatMap(section => section.items).find(item => item.id === id);
      if (id && !old) throw new NotFoundException('Item was not found.');
      if (!id && (!menu.sections.some(section => section.id === sectionId) || (dto.sectionId !== undefined && dto.sectionId !== sectionId))) throw new NotFoundException('Section was not found.');
      const target = menu.sections.find(section => section.id === (dto.sectionId ?? sectionId ?? old?.sectionId));
      if (!target) throw new NotFoundException('Section was not found.');
      if (!id && menu.sections.reduce((sum, section) => sum + section.items.length, 0) >= 1000) throw new BadRequestException('A menu can contain up to 1000 items.');
      const rows = translations(dto.translations, menu.defaultLanguage, menu.supportedLanguages);
      const data = { price: this.price(dto.price, menu.currency), currency: menu.currency, isAvailable: dto.isAvailable, isFeatured: dto.isFeatured, allergens: [...new Set(dto.allergens.map(value => value.trim()).filter(Boolean))], dietaryTags: [...new Set(dto.dietaryTags.map(value => value.trim()).filter(Boolean))], sectionId: target.id };
      const item = id ? await tx.menuItem.update({ where: { id }, data }) : await tx.menuItem.create({ data: { ...data, stableKey: randomUUID(), position: target.items.length } });
      await tx.menuItemTranslation.deleteMany({ where: { itemId: item.id } });
      await tx.menuItemTranslation.createMany({ data: rows.map(row => ({ ...row, itemId: item.id })) });
      const ids = target.items.filter(value => value.id !== item.id).map(value => value.id);
      ids.splice(Math.min(dto.position ?? (old?.sectionId === target.id ? old.position : ids.length), ids.length), 0, item.id);
      for (const [position, itemId] of ids.entries()) await tx.menuItem.update({ where: { id: itemId }, data: { position } });
      if (old && old.sectionId !== target.id) await this.normalizeItems(tx, old.sectionId);
    });
  }
  private async normalizeItems(tx: Prisma.TransactionClient, sectionId: string) {
    const items = await tx.menuItem.findMany({ where: { sectionId, archivedAt: null }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    for (const [position, item] of items.entries()) await tx.menuItem.update({ where: { id: item.id }, data: { position } });
  }
  availability(scope: MenuScope, id: string, dto: AvailabilityDto, metadata: RequestMetadata) {
    return this.edit(scope, dto.revision, 'menu.availability', metadata, 'item.availability', async (tx, menu) => {
      if (!menu.sections.some(section => section.items.some(item => item.id === id))) throw new NotFoundException('Item was not found.');
      await tx.menuItem.update({ where: { id }, data: { isAvailable: dto.isAvailable } });
    });
  }
  removeItem(scope: MenuScope, id: string, dto: RevisionDto, metadata: RequestMetadata) {
    return this.edit(scope, dto.revision, 'menu.edit', metadata, 'item.archived', async (tx, menu) => {
      const item = menu.sections.flatMap(section => section.items).find(value => value.id === id);
      if (!item) throw new NotFoundException('Item was not found.');
      await tx.menuItem.update({ where: { id }, data: { archivedAt: new Date() } });
      await this.normalizeItems(tx, item.sectionId);
    });
  }
  private alt(rows: ImageUpdateDto['translations'], enabled: string[]) {
    const result = rows.map(row => ({ languageTag: canonicalLanguage(row.languageTag), altText: row.altText.trim() }));
    if (new Set(result.map(row => row.languageTag)).size !== result.length || result.some(row => !enabled.includes(row.languageTag))) throw new BadRequestException('Image text must use unique enabled languages.');
    return result;
  }
  async upload(scope: MenuScope, itemId: string, dto: ImageUploadDto, metadata: RequestMetadata) {
    await this.access(this.prisma, scope, 'menu.edit');
    const before = await this.draft(this.prisma, scope);
    if (before.draftRevision !== dto.revision) throw new ConflictException('Reload the latest draft before uploading.');
    if (!before.sections.some(section => section.items.some(item => item.id === itemId))) throw new NotFoundException('Item was not found.');
    const processed = await this.media.process(dto.data, dto.mimeType);
    await this.media.put(processed.objectKey, processed.buffer);
    try {
      return await this.edit(scope, dto.revision, 'menu.edit', metadata, 'image.attached', async (tx, menu) => {
        const item = menu.sections.flatMap(section => section.items).find(value => value.id === itemId);
        if (!item) throw new NotFoundException('Item was not found.');
        if (item.images.length >= 5) throw new BadRequestException('An item can have up to five images.');
        const { objectKey, mimeType, bytes, width, height, sha256 } = processed;
        const data = { objectKey, mimeType, bytes, width, height, sha256 };
        await tx.menuItemImage.create({ data: { ...data, itemId, position: item.images.length, translations: { create: this.alt(dto.translations, menu.supportedLanguages) } } });
      });
    } catch (error) { await this.media.remove(processed.objectKey).catch(() => this.logger.error({ event: 'media.orphan-cleanup-required', objectKey: processed.objectKey })); throw error; }
  }
  image(scope: MenuScope, imageId: string, dto: ImageUpdateDto | RevisionDto, metadata: RequestMetadata, remove = false) {
    return this.edit(scope, dto.revision, 'menu.edit', metadata, remove ? 'image.detached' : 'image.updated', async (tx, menu) => {
      if (!menu.sections.some(section => section.items.some(item => item.images.some(image => image.id === imageId)))) throw new NotFoundException('Image was not found.');
      if (remove) await tx.menuItemImage.update({ where: { id: imageId }, data: { archivedAt: new Date() } });
      else {
        await tx.menuImageTranslation.deleteMany({ where: { imageId } });
        await tx.menuImageTranslation.createMany({ data: this.alt((dto as ImageUpdateDto).translations, menu.supportedLanguages).map(row => ({ ...row, imageId })) });
      }
    });
  }
  async imageBytes(scope: MenuScope, imageId: string) {
    await this.access(this.prisma, scope, 'menu.read');
    const image = await this.prisma.menuItemImage.findFirst({ where: { id: imageId, archivedAt: null, item: { archivedAt: null, section: { menuId: scope.menuId, archivedAt: null, menu: { locationId: scope.locationId, archivedAt: null } } } }, select: { objectKey: true } });
    if (!image) throw new NotFoundException('Image was not found.');
    return this.media.get(image.objectKey);
  }
}
