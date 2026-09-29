import { apiFetch } from '@/lib/api';
import type { PublicMenu } from '@daify/menu-engine';
import { documentResponse, slugPattern, unavailable } from '@/features/publishing/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: RouteContext<'/r/[slug]'>) {
  const { slug } = await context.params;
  if (slug.length > 100 || !slugPattern.test(slug)) return unavailable();
  try {
    const response = await apiFetch(`/api/v1/public/menus/${slug}`);
    if (!response.ok) return unavailable(response.status === 404 ? 404 : 503);
    const menu = await response.json() as PublicMenu;
    if (menu.slug !== slug) return new Response(null, { status: 307, headers: { Location: `/r/${menu.slug}${new URL(request.url).searchParams.has('lang') ? `?lang=${encodeURIComponent(new URL(request.url).searchParams.get('lang')!)}` : ''}`, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    const signedIn = request.headers.get('cookie')?.split(';').some(value => value.trim().startsWith(`${process.env.SESSION_COOKIE_NAME ?? 'daify_session'}=`));
    return documentResponse(menu.snapshot, `/r/${menu.slug}/images/${menu.versionId}`, new URL(request.url).searchParams.get('lang') ?? undefined, false, menu.visibility === 'UNLISTED', menu.analyticsEnabled && !signedIn ? { slug: menu.slug, versionId: menu.versionId } : undefined);
  } catch { return unavailable(503); }
}
