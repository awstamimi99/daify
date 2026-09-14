import { templateKeys } from '@daify/menu-engine';
type Schema = Record<string, unknown>;
const str = { type: 'string' }, id = { type: 'string', format: 'uuid' }, date = { type: 'string', format: 'date-time' }, bool = { type: 'boolean' };
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const array = (items: Schema) => ({ type: 'array', items });
const nullable = (value: Schema) => ({ anyOf: [value, { type: 'null' }] });
const object = (properties: Record<string, Schema>) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });
const count = { type: 'integer', minimum: 0, maximum: 100000 };
const reason = { type: 'string', minLength: 10, maxLength: 500 };
export const billingSchemas = {
  BillingLimits: object({ locations: count, menus: count, members: count, templates: { ...array({ enum: templateKeys }), uniqueItems: true }, publishing: bool }),
  BillingPlan: object({ id, code: str, version: { type: 'integer', minimum: 1 }, name: str, nameAr: str, amount: str, currency: { const: 'KWD' }, active: bool, limits: ref('BillingLimits') }),
  BillingCheckout: object({ id, plan: ref('BillingPlan'), state: { enum: ['CREATING', 'UNKNOWN', 'READY', 'PAID', 'CANCELED'] }, paymentUrl: nullable(str), createdAt: date, periodEnd: nullable(date) }),
  BillingState: object({ mode: { enum: ['disabled', 'sandbox'] }, providerReady: bool, enrolled: bool, plans: array(ref('BillingPlan')), subscription: nullable(object({ plan: ref('BillingPlan'), status: { enum: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELED'] }, periodEnd: date, graceEnd: nullable(date), cancelAtEnd: bool })), limits: nullable(ref('BillingLimits')), usage: object({ locations: count, menus: count, members: count }), checkouts: array(ref('BillingCheckout')) }),
  BillingPlanChoice: object({ planId: id }),
  BillingCheckoutRequest: object({ planId: id, idempotencyKey: id }),
  BillingPlanCreate: object({ code: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 50 }, version: { type: 'integer', minimum: 1, maximum: 100000 }, name: { type: 'string', minLength: 2, maxLength: 100 }, nameAr: { type: 'string', minLength: 2, maxLength: 100 }, amount: { type: 'string', pattern: '^\\d{1,6}(?:\\.\\d{1,3})?$' }, limits: ref('BillingLimits'), reason }),
  BillingPlanAvailability: object({ active: bool, reason }),
  BillingOverrideRequest: object({ limits: ref('BillingLimits'), expiresAt: date, reason }),
  BillingUpdated: object({ updated: { const: true } }),
};
export const billingPaths: Record<string, Record<string, Schema>> = {};
for (const [path, method, name, response, request] of [
  ['/organizations/{organizationId}/billing', 'get', 'getBilling', 'BillingState'],
  ['/organizations/{organizationId}/billing/trial', 'post', 'startSandboxTrial', 'BillingState', 'BillingPlanChoice'],
  ['/organizations/{organizationId}/billing/cancel', 'post', 'cancelSandboxSubscription', 'BillingState'],
  ['/organizations/{organizationId}/billing/checkout', 'post', 'createSandboxCheckout', 'BillingState', 'BillingCheckoutRequest'],
  ['/organizations/{organizationId}/billing/checkouts/{checkoutId}/reconcile', 'post', 'reconcileSandboxPayment', 'BillingState'],
  ['/platform/billing/plans', 'post', 'createSandboxPlan', 'BillingPlan', 'BillingPlanCreate'],
  ['/platform/billing/plans/{planId}', 'patch', 'setSandboxPlanAvailability', 'BillingPlan', 'BillingPlanAvailability'],
  ['/platform/billing/organizations/{organizationId}/override', 'post', 'overrideSandboxEntitlements', 'BillingUpdated', 'BillingOverrideRequest'],
] as const) {
  const parameters: object[] = [...path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: id }));
  if (method !== 'get') parameters.push({ name: 'Origin', in: 'header', required: true, schema: { type: 'string', format: 'uri' } });
  billingPaths[path] = { [method]: { operationId: name, tags: ['billing'], parameters,
    description: 'Sandbox only. Tenant reads require billing.read; changes require billing.manage. Trial, checkout and cancellation require AAL2. Platform commands require Platform Admin AAL2 and an audited reason. Redirects never grant access. Payment reconciliation queries the fixed MyFatoorah sandbox server.',
    ...(request ? { requestBody: { required: true, content: { 'application/json': { schema: ref(request) } } } } : {}),
    responses: { [method === 'post' ? '201' : '200']: { description: 'Success', content: { 'application/json': { schema: ref(response) } } }, ...Object.fromEntries([400, 401, 403, 404, 409, 429, 500, 503].map(status => [status, { $ref: '#/components/responses/Problem' }])) } } };
}
