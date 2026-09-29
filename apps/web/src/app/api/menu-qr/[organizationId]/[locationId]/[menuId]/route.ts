import { apiFetch } from '@/lib/api';
import QRCode from 'qrcode';
import { unavailable, uuid } from '@/features/publishing/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: RouteContext<'/api/menu-qr/[organizationId]/[locationId]/[menuId]'>) {
  const { organizationId, locationId, menuId } = await context.params;
  if (![organizationId, locationId, menuId].every(value => uuid.test(value))) return unavailable();
  try {
    const response = await apiFetch(`/api/v1/organizations/${organizationId}/locations/${locationId}/menus/${menuId}/qr`, { headers: { cookie: request.headers.get('cookie') ?? '' } });
    if (!response.ok) return unavailable(response.status);
    const { slug } = await response.json() as { slug: string };
    const target = new URL(`/q/${slug}`, process.env.DAIFY_WEB_ORIGIN ?? 'http://localhost:3000').href;
    const png = new URL(request.url).searchParams.get('format') === 'png';
    const body = png ? new Uint8Array(await QRCode.toBuffer(target, { width: 1024, margin: 4, errorCorrectionLevel: 'M' })) : await QRCode.toString(target, { type: 'svg', margin: 4, errorCorrectionLevel: 'M' });
    return new Response(body, { headers: { 'Content-Type': png ? 'image/png' : 'image/svg+xml', 'Content-Disposition': `attachment; filename="${slug}-qr.${png ? 'png' : 'svg'}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return unavailable(503); }
}
