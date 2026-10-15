import { NextResponse } from 'next/server';
import { forwardApiRequest } from '@/lib/proxy-api';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  const origin = process.env.DAIFY_WEB_ORIGIN ?? 'http://localhost:3000';
  if (request.headers.get('origin') !== origin) return NextResponse.json({ detail: 'Request origin is not allowed.' }, { status: 403 });
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return NextResponse.json({ detail: 'Use application/json.' }, { status: 415 });
  let data: { organizationId?: unknown; reason?: unknown; stop?: unknown };
  try { data = await request.json(); } catch { return NextResponse.json({ detail: 'Invalid request.' }, { status: 400 }); }
  if (!data || typeof data.organizationId !== 'string' || !uuid.test(data.organizationId) || typeof data.reason !== 'string' || data.reason.trim().length < 10 || data.reason.length > 500) return NextResponse.json({ detail: 'Choose a customer and enter a reason of 10–500 characters.' }, { status: 400 });
  const reason = data.reason.trim();
  const headers = new Headers(request.headers); headers.set('x-support-reason', `uri:${encodeURIComponent(reason)}`); headers.delete('content-length');
  const result = data.stop === true ? NextResponse.json({ stopped: true }) : await forwardApiRequest(new Request(request.url, { method: 'GET', headers }), `/api/v1/platform/organizations/${data.organizationId}/workspace`);
  if (!result.ok) return result;
  for (const path of [`/api/menus/${data.organizationId}`, `/api/menu-qr/${data.organizationId}`, `/menu-preview/${data.organizationId}`]) {
    const cookieResponse = new NextResponse();
    cookieResponse.cookies.set('daify_support', JSON.stringify({ organizationId: data.organizationId, reason, expiresAt: Date.now() + 15 * 60_000 }), { path, httpOnly: true, sameSite: 'strict', secure: origin.startsWith('https:'), maxAge: data.stop === true ? 0 : 15 * 60 });
    result.headers.append('set-cookie', cookieResponse.headers.get('set-cookie')!);
  }
  result.headers.set('Cache-Control', 'no-store');
  return result;
}
