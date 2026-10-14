import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { defaultDesign } from '@daify/menu-engine';
import type { AnalyticsReport } from '../../../packages/types/src/analytics';
import type { Prisma } from '../src/generated/prisma/client';
import { createApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { CryptoService } from '../src/auth/crypto.service';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { AnalyticsWorker } from '../src/analytics/analytics-worker.service';
import { environmentSchema } from '../src/common/config/environment';
import { contractRequest } from './support/contract-request';

describe('M7 anonymous analytics', () => {
  let app: INestApplication, prisma: PrismaService, config: ConfigService, analytics: AnalyticsService;
  let org: string, otherOrg: string, location: string, otherLocation: string, menu: string, version: string, slug: string, section: string, item: string;
  let owner: string, manager: string, outsider: string;
  const users: string[] = [], orgs: string[] = [], menus: string[] = [];
  const today = () => new Date().toISOString().slice(0, 10);
  const body = (kind = 'MENU_VIEW', targetId?: string) => ({ id: randomUUID(), versionId: version, kind, language: 'en', ...(targetId ? { targetId } : {}) });
  const send = (data = body()) => contractRequest(app.getHttpServer() as Server).post(`/api/v1/public/menus/${slug}/events`).set('Origin', 'http://localhost:3000').set('User-Agent', 'Mozilla/5.0 guest test').send(data);
  const report = (cookie = owner, query = '', organizationId = org) => contractRequest(app.getHttpServer() as Server).get(`/api/v1/organizations/${organizationId}/analytics${query}`).set('Cookie', cookie);
  async function session(organizationId?: string, locationId?: string) {
    const crypto = app.get(CryptoService), token = crypto.opaqueToken();
    const user = await prisma.user.create({ data: { email: `analytics-${randomUUID()}@example.com`, passwordHash: 'unused', status: 'ACTIVE', emailVerifiedAt: new Date() } }); users.push(user.id);
    await prisma.session.create({ data: { userId: user.id, tokenHash: crypto.tokenHash(token), expiresAt: new Date(Date.now() + 2 * 86400000), absoluteExpiresAt: new Date(Date.now() + 3 * 86400000) } });
    if (organizationId) {
      const member = await prisma.organizationMember.create({ data: { userId: user.id, organizationId, role: locationId ? 'MANAGER' : 'OWNER', status: 'ACTIVE', allLocations: !locationId, permissions: [] } });
      if (locationId) await prisma.organizationMemberLocation.create({ data: { organizationId, organizationMemberId: member.id, locationId } });
    }
    return `daify_session=${token}`;
  }
  beforeAll(async () => { app = await createApp(); await app.init(); prisma = app.get(PrismaService); config = app.get(ConfigService); analytics = app.get(AnalyticsService); });
  beforeEach(async () => {
    config.set('ANALYTICS_MODE', 'local'); await prisma.rateLimitBucket.deleteMany();
    org = (await prisma.organization.create({ data: { name: 'Analytics Kitchen', slug: `analytics-${randomUUID()}` } })).id; orgs.push(org);
    otherOrg = (await prisma.organization.create({ data: { name: 'Other Kitchen', slug: `analytics-${randomUUID()}` } })).id; orgs.push(otherOrg);
    const loc = async () => (await prisma.location.create({ data: { organizationId: org, name: 'Branch', slug: randomUUID(), currency: 'KWD', timezone: 'Asia/Kuwait', defaultLanguage: 'en' } })).id;
    location = await loc(); otherLocation = await loc(); owner = await session(org); manager = await session(org, location); outsider = await session(otherOrg);
    section = randomUUID(); item = randomUUID(); slug = `analytics-${randomUUID()}`;
    const created = await prisma.menu.create({ data: { locationId: location, name: 'Dinner', slug, defaultLanguage: 'en', supportedLanguages: ['en', 'ar'], status: 'PUBLISHED', publicSlug: slug } }); menu = created.id; menus.push(menu);
    const actor = await prisma.organizationMember.findFirstOrThrow({ where: { organizationId: org } });
    const published = await prisma.menuVersion.create({ data: { menuId: menu, number: 1, publishedById: actor.userId, sourceDraftRevision: 1, snapshot: { schemaVersion: 1, defaultLanguage: 'en', supportedLanguages: ['en', 'ar'], restaurant: { name: 'Analytics Kitchen', location: 'City', phone: '', address: '' }, translations: [], design: defaultDesign() as unknown as Prisma.InputJsonValue, sections: [{ id: section, translations: [], items: [{ id: item, translations: [], images: [], price: '1.000', currency: 'KWD', allergens: [], dietaryTags: [], isAvailable: true, isFeatured: false }] }] } } }); version = published.id;
    await prisma.menu.update({ where: { id: menu }, data: { currentVersionId: version } }); await prisma.menuRoute.create({ data: { slug, menuId: menu } });
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await prisma.analyticsEvent.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.analyticsDaily.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.menu.updateMany({ where: { id: { in: menus } }, data: { currentVersionId: null } });
    await prisma.menuVersion.deleteMany({ where: { menuId: { in: menus } } }); await prisma.menuRoute.deleteMany({ where: { menuId: { in: menus } } }); await prisma.menu.deleteMany({ where: { id: { in: menus } } });
    await prisma.organizationMemberLocation.deleteMany({ where: { organizationId: { in: orgs } } }); await prisma.organizationMember.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.location.deleteMany({ where: { organizationId: { in: orgs } } }); await prisma.organization.deleteMany({ where: { id: { in: orgs } } }); await prisma.user.deleteMany({ where: { id: { in: users } } }); await app.close();
  });

  it('records attributed events once without storing personal data and excludes client ownership/time', async () => {
    const event = body(); await send(event).expect(204); await send(event).expect(204);
    const stored = await prisma.analyticsEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(stored).toMatchObject({ organizationId: org, locationId: location, menuId: menu, versionId: version, route: slug });
    expect(Object.keys(stored)).not.toEqual(expect.arrayContaining(['ipAddress', 'userAgent', 'cookie', 'visitorId']));
    await send({ ...body(), organizationId: otherOrg } as ReturnType<typeof body>).expect(400);
    await send({ ...body(), createdAt: '2000-01-01' } as ReturnType<typeof body>).expect(400);
    expect(await prisma.analyticsEvent.count({ where: { menuId: menu } })).toBe(1);
  });

  it('excludes bots, prefetched pages, opt-outs and session-cookie traffic', async () => {
    await send().set('User-Agent', 'Googlebot').expect(204);
    await send().set('Purpose', 'prefetch').expect(204);
    await send().set('DNT', '1').expect(204);
    await send().set('Sec-GPC', '1').expect(204);
    await send().set('Cookie', owner).expect(204);
    expect(await prisma.analyticsEvent.count({ where: { menuId: menu } })).toBe(0);
    await send().unset('Origin').expect(403);
  });

  it('fails closed when disabled and rejects local collection in production configuration', async () => {
    config.set('ANALYTICS_MODE', 'disabled'); await send().expect(204);
    expect(await prisma.analyticsEvent.count({ where: { menuId: menu } })).toBe(0);
    expect(environmentSchema.validate({ NODE_ENV: 'production', ANALYTICS_MODE: 'local' }, { abortEarly: false }).error?.details.map(error => error.path.join('.'))).toContain('ANALYTICS_MODE');
    expect(((await report().expect(200)).body as AnalyticsReport).mode).toBe('disabled');
  });

  it('rejects stale/unpublished menus, unsupported languages and invalid section/item attribution', async () => {
    await send({ ...body(), versionId: randomUUID() }).expect(404);
    await send({ ...body(), language: 'fr' }).expect(400);
    await send(body('SECTION_VIEW', item)).expect(400); await send(body('ITEM_VIEW', section)).expect(400);
    await send(body('MENU_VIEW', item)).expect(400);
    await send(body('SECTION_VIEW', section)).expect(204); await send(body('ITEM_VIEW', item)).expect(204);
    await prisma.menu.update({ where: { id: menu }, data: { visibility: 'PRIVATE' } }); await send().expect(404);
    await prisma.menu.update({ where: { id: menu }, data: { visibility: 'PUBLIC' } });
    await prisma.organization.update({ where: { id: org }, data: { status: 'SUSPENDED' } }); await send().expect(404);
  });

  it('aggregates all event kinds atomically and remains idempotent under concurrent replay', async () => {
    for (const event of [body(), body(), body('QR_REDIRECT'), body('SECTION_VIEW', section), body('ITEM_VIEW', item), { ...body('LANGUAGE_CHANGE'), language: 'ar' }]) await send(event).expect(204);
    expect(((await report().expect(200)).body as AnalyticsReport).totals.MENU_VIEW).toBe(0);
    await Promise.all([analytics.aggregate(), analytics.aggregate()]); await analytics.aggregate();
    expect(await prisma.analyticsReceipt.count({ where: { event: { menuId: menu } } })).toBe(6);
    const result = (await report().expect(200)).body as AnalyticsReport;
    expect(result.totals).toEqual({ MENU_VIEW: 2, QR_REDIRECT: 1, SECTION_VIEW: 1, ITEM_VIEW: 1, LANGUAGE_CHANGE: 1 });
    expect(result.days.at(-1)).toEqual({ day: today(), views: 2, qr: 1 });
    expect(result.languages).toEqual([{ language: 'en', views: 2 }]); expect(result.updatedAt).not.toBeNull();
  });

  it('enforces tenant and location scope on both filtered and unfiltered reports', async () => {
    const daily = { day: new Date(`${today()}T00:00:00Z`), organizationId: org, menuId: menu, versionId: version, route: slug, kind: 'MENU_VIEW', language: 'en' };
    await prisma.analyticsDaily.createMany({ data: [{ ...daily, key: randomUUID().padEnd(64, 'a'), locationId: location, count: 3 }, { ...daily, key: randomUUID().padEnd(64, 'b'), locationId: otherLocation, count: 7 }] });
    expect(((await report().expect(200)).body as AnalyticsReport).totals.MENU_VIEW).toBe(10);
    expect(((await report(manager).expect(200)).body as AnalyticsReport).totals.MENU_VIEW).toBe(3);
    await report(manager, `?locationId=${otherLocation}`).expect(404);
    await report(outsider).expect(404); await report('').expect(401);
    expect(((await report(outsider, '', otherOrg).expect(200)).body as AnalyticsReport).totals.MENU_VIEW).toBe(0);
    await report(manager, `?menuId=${randomUUID()}`).expect(404);
    jest.spyOn(prisma.analyticsEvent, 'findMany').mockRejectedValue(new Error('raw events must not be queried'));
    await report(manager).expect(200);
  });

  it('validates actual calendar dates and bounded date ranges', async () => {
    for (const query of ['?from=2026-02-30', '?from=2020-01-01', '?from=2026-01-10&to=2026-01-01', '?to=2999-01-01', '?locationId=bad', '?unexpected=true']) await report(owner, query).expect(400);
  });

  it('protects event facts from edits and expires raw events and old totals', async () => {
    const old = body();
    await prisma.analyticsEvent.create({ data: { ...old, organizationId: org, locationId: location, menuId: menu, route: slug, createdAt: new Date(Date.now() - 31 * 86400000) } });
    await expect(prisma.analyticsEvent.update({ where: { id: old.id }, data: { language: 'ar' } })).rejects.toThrow();
    await prisma.analyticsDaily.create({ data: { key: randomUUID().padEnd(64, 'c'), day: new Date('2000-01-01'), organizationId: org, locationId: location, menuId: menu, versionId: version, route: slug, kind: 'MENU_VIEW', language: 'en', count: 9 } });
    await analytics.aggregate();
    expect(await prisma.analyticsEvent.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await prisma.analyticsDaily.count({ where: { menuId: menu } })).toBe(0);
  });

  it('rolls back totals if receipt persistence fails, then safely retries', async () => {
    await send().expect(204);
    const original = prisma.$transaction.bind(prisma);
    jest.spyOn(prisma, '$transaction').mockImplementationOnce(((operation: (tx: unknown) => Promise<unknown>) => original(async tx => {
      const wrapped = Object.create(tx) as typeof tx;
      Object.defineProperty(wrapped, 'analyticsReceipt', { value: { create: () => { throw new Error('receipt unavailable'); } } });
      return operation(wrapped);
    })) as typeof prisma.$transaction);
    await expect(analytics.aggregate()).rejects.toThrow('receipt unavailable');
    expect(await prisma.analyticsDaily.count({ where: { menuId: menu } })).toBe(0);
    await analytics.aggregate(); expect(((await report().expect(200)).body as AnalyticsReport).totals.MENU_VIEW).toBe(1);
  });

  (process.env.ANALYTICS_TEST_REDIS_URL ? it : it.skip)('processes durable events through a real BullMQ worker', async () => {
    await send().expect(204);
    config.set('ANALYTICS_REDIS_URL', process.env.ANALYTICS_TEST_REDIS_URL);
    const worker = new AnalyticsWorker(config, analytics);
    try {
      worker.onModuleInit();
      const deadline = Date.now() + 12000;
      while (await prisma.analyticsReceipt.count({ where: { event: { menuId: menu } } }) === 0 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
      expect(await prisma.analyticsReceipt.count({ where: { event: { menuId: menu } } })).toBe(1);
    } finally { await worker.onModuleDestroy(); config.set('ANALYTICS_REDIS_URL', undefined); }
  }, 15000);
});
