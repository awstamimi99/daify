import { NextResponse } from 'next/server';
import { forwardApiRequest } from '@/lib/proxy-api';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function dispatch(request: Request, context: RouteContext<'/api/platform/[...path]'>) {
  const { path } = await context.params;
  const [section, id, action] = path;
  const read = request.method === 'GET' && path.length === 1 && ['organizations', 'users', 'audit', 'plans', 'subscriptions', 'templates', 'support'].includes(section ?? '');
  const write = request.method === 'PATCH' && path.length === 3 && ['organizations', 'users'].includes(section ?? '') && uuid.test(id ?? '') && action === 'status';
  const support = section === 'support' && uuid.test(id ?? '') && ((path.length === 2 && request.method === 'GET') || (path.length === 3 && ((action === 'messages' && request.method === 'POST') || (action === 'status' && request.method === 'PATCH'))));
  const billing = section === 'billing' && ((path.length === 2 && id === 'plans' && request.method === 'POST') || (path.length === 3 && id === 'plans' && uuid.test(action ?? '') && request.method === 'PATCH') || (path.length === 4 && id === 'organizations' && uuid.test(action ?? '') && path[3] === 'override' && request.method === 'POST'));
  const staff = section === 'staff' && ((path.length === 1 && ['GET', 'POST'].includes(request.method)) || (path.length === 2 && ((id === 'invitation' && request.method === 'GET') || (id === 'accept' && request.method === 'POST') || (uuid.test(id ?? '') && request.method === 'PATCH'))));
  if (!read && !write && !support && !billing && !staff) return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  const input = new URL(request.url).searchParams, query = new URLSearchParams();
  const allowed = section === 'support' ? ['after', 'limit', 'search', ...(path.length === 1 ? ['organizationId', 'status'] : [])] : section === 'audit' ? ['after', 'limit', 'search', 'organizationId', 'actorUserId'] : ['after', 'limit', 'search'];
  for (const [key, value] of input) {
    if (request.method !== 'GET' || !allowed.includes(key) || query.has(key)) return NextResponse.json({ detail: 'Invalid filter' }, { status: 400 });
    query.set(key, value);
  }
  return forwardApiRequest(request, `/api/v1/platform/${path.join('/')}${query.size ? `?${query}` : ''}`);
}
export const GET = dispatch;
export const PATCH = dispatch;

export const POST = dispatch;
