import { apiFetch } from '@/lib/api';
import { slugPattern, unavailable, uuid } from '@/features/publishing/server';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: RouteContext<'/r/[slug]/images/[versionId]/[imageId]'>) {
  const { slug, versionId, imageId } = await context.params;
  if (slug.length > 100 || !slugPattern.test(slug) || !uuid.test(versionId) || !uuid.test(imageId)) return unavailable();
  try { const response = await apiFetch(`/api/v1/public/menus/${slug}/versions/${versionId}/images/${imageId}`); if (!response.ok) return unavailable(response.status === 404 ? 404 : 503); return new Response(await response.arrayBuffer(), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); } catch { return unavailable(503); }
}
