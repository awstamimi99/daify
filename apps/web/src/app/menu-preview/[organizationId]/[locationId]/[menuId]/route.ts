import { apiFetch } from '@/lib/api';
import type { MenuSnapshot } from '@daify/menu-engine';
import { documentResponse, unavailable, uuid } from '@/features/publishing/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: RouteContext<'/menu-preview/[organizationId]/[locationId]/[menuId]'>) {
  const { organizationId, locationId, menuId } = await context.params;
  if (![organizationId, locationId, menuId].every(value => uuid.test(value))) return unavailable();
  try { const response = await apiFetch(`/api/v1/organizations/${organizationId}/locations/${locationId}/menus/${menuId}/preview`, { headers: { cookie: request.headers.get('cookie') ?? '' } }); if (!response.ok) return unavailable(response.status === 401 || response.status === 404 ? 404 : 503); return documentResponse(await response.json() as MenuSnapshot, `/api/menus/${organizationId}/${locationId}/${menuId}/images`, new URL(request.url).searchParams.get('lang') ?? undefined, true, true); } catch { return unavailable(503); }
}
