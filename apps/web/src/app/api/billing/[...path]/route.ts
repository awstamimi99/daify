import { NextResponse } from 'next/server';
import { forwardApiRequest } from '@/lib/proxy-api';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function dispatch(request: Request, context: RouteContext<'/api/billing/[...path]'>) {
  const { path } = await context.params;
  const [organizationId, ...tail] = path;
  if (!organizationId || !uuid.test(organizationId)) return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  const allowed = request.method === 'GET' ? tail.length === 0 :
    (tail.length === 1 && ['trial', 'cancel', 'checkout'].includes(tail[0]!)) ||
    (tail.length === 3 && tail[0] === 'checkouts' && uuid.test(tail[1]!) && tail[2] === 'reconcile');
  if (!allowed) return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  return forwardApiRequest(request, `/api/v1/organizations/${organizationId}/billing${tail.length ? `/${tail.join('/')}` : ''}`);
}
export const GET = dispatch;
export const POST = dispatch;
