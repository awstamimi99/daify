import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { defaultDesign, designImageIds, validateDesign } from '@daify/menu-engine';
import type { Design, MenuSnapshot } from '@daify/menu-engine';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import type { Permission } from '../authorization/permissions';
import type { RequestMetadata } from '../auth/request-metadata';
import { MenusService } from './menus.service';
import type { MenuScope } from './menus.service';
import { MediaStorageService } from './media-storage.service';
import type { DesignDto, PublicationDto, PublishDto, RollbackDto } from './dto/publishing.dto';
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const versionFields = { id: true, number: true, publishedAt: true, publishedById: true, sourceDraftRevision: true, rollbackSourceId: true } as const;
const text = (value: Prisma.JsonValue | null, key: string) => value && typeof value === 'object' && !Array.isArray(value) && typeof value[key] === 'string' ? value[key] : '';

@Injectable()
export class PublishingService {
  constructor(private readonly prisma: PrismaService, private readonly menus: MenusService, private readonly media: MediaStorageService) {}
  private design(value: unknown): Design { try { return validateDesign(value); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Invalid design.'); } }
  private async theme(tx: Prisma.TransactionClient, menuId: string) {
    const theme = await tx.theme.findUnique({ where: { menuId } });
    return theme ? this.design(theme.layout) : defaultDesign();
  }
  private async state(tx: Prisma.TransactionClient, scope: MenuScope) {
    const menu = await tx.menu.findUniqueOrThrow({ where: { id: scope.menuId }, select: { draftRevision: true, publicSlug: true, visibility: true, currentVersionId: true, location: { select: { organization: { select: { publishingEnabled: true } } } } } });
    return { revision: menu.draftRevision, publicSlug: menu.publicSlug, visibility: menu.visibility, currentVersionId: menu.currentVersionId,
      publishingEnabled: menu.location.organization.publishingEnabled, design: await this.theme(tx, scope.menuId),
      versions: await tx.menuVersion.findMany({ where: { menuId: scope.menuId }, select: versionFields, orderBy: { number: 'desc' } }) };
  }
  async get(scope: MenuScope) { await this.menus.access(this.prisma, scope, 'menu.read'); await this.menus.draft(this.prisma, scope); return this.state(this.prisma, scope); }
  async qr(scope: MenuScope) { await this.menus.access(this.prisma, scope, 'qr.manage'); await this.menus.draft(this.prisma, scope); const state = await this.state(this.prisma, scope); if (!state.publicSlug) throw new BadRequestException('Publish once to reserve a QR link.'); return { slug: state.publicSlug }; }
  private async snapshot(tx: Prisma.TransactionClient, scope: MenuScope, requireComplete: boolean): Promise<MenuSnapshot> {
    const draft = await this.menus.draft(tx, scope);
    if (requireComplete && draft.completeness.languages.some(language => !language.complete)) throw new BadRequestException('Add names in every enabled language before publishing.');
    const location = await tx.location.findUniqueOrThrow({ where: { id: scope.locationId }, include: { organization: true } });
    const design = await this.theme(tx, scope.menuId);
    const snapshot: MenuSnapshot = { schemaVersion: 1, defaultLanguage: draft.defaultLanguage, supportedLanguages: draft.supportedLanguages,
      restaurant: { name: location.organization.name, location: location.name, phone: text(location.contact, 'phone'), address: text(location.address, 'line1') },
      translations: draft.translations, design,
      sections: draft.sections.filter(section => section.isVisible).map(section => ({ id: section.id, translations: section.translations, items: section.items.map(item => ({ id: item.id, price: item.price, currency: item.currency, isAvailable: item.isAvailable, isFeatured: item.isFeatured, allergens: item.allergens, dietaryTags: item.dietaryTags, translations: item.translations, images: item.images.map(image => ({ id: image.id, translations: image.translations })) })) })) };
    if (requireComplete && !snapshot.sections.some(section => section.items.length)) throw new BadRequestException('Add an item in a visible section before publishing.');
    const images = new Set(snapshot.sections.flatMap(section => section.items.flatMap(item => item.images.map(image => image.id))));
    if (requireComplete && designImageIds(design).some(id => !images.has(id))) throw new BadRequestException('Replace design images that were removed or hidden.');
    return snapshot;
  }
  async preview(scope: MenuScope) { return this.prisma.$transaction(async tx => { await this.menus.access(tx, scope, 'menu.read'); return this.snapshot(tx, scope, false); }, { isolationLevel: 'RepeatableRead' }); }
  private async lock(tx: Prisma.TransactionClient, scope: MenuScope, permission: Permission) {
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${scope.organizationId}::uuid FOR UPDATE`;
    await this.menus.access(tx, scope, permission);
    await tx.$queryRaw`SELECT id FROM menus WHERE id = ${scope.menuId}::uuid AND "locationId" = ${scope.locationId}::uuid FOR UPDATE`;
    return this.menus.draft(tx, scope);
  }
  async saveDesign(scope: MenuScope, dto: DesignDto, metadata: RequestMetadata) {
    const design = this.design(dto.design);
    return this.prisma.$transaction(async tx => {
      const draft = await this.lock(tx, scope, 'menu.design'); this.revision(draft.draftRevision, dto.revision);
      const ids = new Set(draft.sections.flatMap(section => section.items.flatMap(item => item.images.map(image => image.id))));
      if (designImageIds(design).some(id => !ids.has(id))) throw new BadRequestException('Choose images from this menu.');
      const data = { templateKey: design.templateKey, schemaVersion: 1, tokens: json(design.tokens), layout: json(design) };
      await tx.theme.upsert({ where: { menuId: scope.menuId }, create: { menuId: scope.menuId, ...data }, update: data });
      await tx.menu.update({ where: { id: scope.menuId }, data: { draftRevision: { increment: 1 } } });
      await this.menus.audit(tx, scope, metadata, 'design.saved'); return this.state(tx, scope);
    });
  }
  private revision(actual: number, requested: number) { if (actual !== requested) throw new ConflictException('This menu changed. Reload before continuing.'); }
  private async operation(scope: MenuScope, dto: PublicationDto, metadata: RequestMetadata, kind: string, action: (tx: Prisma.TransactionClient, revision: number) => Promise<void>) {
    const requestHash = createHash('sha256').update(JSON.stringify({ kind, userId: scope.userId, ...dto })).digest('hex');
    return this.prisma.$transaction(async tx => {
      const draft = await this.lock(tx, scope, 'menu.publish');
      const previous = await tx.publicationOperation.findUnique({ where: { menuId_key: { menuId: scope.menuId, key: dto.idempotencyKey } } });
      if (previous) { if (previous.requestHash !== requestHash) throw new ConflictException('This operation key was already used for another request.'); return previous.result; }
      this.revision(draft.draftRevision, dto.revision);
      if (kind !== 'unpublished') {
        const org = await tx.organization.findUniqueOrThrow({ where: { id: scope.organizationId } });
        if (!org.publishingEnabled) throw new ForbiddenException('Publishing is disabled for this workspace.');
      }
      await action(tx, draft.draftRevision);
      await tx.menu.update({ where: { id: scope.menuId }, data: { draftRevision: { increment: 1 } } });
      const state = await this.state(tx, scope);
      await tx.publicationEvent.create({ data: { menuId: scope.menuId, kind, payload: json({ menuId: scope.menuId, versionId: state.currentVersionId, slug: state.publicSlug }) } });
      await this.menus.audit(tx, scope, metadata, `menu.${kind}`);
      await tx.publicationOperation.create({ data: { menuId: scope.menuId, key: dto.idempotencyKey, requestHash, result: json(state) } });
      return json(state);
    }, { timeout: 30_000 });
  }
  private async reserve(tx: Prisma.TransactionClient, menuId: string, slug: string) {
    const existing = await tx.menuRoute.findUnique({ where: { slug } });
    if (existing && existing.menuId !== menuId) throw new ConflictException('This public link is already reserved.');
    if (!existing) await tx.menuRoute.create({ data: { slug, menuId } });
  }
  private async version(tx: Prisma.TransactionClient, scope: MenuScope, snapshot: MenuSnapshot, revision: number, rollbackSourceId?: string) {
    const last = await tx.menuVersion.aggregate({ where: { menuId: scope.menuId }, _max: { number: true } });
    const imageIds = snapshot.sections.flatMap(section => section.items.flatMap(item => item.images.map(image => image.id)));
    const images = rollbackSourceId
      ? await tx.menuVersionImage.findMany({ where: { versionId: rollbackSourceId }, select: { imageId: true, objectKey: true, sha256: true } })
      : (await tx.menuItemImage.findMany({ where: { id: { in: imageIds }, item: { section: { menuId: scope.menuId } } }, select: { id: true, objectKey: true, sha256: true } })).map(({ id, ...image }) => ({ imageId: id, ...image }));
    if (new Set(images.map(image => image.imageId)).size !== new Set(imageIds).size) throw new BadRequestException('An image is missing. Replace it before publishing.');
    // Check retained objects on publish and rollback; a pointer never switches to broken media.
    for (const image of images) if (createHash('sha256').update(await this.media.get(image.objectKey)).digest('hex') !== image.sha256) throw new BadRequestException('An image failed its integrity check.');
    return tx.menuVersion.create({ data: { menuId: scope.menuId, number: (last._max.number ?? 0) + 1, schemaVersion: 1, snapshot: json(snapshot), publishedById: scope.userId, sourceDraftRevision: revision, rollbackSourceId, images: { create: images } } });
  }
  publish(scope: MenuScope, dto: PublishDto, metadata: RequestMetadata) {
    return this.operation(scope, dto, metadata, 'published', async (tx, revision) => {
      await this.reserve(tx, scope.menuId, dto.slug);
      const snapshot = await this.snapshot(tx, scope, true);
      const version = await this.version(tx, scope, snapshot, revision);
      await tx.menu.update({ where: { id: scope.menuId }, data: { currentVersionId: version.id, publicSlug: dto.slug, visibility: dto.visibility, status: 'PUBLISHED' } });
    });
  }
  rollback(scope: MenuScope, dto: RollbackDto, metadata: RequestMetadata) {
    return this.operation(scope, dto, metadata, 'rolled-back', async (tx, revision) => {
      const source = await tx.menuVersion.findFirst({ where: { id: dto.versionId, menuId: scope.menuId } });
      if (!source || source.schemaVersion !== 1) throw new NotFoundException('Version was not found.');
      const snapshot = source.snapshot as unknown as MenuSnapshot; this.design(snapshot.design);
      const version = await this.version(tx, scope, snapshot, revision, source.id);
      await tx.menu.update({ where: { id: scope.menuId }, data: { currentVersionId: version.id, status: 'PUBLISHED' } });
    });
  }
  unpublish(scope: MenuScope, dto: PublicationDto, metadata: RequestMetadata) {
    return this.operation(scope, dto, metadata, 'unpublished', async tx => { await tx.menu.update({ where: { id: scope.menuId }, data: { currentVersionId: null, status: 'DRAFT' } }); });
  }
  private async live(tx: Prisma.TransactionClient, slug: string) {
    const route = await tx.menuRoute.findUnique({ where: { slug }, include: { menu: { include: { currentVersion: true, location: { include: { organization: true } } } } } });
    const menu = route?.menu, location = menu?.location, org = location?.organization;
    if (!menu || !menu.currentVersion || !menu.publicSlug || menu.visibility === 'PRIVATE' || menu.archivedAt || menu.status !== 'PUBLISHED' || location?.status !== 'ACTIVE' || location.archivedAt || org?.status !== 'ACTIVE' || org.archivedAt) throw new NotFoundException('This menu is unavailable.');
    return { slug: menu.publicSlug, requestedSlug: slug, visibility: menu.visibility, versionId: menu.currentVersion.id, version: menu.currentVersion.number, snapshot: menu.currentVersion.snapshot as unknown as MenuSnapshot };
  }
  publicMenu(slug: string) { return this.live(this.prisma, slug); }
  async publicImage(slug: string, versionId: string, imageId: string) {
    const live = await this.live(this.prisma, slug);
    if (live.versionId !== versionId) throw new NotFoundException('Image was not found.');
    const image = await this.prisma.menuVersionImage.findUnique({ where: { versionId_imageId: { versionId, imageId } } });
    if (!image) throw new NotFoundException('Image was not found.'); return this.media.get(image.objectKey);
  }
}
