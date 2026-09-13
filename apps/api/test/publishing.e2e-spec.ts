import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { defaultDesign } from '@daify/menu-engine';
import type { PublicationState, PublicMenu } from '@daify/menu-engine';
import type { DraftMenu } from '../../../packages/types/src/draft-menu';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { CryptoService } from '../src/auth/crypto.service';
import { PublicationOutbox } from '../src/menus/publication-outbox.service';
import { contractRequest } from './support/contract-request';
const tr = (name: string, languageTag = 'en') => ({ languageTag, name, description: 'Menu description' });
describe('M5 immutable publication lifecycle', () => {
  let app: INestApplication, prisma: PrismaService, org: string, location: string, otherLocation: string, owner: string, manager: string, limited: string, directory: string;
  const users: string[] = [];
  const base = () => `/api/v1/organizations/${org}/locations/${location}/menus`;
  const api = (method: 'get' | 'post' | 'patch' | 'delete', path: string, cookie = owner) => contractRequest(app.getHttpServer() as Server)[method](path).set('Origin','http://localhost:3000').set('Cookie',cookie);
  const state = (body: unknown) => body as PublicationState;
  async function create(languages = ['en']): Promise<DraftMenu> {
    let menu = (await api('post',base()).send({ name: 'Dinner', slug: randomUUID(), defaultLanguage: languages[0], supportedLanguages: languages, translations: languages.map(lang => tr('Dinner',lang)) }).expect(201)).body as DraftMenu;
    menu = (await api('post',`${base()}/${menu.id}/sections`).send({ revision: menu.draftRevision, translations: languages.map(lang => tr('Starters',lang)) }).expect(201)).body as DraftMenu;
    return (await api('post',`${base()}/${menu.id}/sections/${menu.sections[0]!.id}/items`).send({ revision: menu.draftRevision, translations: languages.map(lang => tr('Soup',lang)), price: '2.750', isAvailable: true, isFeatured: true, allergens: ['milk'], dietaryTags: ['vegetarian'] }).expect(201)).body as DraftMenu;
  }
  async function publish(menu: { id: string; draftRevision: number }, slug: string = randomUUID(), visibility = 'PUBLIC') { return state((await api('post',`${base()}/${menu.id}/publish`).send({ revision: menu.draftRevision, idempotencyKey: randomUUID(), slug, visibility }).expect(201)).body); }
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(),'daify-m5-media-')); process.env.MEDIA_LOCAL_DIR = directory;
    app = await createApp(); app.get(ConfigService).set('MEDIA_LOCAL_DIR',directory); await app.listen(0,'127.0.0.1'); prisma = app.get(PrismaService);
    org = (await prisma.organization.create({ data: { name: 'M5 Restaurant', slug: randomUUID() } })).id;
    for (const name of ['main','other']) { const row = await prisma.location.create({ data: { organizationId: org, name, slug: name, currency: 'KWD', timezone: 'Asia/Kuwait', defaultLanguage: 'en' } }); if (name === 'main') location = row.id; else otherLocation = row.id; }
    async function member(role: 'OWNER' | 'MANAGER', assigned = location) {
      const user = await prisma.user.create({ data: { email: `m5-${randomUUID()}@example.com`, status: 'ACTIVE', emailVerifiedAt: new Date(), passwordHash: 'unused' } }); users.push(user.id);
      const member = await prisma.organizationMember.create({ data: { userId: user.id, organizationId: org, role, status: 'ACTIVE', allLocations: role === 'OWNER', permissions: [] } });
      if (!member.allLocations) await prisma.organizationMemberLocation.create({ data: { organizationId: org, organizationMemberId: member.id, locationId: assigned } });
      const crypto = app.get(CryptoService), token = crypto.opaqueToken(); await prisma.session.create({ data: { userId: user.id, tokenHash: crypto.tokenHash(token), expiresAt: new Date(Date.now()+3600000), absoluteExpiresAt: new Date(Date.now()+3600000) } }); return `daify_session=${token}`;
    }
    owner = await member('OWNER'); manager = await member('MANAGER'); limited = await member('MANAGER',otherLocation);
  });
  beforeEach(async () => { await prisma.rateLimitBucket.deleteMany(); });
  afterAll(async () => {
    const where = { location: { organizationId: org } };
    await prisma.menu.updateMany({ where, data: { currentVersionId: null } });
    await prisma.menuVersion.deleteMany({ where: { menu: where } }); await prisma.menuRoute.deleteMany({ where: { menu: where } }); await prisma.theme.deleteMany({ where: { menu: where } });
    await prisma.menuItem.deleteMany({ where: { section: { menu: where } } }); await prisma.menuSection.deleteMany({ where: { menu: where } }); await prisma.menu.deleteMany({ where });
    await prisma.securityEvent.deleteMany({ where: { organizationId: org } }); await prisma.organizationMemberLocation.deleteMany({ where: { organizationId: org } }); await prisma.organizationMember.deleteMany({ where: { organizationId: org } }); await prisma.location.deleteMany({ where: { organizationId: org } }); await prisma.organization.delete({ where: { id: org } }); await prisma.user.deleteMany({ where: { id: { in: users } } }); await app.close(); await rm(directory,{ recursive: true, force: true }); delete process.env.MEDIA_LOCAL_DIR;
  });
  it('keeps draft edits isolated, copies rollback into a new version and preserves history on unpublish', async () => {
    const menu = await create(['en','ar']); const first = await publish(menu); const slug = first.publicSlug!;
    let edited = (await api('patch',`${base()}/${menu.id}`).send({ revision: first.revision, translations: [tr('Lunch'),tr('الغداء','ar')] }).expect(200)).body as DraftMenu;
    expect(((await api('get',`/api/v1/public/menus/${slug}`, '').expect(200)).body as PublicMenu).snapshot.translations[0]!.name).toBe('Dinner');
    const second = await publish(edited,slug);
    const rollback = state((await api('post',`${base()}/${menu.id}/rollback`).send({ revision: second.revision, idempotencyKey: randomUUID(), versionId: first.currentVersionId }).expect(201)).body);
    expect(rollback.versions.map(version => version.number)).toEqual([3,2,1]); expect(rollback.currentVersionId).not.toBe(first.currentVersionId);
    expect(((await api('get',`/api/v1/public/menus/${slug}`,'').expect(200)).body as PublicMenu).snapshot.translations[0]!.name).toBe('Dinner');
    edited = (await api('get',`${base()}/${menu.id}`).expect(200)).body as DraftMenu; expect(edited.translations.find(row => row.languageTag === 'en')!.name).toBe('Lunch');
    const off = state((await api('post',`${base()}/${menu.id}/unpublish`).send({ revision: rollback.revision, idempotencyKey: randomUUID() }).expect(201)).body);
    expect(off.versions).toHaveLength(3); expect(off.publicSlug).toBe(slug); expect(off.currentVersionId).toBeNull(); await api('get',`/api/v1/public/menus/${slug}`,'').expect(404);
    expect((await api('get',`${base()}/${menu.id}/qr`).expect(200)).body).toEqual({ slug });
  });
  it('serializes simultaneous publishes and replays an identical idempotency key once', async () => {
    const menu = await create(), slug = randomUUID(); const body = { revision: menu.draftRevision, slug, visibility: 'PUBLIC', idempotencyKey: randomUUID() };
    const responses = await Promise.all([api('post',`${base()}/${menu.id}/publish`).send(body),api('post',`${base()}/${menu.id}/publish`).send(body)]);
    expect(responses.map(response => response.status)).toEqual([201,201]); expect(responses[0].body).toEqual(responses[1].body);
    await api('post',`${base()}/${menu.id}/publish`).send({ ...body, slug: randomUUID() }).expect(409);
    expect(await prisma.menuVersion.count({ where: { menuId: menu.id } })).toBe(1); expect(await prisma.publicationEvent.count({ where: { menuId: menu.id, kind: 'published' } })).toBe(1);
    const revision = state(responses[0].body).revision;
    const concurrent = await Promise.all([0,1].map(() => api('post',`${base()}/${menu.id}/publish`).send({ ...body, revision, idempotencyKey: randomUUID() })));
    expect(concurrent.map(response => response.status).sort()).toEqual([201,409]);
  });
  it('reserves old slugs permanently and resolves every alias directly to the canonical link', async () => {
    const menu = await create(), first = await publish(menu), nextSlug = randomUUID();
    const second = await publish({ ...menu, draftRevision: first.revision }, nextSlug);
    const old = (await api('get',`/api/v1/public/menus/${first.publicSlug!}`,'').expect(200)).body as PublicMenu;
    expect(old.slug).toBe(nextSlug); expect(old.versionId).toBe(second.currentVersionId);
    const other = await create(); await api('post',`${base()}/${other.id}/publish`).send({ revision: other.draftRevision, slug: first.publicSlug, visibility: 'PUBLIC', idempotencyKey: randomUUID() }).expect(409);
    expect(await prisma.menuVersion.count({ where: { menuId: other.id } })).toBe(0);
  });
  it('enforces publish and QR permissions independently of design and location access', async () => {
    const menu = await create(); await api('get',`${base()}/${menu.id}/publication`, limited).expect(404); await api('get',`${base()}/${menu.id}/preview`, '').expect(401);
    const designed = state((await api('patch',`${base()}/${menu.id}/design`, manager).send({ revision: menu.draftRevision, design: defaultDesign('feast') }).expect(200)).body);
    await api('post',`${base()}/${menu.id}/publish`,manager).send({ revision: designed.revision, idempotencyKey: randomUUID(), slug: randomUUID(), visibility: 'PUBLIC' }).expect(404);
    await api('get',`${base()}/${menu.id}/qr`,manager).expect(404);
    const published = await publish({ ...menu, draftRevision: designed.revision });
    await api('delete',`${base()}/${menu.id}`,manager).send({ revision: published.revision }).expect(404);
  });
  it('blocks incomplete translations, an empty visible menu, stale revisions and invalid design data atomically', async () => {
    const menu = await create(['en','ar']);
    await prisma.menuItemTranslation.deleteMany({ where: { itemId: menu.sections[0]!.items[0]!.id, languageTag: 'ar' } });
    const slug = randomUUID(); await api('post',`${base()}/${menu.id}/publish`).send({ revision: menu.draftRevision, idempotencyKey: randomUUID(), slug, visibility: 'PUBLIC' }).expect(400);
    expect(await prisma.menuRoute.findUnique({ where: { slug } })).toBeNull();
    await api('patch',`${base()}/${menu.id}/design`).send({ revision: menu.draftRevision, design: { ...defaultDesign(), tokens: { ...defaultDesign().tokens, background: 'url(https://evil.example)' } } }).expect(400);
    const good = await create(); await api('patch',`${base()}/${good.id}/design`).send({ revision: good.draftRevision-1, design: defaultDesign() }).expect(409);
    await prisma.menuSection.updateMany({ where: { menuId: good.id }, data: { isVisible: false } });
    await api('post',`${base()}/${good.id}/publish`).send({ revision: good.draftRevision, idempotencyKey: randomUUID(), slug, visibility: 'PUBLIC' }).expect(400);
  });
  it('denies cross-menu rollback and prevents direct snapshot or pointer tampering', async () => {
    const menu = await create(), first = await publish(menu), other = await create(), second = await publish(other);
    await api('post',`${base()}/${menu.id}/rollback`).send({ revision: first.revision, idempotencyKey: randomUUID(), versionId: second.currentVersionId }).expect(404);
    await expect(prisma.menuVersion.update({ where: { id: first.currentVersionId! }, data: { snapshot: {} } })).rejects.toThrow();
    await expect(prisma.menu.update({ where: { id: menu.id }, data: { currentVersionId: second.currentVersionId } })).rejects.toThrow();
  });
  it('keeps private, unpublished, archived and suspended menus inaccessible and marks responses no-store', async () => {
    const menu = await create(), privateState = await publish(menu,randomUUID(),'PRIVATE');
    await api('get',`/api/v1/public/menus/${privateState.publicSlug!}`,'').expect(404);
    const live = await publish({ ...menu, draftRevision: privateState.revision },privateState.publicSlug!,'UNLISTED');
    await api('get',`/api/v1/public/menus/${live.publicSlug!}`,'').expect('Cache-Control','no-store').expect(200);
    await prisma.location.update({ where: { id: location }, data: { status: 'SUSPENDED' } }); await api('get',`/api/v1/public/menus/${live.publicSlug!}`,'').expect(404); await prisma.location.update({ where: { id: location }, data: { status: 'ACTIVE' } });
    await prisma.organization.update({ where: { id: org }, data: { status: 'SUSPENDED' } }); await api('get',`/api/v1/public/menus/${live.publicSlug!}`,'').expect(404); await prisma.organization.update({ where: { id: org }, data: { status: 'ACTIVE' } });
    await api('delete',`${base()}/${menu.id}`).send({ revision: live.revision }).expect(200); await api('get',`/api/v1/public/menus/${live.publicSlug!}`,'').expect(404);
  });
  it('uses the workspace entitlement gate on publish and rollback while still allowing unpublish', async () => {
    const menu = await create(), published = await publish(menu);
    await prisma.organization.update({ where: { id: org }, data: { publishingEnabled: false } });
    try {
      await api('post',`${base()}/${menu.id}/publish`).send({ revision: published.revision, idempotencyKey: randomUUID(), slug: published.publicSlug, visibility: 'PUBLIC' }).expect(403);
      await api('post',`${base()}/${menu.id}/rollback`).send({ revision: published.revision, idempotencyKey: randomUUID(), versionId: published.currentVersionId }).expect(403);
      await api('post',`${base()}/${menu.id}/unpublish`).send({ revision: published.revision, idempotencyKey: randomUUID() }).expect(201);
    } finally { await prisma.organization.update({ where: { id: org }, data: { publishingEnabled: true } }); }
  });
  it('retains published images after draft detachment, revalidates media and protects old version URLs', async () => {
    let menu = await create(); const item = menu.sections[0]!.items[0]!;
    const buffer = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#ad382c' } }).png().toBuffer();
    menu = (await api('post',`${base()}/${menu.id}/items/${item.id}/images`).send({ revision: menu.draftRevision, data: buffer.toString('base64'), mimeType: 'image/png', translations: [] }).expect(201)).body as DraftMenu;
    const image = menu.sections[0]!.items[0]!.images[0]!, first = await publish(menu);
    const imagePath = `/api/v1/public/menus/${first.publicSlug!}/versions/${first.currentVersionId!}/images/${image.id}`;
    await api('get',imagePath,'').expect('Content-Type',/image\/jpeg/).expect('Cache-Control','no-store').expect(200);
    menu = (await api('delete',`${base()}/${menu.id}/images/${image.id}`).send({ revision: first.revision }).expect(200)).body as DraftMenu;
    await api('get',imagePath,'').expect(200);
    const second = await publish(menu,first.publicSlug!); await api('get',imagePath,'').expect(404);
    const restored = state((await api('post',`${base()}/${menu.id}/rollback`).send({ revision: second.revision, idempotencyKey: randomUUID(), versionId: first.currentVersionId }).expect(201)).body);
    await api('get',`/api/v1/public/menus/${first.publicSlug!}/versions/${restored.currentVersionId!}/images/${image.id}`,'').expect(200);
    expect(JSON.stringify((await api('get',`/api/v1/public/menus/${first.publicSlug!}`,'').expect(200)).body)).not.toContain('objectKey');
  });
  it('upgrades the exact foundation seed theme once while preserving its accent', async () => {
    const menu = await create();
    await prisma.theme.create({ data: { menuId: menu.id, templateKey: 'classic-grid', tokens: { accent: '#9f1723' }, layout: { family: 'classic' } } });
    const sql = readFileSync(resolve(__dirname, '../prisma/migrations/20260913110000_migrate_foundation_theme/migration.sql'), 'utf8');
    await prisma.$executeRawUnsafe(sql);
    const migrated = state((await api('get', `${base()}/${menu.id}/publication`).expect(200)).body);
    expect(migrated.design.templateKey).toBe('atelier'); expect(migrated.design.tokens.accent).toBe('#9f1723'); expect(migrated.design.layout.itemLayout).toBe('grid');
    expect(await prisma.$executeRawUnsafe(sql)).toBe(0);
  });
  it('processes durable outbox entries atomically and idempotently across competing workers', async () => {
    await publish(await create()); const worker = app.get(PublicationOutbox);
    await Promise.all([worker.drain(),worker.drain()]);
    expect(await prisma.publicationEvent.count({ where: { menu: { locationId: location }, processedAt: null } })).toBe(0);
    expect(await worker.drain()).toBe(0);
  });
});
