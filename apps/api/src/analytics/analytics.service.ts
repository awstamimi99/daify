import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import type { MenuSnapshot } from '@daify/menu-engine';
import { PrismaService } from '../database/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import type { AnalyticsEventDto, AnalyticsQuery } from './analytics.dto';
import { eventKinds } from './analytics.dto';

const DAY = 86400000;
const day = (date: Date) => date.toISOString().slice(0, 10);
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly authorization: AuthorizationService) {}
  enabled() { return this.config.get('ANALYTICS_MODE') === 'local' && this.config.get('NODE_ENV') !== 'production'; }

  async receive(slug: string, dto: AnalyticsEventDto, request: Request) {
    if (!this.enabled()) return;
    const agent = request.get('user-agent') ?? '';
    const cookieName = this.config.get<string>('SESSION_COOKIE_NAME', 'daify_session');
    // Suppress logged-in/editor traffic, including stale session cookies. No
    // visitor identifier or user agent is stored with an analytics event.
    if (!agent || /bot|crawler|spider|headless|preview|facebookexternalhit|slurp/i.test(agent) || request.get('dnt') === '1' || request.get('sec-gpc') === '1' || /prefetch|prerender/i.test(`${request.get('purpose') ?? ''} ${request.get('sec-purpose') ?? ''}`) || request.headers.cookie?.split(';').some(value => value.trim().startsWith(`${cookieName}=`))) return;
    const route = await this.prisma.menuRoute.findUnique({ where: { slug }, include: { menu: { include: { currentVersion: true, location: { include: { organization: true } } } } } });
    const menu = route?.menu, location = menu?.location, org = location?.organization;
    if (!menu?.currentVersion || menu.currentVersionId !== dto.versionId || menu.status !== 'PUBLISHED' || menu.visibility === 'PRIVATE' || menu.archivedAt || location?.status !== 'ACTIVE' || location.archivedAt || org?.status !== 'ACTIVE' || org.archivedAt) throw new NotFoundException('Published menu was not found.');
    const snapshot = menu.currentVersion.snapshot as unknown as MenuSnapshot;
    if (!snapshot.supportedLanguages.includes(dto.language)) throw new BadRequestException('Unsupported menu language.');
    const validTarget = dto.kind === 'SECTION_VIEW' ? snapshot.sections.some(section => section.id === dto.targetId) : dto.kind === 'ITEM_VIEW' ? snapshot.sections.some(section => section.items.some(item => item.id === dto.targetId)) : dto.targetId === undefined;
    if (!validTarget) throw new BadRequestException('Invalid analytics target.');
    await this.prisma.analyticsEvent.createMany({ data: [{ id: dto.id, organizationId: org.id, locationId: location.id, menuId: menu.id, versionId: dto.versionId, route: slug, kind: dto.kind, language: dto.language, targetId: dto.targetId ?? '' }], skipDuplicates: true });
  }

  async aggregate(now = new Date()) {
    return this.prisma.$transaction(async tx => {
      // A PostgreSQL transaction lock makes retries safe even after Redis loss.
      const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(7142026) AS acquired`;
      if (!lock?.acquired) return 0;
      const rawCutoff = new Date(now.getTime() - 30 * DAY);
      const rows = await tx.analyticsEvent.findMany({ where: { receipt: null, createdAt: { gte: rawCutoff, lte: now } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 250 });
      for (const row of rows) {
        const dimensions = { day: new Date(`${day(row.createdAt)}T00:00:00Z`), organizationId: row.organizationId, locationId: row.locationId, menuId: row.menuId, versionId: row.versionId, route: row.route, kind: row.kind, language: row.language, targetId: row.targetId };
        const key = createHash('sha256').update(JSON.stringify(dimensions)).digest('hex');
        await tx.analyticsDaily.upsert({ where: { key }, create: { key, ...dimensions, count: 1 }, update: { count: { increment: 1 } } });
        await tx.analyticsReceipt.create({ data: { eventId: row.id } });
      }
      // Bounded cleanup avoids an unbounded delete after a long outage.
      const expired = await tx.analyticsEvent.findMany({ where: { createdAt: { lt: rawCutoff } }, select: { id: true }, take: 500 });
      await tx.analyticsEvent.deleteMany({ where: { id: { in: expired.map(row => row.id) } } });
      const cutoff = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()));
      const oldTotals = await tx.analyticsDaily.findMany({ where: { day: { lt: cutoff } }, select: { key: true }, take: 500 });
      await tx.analyticsDaily.deleteMany({ where: { key: { in: oldTotals.map(row => row.key) } } });
      return rows.length;
    }, { timeout: 20_000 });
  }

  async report(userId: string, organizationId: string, query: AnalyticsQuery) {
    const membership = await this.authorization.requireOrganization(userId, organizationId, 'analytics.read');
    const now = new Date(), from = query.from ?? day(new Date(now.getTime() - 29 * DAY)), to = query.to ?? day(now);
    const start = new Date(`${from}T00:00:00Z`), end = new Date(`${to}T00:00:00Z`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || day(start) !== from || day(end) !== to || start > end || end.getTime() - start.getTime() > 92 * DAY || end > now) throw new BadRequestException('Choose a valid range of up to 93 days, ending today or earlier.');
    const locations = await this.prisma.location.findMany({ where: { organizationId, status: 'ACTIVE', archivedAt: null, ...(membership.allLocations ? {} : { id: { in: membership.locationScopes.map(scope => scope.locationId) } }) }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
    if (query.locationId && !locations.some(location => location.id === query.locationId)) throw new NotFoundException('Location was not found.');
    const locationIds = query.locationId ? [query.locationId] : locations.map(location => location.id);
    if (query.menuId && !await this.prisma.menu.findFirst({ where: { id: query.menuId, locationId: { in: locationIds } } })) throw new NotFoundException('Menu was not found.');
    const where = { organizationId, locationId: { in: locationIds }, ...(query.menuId ? { menuId: query.menuId } : {}), day: { gte: start, lte: end } };
    // Only aggregated data is read here. Raw events have no public/tenant API.
    const [daily, languages, latest] = await Promise.all([
      this.prisma.analyticsDaily.groupBy({ by: ['day', 'kind'], where, _sum: { count: true }, orderBy: { day: 'asc' } }),
      this.prisma.analyticsDaily.groupBy({ by: ['language'], where: { ...where, kind: 'MENU_VIEW' }, _sum: { count: true } }),
      this.prisma.analyticsDaily.aggregate({ where, _max: { updatedAt: true } }),
    ]);
    const totals = Object.fromEntries(eventKinds.map(kind => [kind, 0])) as Record<typeof eventKinds[number], number>;
    const days = Array.from({ length: Math.round((end.getTime() - start.getTime()) / DAY) + 1 }, (_, i) => ({ day: day(new Date(start.getTime() + i * DAY)), views: 0, qr: 0 }));
    for (const row of daily) {
      const count = row._sum.count ?? 0; totals[row.kind as keyof typeof totals] += count;
      const bucket = days.find(value => value.day === day(row.day));
      if (bucket && row.kind === 'MENU_VIEW') bucket.views += count;
      if (bucket && row.kind === 'QR_REDIRECT') bucket.qr += count;
    }
    return { mode: this.enabled() ? 'local' : 'disabled', from, to, timezone: 'UTC', totals, days, languages: languages.map(row => ({ language: row.language, views: row._sum.count ?? 0 })), locations, updatedAt: latest._max.updatedAt?.toISOString() ?? null };
  }
}
