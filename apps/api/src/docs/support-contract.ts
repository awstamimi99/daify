type Schema = Record<string, unknown>;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const object = (properties: Record<string, Schema>) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });
const array = (items: Schema) => ({ type: 'array', items });
const str = { type: 'string' }, id = { type: 'string', format: 'uuid' }, date = { type: 'string', format: 'date-time' }, bool = { type: 'boolean' }, state = { enum: ['OPEN', 'CLOSED'] };
const nullable = (value: Schema) => ({ anyOf: [value, { type: 'null' }] });
const body = { type: 'string', minLength: 1, maxLength: 4000 }, subject = { type: 'string', minLength: 3, maxLength: 160 };
export const supportSchemas = {
  SupportTicket: object({ id, organizationId: id, subject: str, status: state, createdAt: date, updatedAt: date }),
  SupportMessage: object({ id, body: str, fromPlatform: bool, createdAt: date }),
  SupportThread: object({ ticket: ref('SupportTicket'), messages: array(ref('SupportMessage')) }),
  SupportCreate: object({ subject, body }), SupportReply: object({ body }),
  SupportStatus: object({ status: state, expectedStatus: state }), SupportStatusResult: object({ id, status: state }),
  InboxNotification: object({ id, ticketId: id, kind: { enum: ['SUPPORT_REPLY', 'SUPPORT_STATUS'] }, createdAt: date, ticket: object({ subject: str }) }),
  NotificationRead: object({ read: { const: true } }),
};
const errors = Object.fromEntries([400, 401, 403, 404, 409, 413, 429, 500, 503].map(code => [code, { $ref: '#/components/responses/Problem' }]));
function operation(path: string, method: string, response: Schema, request?: string, list = false, platform = false) {
  return { tags: [platform ? 'platform' : 'support'], description: platform ? 'Requires Platform Admin AAL2 and a meaningful x-support-reason (uri: encoded for Unicode). Every read and change is audited. Replies and status changes atomically notify the ticket creator in-app.' : 'Requires support.manage on an active workspace membership. This is organization-wide access, available to owners by default and explicit grantees. Notifications are scoped to the current user and organization. Ticket replies are append-only and closed tickets reject replies.',
    parameters: [...[...path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: id })), ...(platform ? [{ name: 'x-support-reason', in: 'header', required: true, schema: str }] : []), ...(method !== 'get' ? [{ name: 'Origin', in: 'header', required: true, schema: str }] : []), ...(list ? [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } }, { name: 'after', in: 'query', schema: id }, { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 } }] : [])],
    ...(request ? { requestBody: { required: true, content: { 'application/json': { schema: ref(request) } } } } : {}),
    responses: { ...errors, [method === 'post' ? '201' : '200']: { description: 'Success', content: { 'application/json': { schema: response } } } },
  };
}
export const supportPaths: Record<string, Record<string, Schema>> = {};
for (const platform of [false, true]) {
  const base = platform ? '/platform/support' : '/organizations/{organizationId}/support';
  supportPaths[base] = { get: operation(base, 'get', array(ref('SupportTicket')), undefined, true, platform) };
  // The organizationId query filter is operator-only; tenant ownership always
  // comes from the path. State and subject filters are optional for both.
  (supportPaths[base].get!.parameters as object[]).push({ name: 'status', in: 'query', schema: state }, ...(platform ? [{ name: 'organizationId', in: 'query', schema: id }] : []));
  if (!platform) supportPaths[base].post = operation(base, 'post', ref('SupportTicket'), 'SupportCreate');
  for (const [suffix, method, response, request, list] of [
    ['/{id}', 'get', 'SupportThread', undefined, true],
    ['/{id}/messages', 'post', 'SupportMessage', 'SupportReply', false],
    ['/{id}/status', 'patch', 'SupportStatusResult', 'SupportStatus', false],
  ] as const) supportPaths[base + suffix] = { [method]: operation(base + suffix, method, ref(response), request, list, platform) };
  if (!platform) {
    supportPaths[base + '/notifications'] = { get: operation(base + '/notifications', 'get', array(ref('InboxNotification')), undefined, true) };
    supportPaths[base + '/notifications/{id}/read'] = { patch: operation(base + '/notifications/{id}/read', 'patch', ref('NotificationRead')) };
  }
}
export const operationsSchemas = {
  PlatformSubscription: object({ id, name: str, plan: ref('BillingPlan'), status: str, periodEnd: date, cancelAtEnd: bool, override: nullable(object({ limits: ref('BillingLimits'), expiresAt: date })) }),
  PlatformTemplate: object({ id: str, name: str, category: str }),
};
export const operationsPaths: Record<string, Record<string, Schema>> = {};
for (const [path, name] of [['plans', 'BillingPlan'], ['subscriptions', 'PlatformSubscription'], ['templates', 'PlatformTemplate']] as const) {
  const url = `/platform/${path}`;
  operationsPaths[url] = { get: operation(url, 'get', array(ref(name)), undefined, path !== 'templates', true) };
}
