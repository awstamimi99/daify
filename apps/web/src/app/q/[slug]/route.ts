import { randomUUID } from 'node:crypto';
import { apiFetch } from '@/lib/api';
import { languageFor } from '@daify/menu-engine';
import type { PublicMenu } from '@daify/menu-engine';
import { slugPattern, unavailable } from '@/features/publishing/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: RouteContext<'/q/[slug]'>) {
  const { slug } = await context.params;
  if (slug.length > 100 || !slugPattern.test(slug)) return unavailable();
  try {
    const response = await apiFetch(`/api/v1/public/menus/${slug}`);
    if (!response.ok) return unavailable(response.status === 404 ? 404 : 503);
    const menu = await response.json() as PublicMenu;
    const language = languageFor(menu.snapshot, new URL(request.url).searchParams.get('lang') ?? undefined);
    if (menu.analyticsEnabled) {
      try {
        await apiFetch(`/api/v1/public/menus/${slug}/events`, { method: 'POST', signal: AbortSignal.timeout(1000),
          headers: { 'content-type': 'application/json', origin: process.env.DAIFY_WEB_ORIGIN ?? 'http://localhost:3000', ...Object.fromEntries(['user-agent', 'cookie', 'dnt', 'sec-gpc', 'purpose', 'sec-purpose'].flatMap(name => request.headers.has(name) ? [[name, request.headers.get(name)!]] : [])) },
          body: JSON.stringify({ id: randomUUID(), versionId: menu.versionId, kind: 'QR_REDIRECT', language }),
        });
      } catch { /* Analytics failure must never break a restaurant's QR link. */ }
    }
    const suffix = new URL(request.url).searchParams.has('lang') ? `?lang=${encodeURIComponent(language)}` : '';
    return new Response(null, { status: 307, headers: { Location: `/r/${menu.slug}${suffix}`, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  } catch { return unavailable(503); }
}
