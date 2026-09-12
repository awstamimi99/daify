import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { CryptoService } from '../src/auth/crypto.service';
import { contractRequest } from './support/contract-request';
import type { DraftMenu } from '../../../packages/types/src/draft-menu';

const translation = (name: string, languageTag = 'en') => ({ languageTag, name, description: '' });
const itemData = (revision: number, name = 'Soup') => ({ revision, translations: [translation(name)], price: '2.750', isAvailable: true, isFeatured: false, allergens: ['milk'], dietaryTags: ['vegetarian'] });
describe('M4 scoped draft menu platform', () => {
  let app: INestApplication; let prisma: PrismaService; let org: string; let otherOrg: string; let location: string; let otherLocation: string;
  let owner: string; let staff: string; let viewer: string; let limitedManager: string; let outsider: string;
  let directory: string;
  const userIds: string[] = [];
  const base = () => `/api/v1/organizations/${org}/locations/${location}/menus`;
  const api = (method: 'get' | 'post' | 'patch' | 'delete', path: string, cookie = owner) => contractRequest(app.getHttpServer() as Server)[method](path).set('Origin', 'http://localhost:3000').set('Cookie', cookie);
  const draft = (body: unknown) => body as DraftMenu;
  async function create(defaultLanguage = 'en', supportedLanguages = ['en', 'ar']) {
    return draft((await api('post', base()).send({ name: 'Dinner', slug: randomUUID(), defaultLanguage, supportedLanguages, translations: [translation('Dinner', defaultLanguage)] }).expect(201)).body);
  }
  async function section(menu: DraftMenu, name = 'Starters') { return draft((await api('post', `${base()}/${menu.id}/sections`).send({ revision: menu.draftRevision, translations: [translation(name, menu.defaultLanguage)] }).expect(201)).body); }
  async function withItem() {
    let menu = await section(await create());
    menu = draft((await api('post', `${base()}/${menu.id}/sections/${menu.sections[0]!.id}/items`).send(itemData(menu.draftRevision)).expect(201)).body);
    return menu;
  }
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'daify-m4-media-')); process.env.MEDIA_LOCAL_DIR = directory;
    app = await createApp(); app.get(ConfigService).set('MEDIA_LOCAL_DIR', directory);
    await app.listen(0, '127.0.0.1'); prisma = app.get(PrismaService);
    const crypto = app.get(CryptoService);
    org = (await prisma.organization.create({ data: { name: 'M4 tenant', slug: randomUUID() } })).id;
    otherOrg = (await prisma.organization.create({ data: { name: 'Other tenant', slug: randomUUID() } })).id;
    location = (await prisma.location.create({ data: { organizationId: org, name: 'Main', slug: 'main', currency: 'KWD', timezone: 'Asia/Kuwait', defaultLanguage: 'en' } })).id;
    otherLocation = (await prisma.location.create({ data: { organizationId: org, name: 'Other branch', slug: 'other', currency: 'USD', timezone: 'UTC', defaultLanguage: 'en' } })).id;
    async function member(role: 'OWNER' | 'STAFF' | 'VIEWER' | 'MANAGER', tenant = org, assigned = location) {
      const user = await prisma.user.create({ data: { email: `m4-${randomUUID()}@example.com`, status: 'ACTIVE', emailVerifiedAt: new Date(), passwordHash: 'unused-test-hash' } }); userIds.push(user.id);
      const row = await prisma.organizationMember.create({ data: { userId: user.id, organizationId: tenant, role, status: 'ACTIVE', allLocations: role === 'OWNER', permissions: [] } });
      if (!row.allLocations) await prisma.organizationMemberLocation.create({ data: { organizationId: tenant, organizationMemberId: row.id, locationId: assigned } });
      const token = crypto.opaqueToken(); await prisma.session.create({ data: { userId: user.id, tokenHash: crypto.tokenHash(token), expiresAt: new Date(Date.now() + 3600000), absoluteExpiresAt: new Date(Date.now() + 3600000) } });
      return `daify_session=${token}`;
    }
    owner = await member('OWNER'); staff = await member('STAFF'); viewer = await member('VIEWER'); limitedManager = await member('MANAGER', org, otherLocation); outsider = await member('OWNER', otherOrg);
  });
  beforeEach(async () => { await prisma.rateLimitBucket.deleteMany(); });
  afterAll(async () => {
    await prisma.securityEvent.deleteMany({ where: { organizationId: { in: [org, otherOrg] } } });
    await prisma.menuItem.deleteMany({ where: { section: { menu: { location: { organizationId: org } } } } });
    await prisma.menuSection.deleteMany({ where: { menu: { location: { organizationId: org } } } });
    await prisma.menu.deleteMany({ where: { location: { organizationId: org } } });
    await prisma.organizationMemberLocation.deleteMany({ where: { organizationId: { in: [org, otherOrg] } } });
    await prisma.location.deleteMany({ where: { organizationId: org } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: [org, otherOrg] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [org, otherOrg] } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close(); await rm(directory, { recursive: true, force: true }); delete process.env.MEDIA_LOCAL_DIR;
  });
  it('persists bilingual drafts, reports required versus optional translations and accepts single-language menus', async () => {
    const menu = await withItem();
    expect(menu.sections[0]!.items[0]!.price).toBe('2.750');
    expect(menu.completeness.languages.find(row => row.languageTag === 'en')!.complete).toBe(true);
    expect(menu.completeness.languages.find(row => row.languageTag === 'ar')!.missingRequired).toHaveLength(3);
    expect(menu.completeness.languages[0]!.missingOptional.length).toBeGreaterThan(0);
    expect(draft((await api('get', `${base()}/${menu.id}`).expect(200)).body).sections).toEqual(menu.sections);
    for (const language of ['en', 'ar', 'fr-CA']) {
      const single = await create(language, [language]); expect(single.completeness.languages).toHaveLength(1); expect(single.completeness.languages[0]!.complete).toBe(true);
    }
    const normalized = await create('fr-ca', ['fr-ca']); expect(normalized.defaultLanguage).toBe('fr-CA');
  });
  it('rejects outsiders, wrong parent chains and managers outside their location scope', async () => {
    const menu = await withItem();
    await api('get', `${base()}/${menu.id}`, outsider).expect(404);
    await api('get', `${base()}/${menu.id}`, limitedManager).expect(404);
    await api('get', `/api/v1/organizations/${org}/locations/${otherLocation}/menus/${menu.id}`).expect(404);
    await api('get', base(), viewer).expect(200);
    await api('patch', `${base()}/${menu.id}`, viewer).send({ revision: menu.draftRevision, name: 'Denied' }).expect(404);
    await api('post', base(), staff).send({ name: 'Denied', slug: randomUUID(), defaultLanguage: 'en', supportedLanguages: ['en'], translations: [translation('Denied')] }).expect(404);
  });
  it('permits staff availability but rejects content fields, image uploads and suspended membership', async () => {
    const menu = await withItem(); const id = menu.sections[0]!.items[0]!.id;
    const available = draft((await api('patch', `${base()}/${menu.id}/items/${id}/availability`, staff).send({ revision: menu.draftRevision, isAvailable: false }).expect(200)).body);
    expect(available.sections[0]!.items[0]!.isAvailable).toBe(false);
    await api('patch', `${base()}/${menu.id}/items/${id}/availability`, staff).send({ revision: available.draftRevision, isAvailable: true, price: '0' }).expect(400);
    await api('patch', `${base()}/${menu.id}/items/${id}`, staff).send(itemData(available.draftRevision)).expect(404);
    await prisma.organizationMember.updateMany({ where: { organizationId: org, role: 'STAFF' }, data: { status: 'SUSPENDED' } });
    await api('get', `${base()}/${menu.id}`, staff).expect(404);
    await prisma.organizationMember.updateMany({ where: { organizationId: org, role: 'STAFF' }, data: { status: 'ACTIVE' } });
  });
  it('serializes concurrent writes and rejects stale revisions without losing the winning edit', async () => {
    const menu = await create();
    const results = await Promise.all(['First', 'Second'].map(name => api('patch', `${base()}/${menu.id}`).send({ revision: menu.draftRevision, name })));
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    const current = draft((await api('get', `${base()}/${menu.id}`).expect(200)).body);
    expect(current.draftRevision).toBe(menu.draftRevision + 1);
    expect(current.name).toBe(draft(results.find(result => result.status === 200)!.body).name);
  });
  it('moves sections and items, keeps stable keys and soft-deletes content', async () => {
    let menu = await withItem(); const first = menu.sections[0]!; const item = first.items[0]!;
    menu = await section(menu, 'Mains'); const second = menu.sections[1]!;
    menu = draft((await api('patch', `${base()}/${menu.id}/sections/${second.id}`).send({ revision: menu.draftRevision, translations: second.translations, position: 0, isVisible: false }).expect(200)).body);
    expect(menu.sections[0]!.id).toBe(second.id);
    menu = draft((await api('patch', `${base()}/${menu.id}/items/${item.id}`).send({ ...itemData(menu.draftRevision, 'New soup'), sectionId: second.id, position: 0, isFeatured: true }).expect(200)).body);
    expect(menu.sections[0]!.items[0]!.stableKey).toBe(item.stableKey);
    expect(menu.sections[1]!.items).toHaveLength(0);
    menu = draft((await api('delete', `${base()}/${menu.id}/items/${item.id}`).send({ revision: menu.draftRevision }).expect(200)).body);
    expect((await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } })).archivedAt).not.toBeNull();
    menu = draft((await api('delete', `${base()}/${menu.id}/sections/${second.id}`).send({ revision: menu.draftRevision }).expect(200)).body);
    await api('delete', `${base()}/${menu.id}`).send({ revision: menu.draftRevision }).expect(200);
    await api('get', `${base()}/${menu.id}`).expect(404);
  });
  it('validates language sets, default names, prices and forged currency', async () => {
    const menu = await section(await create()); const target = `${base()}/${menu.id}`;
    await api('patch', target).send({ revision: menu.draftRevision, supportedLanguages: ['ar'] }).expect(400);
    await api('patch', target).send({ revision: menu.draftRevision, supportedLanguages: ['en', 'EN'] }).expect(400);
    await api('patch', target).send({ revision: menu.draftRevision, defaultLanguage: 'ar' }).expect(400);
    await api('post', `${target}/sections`).send({ revision: menu.draftRevision, translations: [translation('   ')] }).expect(400);
    for (const price of ['-1', '1e3', '2.0001']) await api('post', `${target}/sections/${menu.sections[0]!.id}/items`).send({ ...itemData(menu.draftRevision), price }).expect(400);
    await api('post', `${target}/sections/${menu.sections[0]!.id}/items`).send({ ...itemData(menu.draftRevision), currency: 'USD' }).expect(400);
    await api('patch', target).send({ revision: menu.draftRevision, translations: null }).expect(400);
  });
  it('validates, re-encodes, privately serves and detaches images without exposing keys', async () => {
    let menu = await withItem(); const itemId = menu.sections[0]!.items[0]!.id;
    const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#aaffcc' } }).png().toBuffer();
    const path = `${base()}/${menu.id}/items/${itemId}/images`;
    await api('post', path, staff).send({ revision: menu.draftRevision, mimeType: 'image/png', data: png.toString('base64'), translations: [] }).expect(404);
    await api('post', path).send({ revision: menu.draftRevision, mimeType: 'image/jpeg', data: png.toString('base64'), translations: [] }).expect(400);
    await api('post', path).send({ revision: menu.draftRevision, mimeType: 'image/png', data: Buffer.from('<svg/>').toString('base64'), translations: [] }).expect(400);
    menu = draft((await api('post', path).send({ revision: menu.draftRevision, mimeType: 'image/png', data: png.toString('base64'), translations: [{ languageTag: 'en', altText: 'Soup photo' }] }).expect(201)).body);
    const image = menu.sections[0]!.items[0]!.images[0]!;
    expect(image).not.toHaveProperty('objectKey'); expect(image.mimeType).toBe('image/jpeg');
    const content = await api('get', `${base()}/${menu.id}/images/${image.id}`, viewer).expect(200);
    expect((await sharp(content.body as Buffer).metadata()).format).toBe('jpeg'); expect(content.headers['cache-control']).toContain('no-store');
    await api('get', `${base()}/${menu.id}/images/${image.id}`, outsider).expect(404);
    menu = draft((await api('patch', `${base()}/${menu.id}/images/${image.id}`).send({ revision: menu.draftRevision, translations: [{ languageTag: 'ar', altText: 'صورة الشوربة' }] }).expect(200)).body);
    menu = draft((await api('delete', `${base()}/${menu.id}/images/${image.id}`).send({ revision: menu.draftRevision }).expect(200)).body);
    expect(menu.sections[0]!.items[0]!.images).toHaveLength(0);
    await api('get', `${base()}/${menu.id}/images/${image.id}`).expect(404);
    expect((await readdir(directory)).length).toBeGreaterThan(0); // Retained for delayed cleanup.
  });
  it('bounds JSON payloads and validates the section path even when a body supplies a real section', async () => {
    const menu = await section(await create());
    await api('post', `${base()}/${menu.id}/sections/${randomUUID()}/items`).send({ ...itemData(menu.draftRevision), sectionId: menu.sections[0]!.id }).expect(404);
    await api('post', base()).send({ padding: 'x'.repeat(101 * 1024) }).expect(413);
    await api('post', `${base()}/${menu.id}/items/${randomUUID()}/images`).send({ data: 'x'.repeat(3 * 1024 * 1024) }).expect(413);
  });
  it('uses location-specific currency precision and rejects duplicate menu slugs', async () => {
    const path = `/api/v1/organizations/${org}/locations/${otherLocation}/menus`;
    const payload = { name: 'USD Menu', slug: randomUUID(), defaultLanguage: 'en', supportedLanguages: ['en'], translations: [translation('USD Menu')] };
    let menu = draft((await api('post', path).send(payload).expect(201)).body);
    await api('post', path).send(payload).expect(409);
    menu = draft((await api('post', `${path}/${menu.id}/sections`).send({ revision: menu.draftRevision, translations: [translation('Main')] }).expect(201)).body);
    const itemsPath = `${path}/${menu.id}/sections/${menu.sections[0]!.id}/items`;
    await api('post', itemsPath).send(itemData(menu.draftRevision)).expect(400);
    menu = draft((await api('post', itemsPath).send({ ...itemData(menu.draftRevision), price: '2.75' }).expect(201)).body);
    expect(menu.sections[0]!.items[0]).toMatchObject({ currency: 'USD', price: '2.75' });
  });
  it('updates and archives locations, guards currency changes and prevents reads under archived parents', async () => {
    const menu = await create();
    const path = `/api/v1/organizations/${org}/locations/${location}`;
    const payload = { name: 'Main updated', slug: 'main', timezone: 'Asia/Kuwait', currency: 'USD', defaultLanguage: 'ar' };
    await api('patch', path).send(payload).expect(409);
    await api('patch', path, limitedManager).send({ ...payload, currency: 'KWD' }).expect(404);
    await api('patch', path).send({ ...payload, currency: 'KWD' }).expect(200);
    await api('delete', path).send({}).expect(200);
    await api('get', `${base()}/${menu.id}`).expect(404);
  });
});
