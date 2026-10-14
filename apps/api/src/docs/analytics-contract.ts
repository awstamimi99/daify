type Schema = Record<string, unknown>;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const obj = (properties: Record<string, Schema>, optional: string[] = []) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties).filter(key => !optional.includes(key)) });
const str = { type: 'string' }, id = { type: 'string', format: 'uuid' }, count = { type: 'integer', minimum: 0 };
const kinds = ['MENU_VIEW', 'QR_REDIRECT', 'LANGUAGE_CHANGE', 'SECTION_VIEW', 'ITEM_VIEW'];
export const analyticsSchemas = {
  AnalyticsEventRequest: obj({ id, versionId: id, kind: { enum: kinds }, language: { type: 'string', minLength: 2, maxLength: 35 }, targetId: id }, ['targetId']),
  AnalyticsReport: obj({ mode: { enum: ['disabled', 'local'] }, from: str, to: str, timezone: { const: 'UTC' }, totals: obj(Object.fromEntries(kinds.map(kind => [kind, count]))),
    days: { type: 'array', items: obj({ day: str, views: count, qr: count }) }, languages: { type: 'array', items: obj({ language: str, views: count }) },
    locations: { type: 'array', items: obj({ id, name: str }) }, updatedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
  }),
};
const errors = Object.fromEntries([400, 401, 403, 404, 413, 429, 500, 503].map(code => [code, { $ref: '#/components/responses/Problem' }]));
export const analyticsPaths = {
  '/public/menus/{slug}/events': { post: { operationId: 'collectLocalAnalytics', tags: ['analytics'], security: [],
    description: 'Local anonymous events only. Requires same-origin transport. Disabled in production; ignores known bots, opt-out signals and session-cookie traffic. Ownership and time are server-resolved. Duplicate event IDs are acknowledged once. No raw-event read endpoint exists.',
    parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string', maxLength: 100, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } }, { name: 'Origin', in: 'header', required: true, schema: str }],
    requestBody: { required: true, content: { 'application/json': { schema: ref('AnalyticsEventRequest') } } }, responses: { ...errors, '204': { description: 'Event recorded, duplicate acknowledged, or collection suppressed' } },
  } },
  '/organizations/{organizationId}/analytics': { get: { operationId: 'getAnalyticsReport', tags: ['analytics'],
    description: 'UTC daily totals for at most 93 days. Requires analytics.read and filters every query to permitted active locations. Queries rollups only; does not trigger aggregation.',
    parameters: [{ name: 'organizationId', in: 'path', required: true, schema: id }, ...['locationId', 'menuId'].map(name => ({ name, in: 'query', schema: id })), ...['from', 'to'].map(name => ({ name, in: 'query', schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } }))],
    responses: { ...errors, '200': { description: 'Scoped daily totals', content: { 'application/json': { schema: ref('AnalyticsReport') } } } },
  } },
};
