import { forwardApiRequest } from '@/lib/proxy-api';
import { uuid } from '@/features/publishing/server';
export async function GET(request: Request, context: RouteContext<'/api/analytics/[organizationId]'>) {
  const { organizationId } = await context.params;
  if (!uuid.test(organizationId)) return Response.json({ detail: 'Not found' }, { status: 404 });
  const query = new URLSearchParams();
  for (const [key, value] of new URL(request.url).searchParams) {
    if (!['from', 'to', 'locationId', 'menuId'].includes(key) || query.has(key)) return Response.json({ detail: 'Invalid filter' }, { status: 400 });
    query.set(key, value);
  }
  return forwardApiRequest(request, `/api/v1/organizations/${organizationId}/analytics${query.size ? `?${query}` : ''}`);
}
