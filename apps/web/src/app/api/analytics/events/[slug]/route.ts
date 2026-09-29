import { forwardApiRequest } from '@/lib/proxy-api';
import { slugPattern } from '@/features/publishing/server';
export async function POST(request: Request, context: RouteContext<'/api/analytics/events/[slug]'>) {
  const { slug } = await context.params;
  if (slug.length > 100 || !slugPattern.test(slug)) return Response.json({ detail: 'Not found' }, { status: 404 });
  return forwardApiRequest(request, `/api/v1/public/menus/${slug}/events`);
}
