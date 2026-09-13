import { colorKeys, layoutOptions, templateKeys } from '@daify/menu-engine';
type Schema = Record<string, unknown>;
const text: Schema = { type: 'string' }, id: Schema = { type: 'string', format: 'uuid' }, bool: Schema = { type: 'boolean' }, revision: Schema = { type: 'integer', minimum: 1 };
const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const object = (properties: Record<string, Schema>, optional: string[] = []): Schema => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties).filter(key => !optional.includes(key)) });
const array = (items: Schema): Schema => ({ type: 'array', items });
const nullable = (value: Schema): Schema => ({ anyOf: [value, { type: 'null' }] });
const translation = object({ languageTag: text, name: text, description: text });
const image = object({ id, translations: array(object({ languageTag: text, altText: text })) });
const item = object({ id, price: text, currency: text, isAvailable: bool, isFeatured: bool, allergens: array(text), dietaryTags: array(text), translations: array(translation), images: array(image) });
const visibility = { enum: ['PUBLIC','UNLISTED','PRIVATE'] };
const slug = { type: 'string', minLength: 1, maxLength: 100, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' };
const block = object({ type: { enum: ['featured','menu','story','gallery'] }, visible: bool, heading: { type: 'string', maxLength: 160 }, headingAr: { type: 'string', maxLength: 160 }, body: { type: 'string', maxLength: 2000 }, bodyAr: { type: 'string', maxLength: 2000 }, imageId: id, imageIds: { ...array(id), maxItems: 12 }, imagePosition: { enum: ['left','right'] }, columns: { enum: [2,3,4] } }, ['heading','headingAr','body','bodyAr','imageId','imageIds','imagePosition','columns']);
export const publishingSchemas = {
  MenuDesign: object({ schemaVersion: { const: 1 }, templateKey: { enum: templateKeys }, tokens: object({ ...Object.fromEntries(colorKeys.map(key => [key, { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }])), cardRadius: text, buttonRadius: text }), layout: object(Object.fromEntries(Object.entries(layoutOptions).map(([key,values]) => [key,{ enum: values }]))), heroImageId: id, footerImageId: id, blocks: { ...array(block), minItems: 1, maxItems: 12 } }, ['heroImageId','footerImageId']),
  MenuSnapshot: object({ schemaVersion: { const: 1 }, defaultLanguage: text, supportedLanguages: array(text), restaurant: object({ name: text, location: text, phone: text, address: text }), translations: array(translation), sections: array(object({ id, translations: array(translation), items: array(item) })), design: ref('MenuDesign') }),
  PublicationState: object({ revision, publicSlug: nullable(slug), visibility, currentVersionId: nullable(id), publishingEnabled: bool, design: ref('MenuDesign'), versions: array(object({ id, number: revision, publishedAt: { type: 'string', format: 'date-time' }, publishedById: id, sourceDraftRevision: revision, rollbackSourceId: nullable(id) })) }),
  SaveMenuDesign: object({ revision, design: ref('MenuDesign') }),
  PublishMenu: object({ revision, idempotencyKey: id, slug, visibility }),
  RollbackMenu: object({ revision, idempotencyKey: id, versionId: id }),
  UnpublishMenu: object({ revision, idempotencyKey: id }),
  MenuQr: object({ slug }),
  PublicMenu: object({ slug, requestedSlug: slug, visibility: { enum: ['PUBLIC','UNLISTED'] }, versionId: id, version: revision, snapshot: ref('MenuSnapshot') }),
};
const root = '/organizations/{organizationId}/locations/{locationId}/menus/{menuId}';
function operation(path: string, method: string, operationId: string, result: string, body?: string, publicAccess = false): Schema {
  const parameters: object[] = [...path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: match[1] === 'slug' ? slug : id }));
  if (method !== 'get') parameters.push({ name: 'Origin', in: 'header', required: true, schema: { type: 'string', format: 'uri' } });
  const content = result === 'image' ? { 'image/jpeg': { schema: { type: 'string', format: 'binary' } } } : { 'application/json': { schema: ref(result) } };
  return { operationId, tags: ['publishing'], parameters, ...(publicAccess ? { security: [] } : {}),
    description: publicAccess ? 'Only the current immutable version is public. Inactive, archived, private and unpublished resources return 404. No-store; canonical aliases are resolved by the web route.' : 'Requires active tenant and location scope. Publishing uses an optimistic draft revision plus an idempotency key. Rollback creates a new immutable version and preserves the draft.',
    ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: ref(body) } } } } : {}),
    responses: { [method === 'post' ? '201' : '200']: { description: 'Success', content }, ...Object.fromEntries([400,401,403,404,409,429,500,503].map(status => [status,{ $ref: '#/components/responses/Problem' }])) } };
}
export const publishingPaths: Record<string, Record<string, Schema>> = {};
for (const [suffix, method, operationId, result, body] of [
  ['publication','get','getPublication','PublicationState'], ['preview','get','getMenuPreview','MenuSnapshot'], ['qr','get','getMenuQr','MenuQr'],
  ['design','patch','saveMenuDesign','PublicationState','SaveMenuDesign'], ['publish','post','publishMenu','PublicationState','PublishMenu'], ['rollback','post','rollbackMenu','PublicationState','RollbackMenu'], ['unpublish','post','unpublishMenu','PublicationState','UnpublishMenu'],
] as const) { const path = `${root}/${suffix}`; publishingPaths[path] = { [method]: operation(path,method,operationId,result,body) }; }
const publicRoot = '/public/menus/{slug}';
publishingPaths[publicRoot] = { get: operation(publicRoot,'get','getPublicMenu','PublicMenu',undefined,true) };
const publicImage = `${publicRoot}/versions/{versionId}/images/{imageId}`;
publishingPaths[publicImage] = { get: operation(publicImage,'get','getPublishedMenuImage','image',undefined,true) };
