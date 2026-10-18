import { NextResponse } from 'next/server';
import { forwardApiRequest } from '@/lib/proxy-api';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function dispatch(request: Request, context: RouteContext<'/api/offers/[organizationId]/[[...path]]'>) {
  const { organizationId, path = [] } = await context.params;
  const allowed = request.method === 'GET' ? path.length === 0 : request.method === 'POST' && (path.length === 1 && ['coupon-review', 'coupon-accept'].includes(path[0]!) || path.length === 3 && path[0] === 'quotes' && uuid.test(path[1]!) && path[2] === 'accept');
  if (!uuid.test(organizationId) || !allowed || new URL(request.url).search) return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  return forwardApiRequest(request, `/api/v1/organizations/${organizationId}/offers${path.length ? `/${path.join('/')}` : ''}`);
}
export const GET = dispatch;
export const POST = dispatch;
