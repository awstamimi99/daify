import 'server-only';
import { randomBytes } from 'node:crypto';
import { menuDocument } from '@daify/menu-engine';
import type { MenuSnapshot } from '@daify/menu-engine';
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function unavailable(status = 404) { return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Menu unavailable</title><body><main style="max-width:40rem;margin:15vh auto;padding:2rem;font-family:system-ui"><h1>Menu unavailable</h1><p>Please ask the restaurant for its current menu.</p><p lang="ar" dir="rtl">القائمة غير متاحة حاليًا. يرجى التواصل مع المطعم.</p></main></body></html>', { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } }); }
export function documentResponse(snapshot: MenuSnapshot, imageBase: string, language: string | undefined, preview: boolean, unlisted: boolean) {
  const nonce = randomBytes(18).toString('base64');
  return new Response(menuDocument(snapshot, { imageBase, language, preview, nonce }), { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': `default-src 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${preview ? "'self'" : "'none'"}`,
    ...(preview || unlisted ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
  } });
}
