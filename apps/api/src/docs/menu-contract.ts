type Schema = Record<string, unknown>;
const text = { type: 'string' };
const id = { type: 'string', format: 'uuid' };
const boolean = { type: 'boolean' };
const position = { type: 'integer', minimum: 0, maximum: 1000 };
const revision = { type: 'integer', minimum: 1 };
const reference = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const array = (items: Schema) => ({ type: 'array', items });
const object = (properties: Record<string, Schema>, optional: string[] = []) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties).filter(key => !optional.includes(key)) });
const translation = object({ languageTag: { type: 'string', minLength: 2, maxLength: 35 }, name: { type: 'string', maxLength: 160 }, description: { type: 'string', maxLength: 2000 } }, ['description']);
const translations = { ...array(translation), minItems: 1, maxItems: 10 };
const alt = object({ languageTag: { type: 'string', minLength: 2, maxLength: 35 }, altText: { type: 'string', maxLength: 500 } });
const altRows = { ...array(alt), maxItems: 10 };
const menuFields = { name: { type: 'string', minLength: 2, maxLength: 160 }, slug: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }, defaultLanguage: { type: 'string', minLength: 2, maxLength: 35 }, supportedLanguages: { ...array(text), minItems: 1, maxItems: 10 }, translations };
const itemFields = { revision, translations, price: { type: 'string', pattern: '^(0|[1-9]\\d{0,8})(\\.\\d{1,3})?$' }, isAvailable: boolean, isFeatured: boolean, allergens: { ...array({ type: 'string', maxLength: 60 }), maxItems: 30 }, dietaryTags: { ...array({ type: 'string', maxLength: 60 }), maxItems: 30 }, sectionId: id, position };
const image = object({ id, mimeType: { const: 'image/jpeg' }, bytes: { type: 'integer' }, width: { type: 'integer' }, height: { type: 'integer' }, position, translations: altRows });
const item = object({ id, sectionId: id, stableKey: text, position, price: text, currency: text, isAvailable: boolean, isFeatured: boolean, allergens: array(text), dietaryTags: array(text), translations: array(translation), images: array(image) });
const section = object({ id, stableKey: text, position, isVisible: boolean, translations: array(translation), items: array(item) });
const summary = { id, name: text, slug: text, defaultLanguage: text, supportedLanguages: array(text), draftRevision: revision, updatedAt: { type: 'string', format: 'date-time' }, status: text };
const missing = array(object({ entity: text, id, field: text }));
export const menuSchemas = {
  DraftMenuSummary: object(summary),
  DraftMenu: object({ ...summary, locationId: id, currency: text, translations: array(translation), sections: array(section), completeness: object({ version: { const: 1 }, languages: array(object({ languageTag: text, complete: boolean, missingRequired: missing, missingOptional: missing })) }) }),
  CreateDraftMenu: object(menuFields),
  UpdateDraftMenu: object({ revision, ...menuFields }, Object.keys(menuFields)),
  DraftRevision: object({ revision }),
  MenuArchived: object({ archived: { const: true }, id }),
  SaveSection: object({ revision, translations, isVisible: boolean, position }, ['isVisible', 'position']),
  SaveItem: object(itemFields, ['sectionId', 'position']),
  ItemAvailability: object({ revision, isAvailable: boolean }),
  UploadItemImage: object({ revision, mimeType: { enum: ['image/jpeg', 'image/png', 'image/webp'] }, data: { type: 'string', maxLength: 2796204, contentEncoding: 'base64' }, translations: altRows }),
  UpdateItemImage: object({ revision, translations: altRows }),
};
const root = '/organizations/{organizationId}/locations/{locationId}/menus';
function op(method: string, path: string, operationId: string, body?: string, result = 'DraftMenu') {
  const parameters: object[] = [...path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: id }));
  if (method !== 'get') parameters.push({ name: 'Origin', in: 'header', required: true, schema: { type: 'string', format: 'uri' } });
  const status = method === 'post' ? '201' : '200';
  return { operationId, tags: ['menus'], description: 'Tenant/location scoped draft resource. Mutations require the last observed draft revision; a stale revision returns 409 without overwriting data. Missing secondary translations are reported by completeness version 1. Availability is authorized separately from content editing.', parameters,
    ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: reference(body) } } } } : {}),
    responses: { [status]: { description: 'Draft operation succeeded.', content: { 'application/json': { schema: result === 'DraftMenuList' ? array(reference('DraftMenuSummary')) : reference(result) } } }, ...Object.fromEntries([400, 401, 403, 404, 409, 413, 429, 500, 503].map(code => [code, { $ref: '#/components/responses/Problem' }])) },
  };
}
const entry = (path: string, methods: [string, string, string?, string?][]) => [path, Object.fromEntries(methods.map(([method, operationId, body, result]) => [method, op(method, path, operationId, body, result)]))];
export const menuPaths = Object.fromEntries([
  entry(root, [['get', 'listDraftMenus', undefined, 'DraftMenuList'], ['post', 'createDraftMenu', 'CreateDraftMenu']]),
  entry(`${root}/{menuId}`, [['get', 'getDraftMenu'], ['patch', 'updateDraftMenu', 'UpdateDraftMenu'], ['delete', 'archiveDraftMenu', 'DraftRevision', 'MenuArchived']]),
  entry(`${root}/{menuId}/sections`, [['post', 'createMenuSection', 'SaveSection']]),
  entry(`${root}/{menuId}/sections/{sectionId}`, [['patch', 'updateMenuSection', 'SaveSection'], ['delete', 'archiveMenuSection', 'DraftRevision']]),
  entry(`${root}/{menuId}/sections/{sectionId}/items`, [['post', 'createMenuItem', 'SaveItem']]),
  entry(`${root}/{menuId}/items/{itemId}`, [['patch', 'updateMenuItem', 'SaveItem'], ['delete', 'archiveMenuItem', 'DraftRevision']]),
  entry(`${root}/{menuId}/items/{itemId}/availability`, [['patch', 'updateMenuItemAvailability', 'ItemAvailability']]),
  entry(`${root}/{menuId}/items/{itemId}/images`, [['post', 'uploadMenuItemImage', 'UploadItemImage']]),
  entry(`${root}/{menuId}/images/{imageId}`, [['patch', 'updateMenuImageText', 'UpdateItemImage'], ['delete', 'detachMenuImage', 'DraftRevision']]),
]) as Record<string, Record<string, ReturnType<typeof op>>>;
menuPaths[`${root}/{menuId}/images/{imageId}`]!.get = {
  ...op('get', `${root}/{menuId}/images/{imageId}`, 'getPrivateMenuImage'),
  responses: { ...op('get', root, '').responses, '200': { description: 'Private JPEG image, no-store and nosniff. Requires current scoped membership.', content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } } } } },
} as unknown as ReturnType<typeof op>;
