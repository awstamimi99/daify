import { NextResponse } from 'next/server';
import { forwardApiRequest } from '@/lib/proxy-api';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function dispatch(request: Request, context: RouteContext<'/api/support/[organizationId]/[[...path]]'>) {
  const { organizationId, path = [] } = await context.params;
  const [id, action, last] = path, method = request.method;
  const valid = uuid.test(organizationId) && (
    (!path.length && ['GET', 'POST'].includes(method)) ||
    (path.length === 1 && method === 'GET' && (id === 'notifications' || uuid.test(id ?? ''))) ||
    (path.length === 2 && uuid.test(id ?? '') && ((action === 'messages' && method === 'POST') || (action === 'status' && method === 'PATCH'))) ||
    (path.length === 3 && id === 'notifications' && uuid.test(action ?? '') && last === 'read' && method === 'PATCH')
  );
  if (!valid) return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  const query = new URLSearchParams();
  for (const [key, value] of new URL(request.url).searchParams) {
    if (method !== 'GET' || !['after', 'limit', 'search', ...(!path.length ? ['status'] : [])].includes(key) || query.has(key)) return NextResponse.json({ detail: 'Invalid filter' }, { status: 400 });
    query.set(key, value);
  }
  return forwardApiRequest(request, `/api/v1/organizations/${organizationId}/support${path.length ? `/${path.join('/')}` : ''}${query.size ? `?${query}` : ''}`);
}
export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
