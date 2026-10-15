import { staffPermissions, staffRoles } from '../platform/staff-policy';
type Schema = Record<string, unknown>;
const string = { type: 'string' }, uuid = { type: 'string', format: 'uuid' }, email = { type: 'string', format: 'email' }, date = { type: 'string', format: 'date-time' }, boolean = { type: 'boolean' };
const array = (items: Schema): Schema => ({ type: 'array', items });
const object = (properties: Record<string, Schema>, optional: string[] = []): Schema => ({ type: 'object', properties, required: Object.keys(properties).filter(k => !optional.includes(k)), additionalProperties: false });
const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { type: 'null' }] });
const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const role = { type: 'string', enum: staffRoles };
const access = { role, permissions: { ...array({ type: 'string', enum: staffPermissions }), uniqueItems: true, maxItems: 30 }, allOrganizations: boolean, organizationIds: { ...array(uuid), uniqueItems: true, maxItems: 500 } };
const reason = { type: 'string', minLength: 10, maxLength: 500 };
const status = { type: 'string', enum: ['INVITED', 'ACTIVE', 'SUSPENDED'] };
export const staffSchemas = {
  StaffAccess: object(access),
  StaffRecord: object({ id: uuid, userId: nullable(uuid), email, ...access, status, version: { type: 'integer', minimum: 1 }, invitationExpiresAt: date, createdAt: date }),
  StaffInvite: object({ email, ...access, reason }),
  StaffUpdate: object({ ...access, reason, status, expectedVersion: { type: 'integer', minimum: 1 } }),
  StaffDirectory: object({ employees: array(ref('StaffRecord')), nextCursor: nullable(uuid), owner: boolean, actorPermissions: array(string), allOrganizations: boolean, organizationIds: array(uuid), presets: object(Object.fromEntries(staffRoles.map(r => [r, array(string)]))) }),
  StaffCustomerWorkspace: object({ id: uuid, name: string, slug: string, defaultLocale: string, timezone: string, membership: object({ role: { const: 'platform-support' }, permissions: array(string) }), locations: array(object({ id: uuid, name: string, slug: string, timezone: string, currency: string, defaultLanguage: string })) }),
};
const header = { name: 'x-support-reason', in: 'header', required: true, schema: reason };
const id = { name: 'id', in: 'path', required: true, schema: uuid };
const query = [{ name: 'after', in: 'query', schema: uuid }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }, { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 } }];
function operation(operationId: string, response: Schema, parameters: object[] = [], body?: string, status = 200, mutation = false) {
  return { operationId, tags: ['platform-staff'], parameters: [...parameters, ...(mutation ? [{ name: 'Origin', in: 'header', required: true, schema: string }] : [])], ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: ref(body) } } } } : {}), responses: { [status]: { description: 'Success', content: { 'application/json': { schema: response } } }, ...Object.fromEntries([400, 401, 403, 404, 409, 429, 500, 503].map(code => [code, { $ref: '#/components/responses/Problem' }])) } };
}
export const staffPaths = {
  '/platform/staff': { get: operation('listPlatformStaff', ref('StaffDirectory'), [header, ...query]), post: operation('invitePlatformStaff', ref('StaffRecord'), [], 'StaffInvite', 201, true) },
  '/platform/staff/{id}': { patch: operation('updatePlatformStaff', ref('StaffRecord'), [id], 'StaffUpdate', 200, true) },
  '/platform/staff/invitation': { get: operation('getOwnStaffInvitation', nullable(ref('StaffRecord'))) },
  '/platform/staff/accept': { post: operation('acceptOwnStaffInvitation', ref('StaffRecord'), [], undefined, 201, true) },
  '/platform/organizations/{id}/workspace': { get: operation('getCustomerSupportWorkspace', ref('StaffCustomerWorkspace'), [id, header]) },
};
