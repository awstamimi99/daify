import { NextResponse } from 'next/server';
import { forwardApiRequest } from '@/lib/proxy-api';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function dispatch(request: Request, context: RouteContext<'/api/platform/[...path]'>) {
  const { path } = await context.params;
  const [section, id, action] = path;
  const read = request.method === 'GET' && path.length === 1 && ['organizations', 'users', 'audit'].includes(section ?? '');
  const write = request.method === 'PATCH' && path.length === 3 && ['organizations', 'users'].includes(section ?? '') && uuid.test(id ?? '') && action === 'status';
  if (!read && !write) return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  const input = new URL(request.url).searchParams, query = new URLSearchParams();
  const allowed = section === 'audit' ? ['after', 'limit', 'search', 'organizationId', 'actorUserId'] : ['after', 'limit', 'search'];
  for (const [key, value] of input) {
    if (!read || !allowed.includes(key) || query.has(key)) return NextResponse.json({ detail: 'Invalid filter' }, { status: 400 });
    query.set(key, value);
  }
  return forwardApiRequest(request, `/api/v1/platform/${path.join('/')}${query.size ? `?${query}` : ''}`);
}
export const GET = dispatch;
export const PATCH = dispatch;
