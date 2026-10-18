type Schema = Record<string, unknown>;
const str = { type: 'string' }, id = { type: 'string', format: 'uuid' }, date = { type: 'string', format: 'date-time' }, bool = { type: 'boolean' };
const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const object = (properties: Record<string, Schema>, optional: string[] = []): Schema => ({ type: 'object', properties, required: Object.keys(properties).filter(k => !optional.includes(k)), additionalProperties: false });
const array = (items: Schema): Schema => ({ type: 'array', items });
const nullable = (s: Schema): Schema => ({ anyOf: [s, { type: 'null' }] });
const integer = (min: number, max: number): Schema => ({ type: 'integer', minimum: min, maximum: max });
const reason = { type: 'string', minLength: 10, maxLength: 500 }, version = integer(1, 2147483647), months = integer(1, 12);
const amount = { type: 'string', pattern: '^\\d{1,6}(?:\\.\\d{1,3})?$' };
const terms = { amount, renewalAmount: amount, currency: str, months, limits: ref('BillingLimits') };
const coupon = { id, code: str, percent: integer(1, 100), months, maxRedemptions: integer(1, 100000), redeemedCount: integer(0, 100000), organizationId: nullable(id), createdById: id, expiresAt: date, revokedAt: nullable(date), reason, createdAt: date };
const quote = { id, organizationId: id, planId: id, ...terms, status: { enum: ['PENDING', 'APPROVED', 'REJECTED', 'ACCEPTED', 'WITHDRAWN'] }, version, createdById: id, approvedById: nullable(id), decidedAt: nullable(date), decisionReason: nullable(reason), reason, expiresAt: date, createdAt: date, updatedAt: date };
const allowance = { maxPercent: integer(0, 100), maxMonths: integer(0, 12), freeMonths: integer(0, 12) };
const plan = { id, name: str, nameAr: str, amount, currency: str };
const quoteInput = { organizationId: id, planId: id, amount, months, expiresAt: date, reason };
const acceptance = { id, organizationId: id, couponId: nullable(id), quoteId: nullable(id), planId: id, ...terms, acceptedById: id, acceptedAt: date, activation: { const: 'PENDING' } };
export const offersSchemas = {
  OfferCoupon: object(coupon), OfferQuote: object(quote),
  OfferCouponCreate: object({ code: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9-]{2,39}$' }, percent: integer(1, 100), months, maxRedemptions: integer(1, 100000), organizationId: nullable(id), expiresAt: date, reason }, ['organizationId']),
  OfferReason: object({ reason }),
  OfferQuoteCreate: object(quoteInput), OfferQuoteUpdate: object({ ...quoteInput, expectedVersion: version }),
  OfferQuoteDecision: object({ decision: { enum: ['APPROVE', 'REJECT', 'WITHDRAW'] }, expectedVersion: version, reason }),
  OfferAllowanceUpdate: object({ ...allowance, expectedVersion: integer(0, 2147483647), reason }),
  OfferAllowance: object({ ...allowance, staffId: id, version, updatedById: id, updatedAt: date }),
  OfferDirectory: object({ coupons: array(object({ ...coupon, canRevoke: bool })), quotes: array(ref('OfferQuote')), acceptances: array(object(acceptance)), plans: array(object({ ...plan, limits: ref('BillingLimits') })), sales: array(object({ id, email: { type: 'string', format: 'email' }, allowance: { anyOf: [object({ ...allowance, version: integer(0, 2147483647) }), ref('OfferAllowance')] } })), allowance: { anyOf: [object(allowance), object({ ...allowance, version: integer(0, 2147483647) }), ref('OfferAllowance')] }, couponCursor: nullable(id), quoteCursor: nullable(id), paymentActivation: { const: false } }),
  CustomerOffers: object({ plans: array(object(plan)), quotes: array(object({ id, planId: id, ...terms, expiresAt: date, version })), accepted: nullable(object({ id, ...terms, acceptedAt: date, activation: { const: 'PENDING' } })), acceptanceEnabled: bool, paymentActivation: { const: false } }),
  CouponReviewInput: object({ code: str, planId: id }),
  CouponReview: object({ couponId: id, planId: id, ...terms, termsHash: { type: 'string', pattern: '^[a-f0-9]{64}$' } }),
  CouponAccept: object({ code: str, planId: id, termsHash: { type: 'string', pattern: '^[a-f0-9]{64}$' }, confirm: bool }),
  QuoteAccept: object({ expectedVersion: version, confirm: bool }),
  OfferAccepted: object({ id, activation: { const: 'PENDING' } }),
};
const pathId = (name: string) => ({ name, in: 'path', required: true, schema: id });
const access = { name: 'x-support-reason', in: 'header', required: true, schema: reason };
function op(operationId: string, response: string, parameters: object[] = [], body?: string, status = 200, mutation = false) {
  return { operationId, tags: ['commercial-offers'], parameters: [...parameters, ...(mutation ? [{ name: 'Origin', in: 'header', required: true, schema: str }] : [])], ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: ref(body) } } } } : {}), responses: { [status]: { description: 'Success', content: { 'application/json': { schema: ref(response) } } }, ...Object.fromEntries([400, 401, 403, 404, 409, 429, 500, 503].map(code => [code, { $ref: '#/components/responses/Problem' }])) } };
}
export const offersPaths = {
  '/platform/offers': { get: op('listCommercialOffers', 'OfferDirectory', [access, { name: 'after', in: 'query', schema: id }, { name: 'limit', in: 'query', schema: integer(1, 100) }, { name: 'search', in: 'query', schema: str }]) },
  '/platform/offers/coupons': { post: op('createCoupon', 'OfferCoupon', [], 'OfferCouponCreate', 201, true) },
  '/platform/offers/coupons/{id}/revoke': { post: op('revokeCoupon', 'OfferCoupon', [pathId('id')], 'OfferReason', 201, true) },
  '/platform/offers/allowances/{id}': { patch: op('setSalesAllowance', 'OfferAllowance', [pathId('id')], 'OfferAllowanceUpdate', 200, true) },
  '/platform/offers/quotes': { post: op('createCustomerQuote', 'OfferQuote', [], 'OfferQuoteCreate', 201, true) },
  '/platform/offers/quotes/{id}': { patch: op('reviseCustomerQuote', 'OfferQuote', [pathId('id')], 'OfferQuoteUpdate', 200, true) },
  '/platform/offers/quotes/{id}/decision': { post: op('decideCustomerQuote', 'OfferQuote', [pathId('id')], 'OfferQuoteDecision', 201, true) },
  '/organizations/{organizationId}/offers': { get: op('getCustomerOffers', 'CustomerOffers', [pathId('organizationId')]) },
  '/organizations/{organizationId}/offers/coupon-review': { post: op('reviewCustomerCoupon', 'CouponReview', [pathId('organizationId')], 'CouponReviewInput', 201, true) },
  '/organizations/{organizationId}/offers/coupon-accept': { post: op('acceptCustomerCoupon', 'OfferAccepted', [pathId('organizationId')], 'CouponAccept', 201, true) },
  '/organizations/{organizationId}/offers/quotes/{id}/accept': { post: op('acceptCustomerQuote', 'OfferAccepted', [pathId('organizationId'), pathId('id')], 'QuoteAccept', 201, true) },
};
