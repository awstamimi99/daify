import { randomBytes } from 'node:crypto';
import { defaultDesign, menuDocument, templateKeys } from '@daify/menu-engine';
import type { MenuSnapshot, RenderModel, TemplateKey } from '@daify/menu-engine';
import demo from '@/features/publishing/demo.json';
import { unavailable } from '@/features/publishing/server';
export async function GET(request: Request, context: RouteContext<'/templates/[template]/preview'>) {
  const { template } = await context.params;
  if (!templateKeys.includes(template as TemplateKey)) return unavailable();
  const snapshot: MenuSnapshot = { schemaVersion: 1, defaultLanguage: 'en', supportedLanguages: ['en','ar'], restaurant: { name: demo.restaurant.name, location: '', address: demo.restaurant.address, phone: demo.restaurant.phone }, translations: [{ languageTag: 'en', name: demo.restaurant.type, description: demo.restaurant.description }], sections: [], design: defaultDesign(template as TemplateKey) };
  return new Response(menuDocument(snapshot,{ imageBase: '', language: new URL(request.url).searchParams.get('lang') ?? 'en', nonce: randomBytes(18).toString('base64'), demoModel: demo as RenderModel }),{ headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' } });
}
