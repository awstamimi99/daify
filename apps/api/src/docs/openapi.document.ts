import { menuPaths, menuSchemas } from './menu-contract';
// Hand-maintained contract, checked against route discovery, DTO validation and
// live HTTP responses in integration tests. Helpers keep repeated shapes uniform.
type Schema = Record<string, unknown>;
const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const object = (properties: Record<string, Schema>, optional: string[] = []): Schema => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties).filter(key => !optional.includes(key)) });
const array = (items: Schema): Schema => ({ type: 'array', items });
const string: Schema = { type: 'string' };
const boolean: Schema = { type: 'boolean' };
const uuid: Schema = { type: 'string', format: 'uuid' };
const date: Schema = { type: 'string', format: 'date-time' };
const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { type: 'null' }] });
const enumeration = (...values: string[]): Schema => ({ type: 'string', enum: values });
const email: Schema = { type: 'string', format: 'email' };
const name: Schema = { type: 'string', minLength: 2, maxLength: 160, description: 'Trimmed before validation.' };
const slug: Schema = { type: 'string', minLength: 1, maxLength: 100, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' };
const password: Schema = { type: 'string', minLength: 12, maxLength: 128, writeOnly: true };
const currentPassword: Schema = { type: 'string', minLength: 1, maxLength: 128, writeOnly: true };
const token: Schema = { type: 'string', minLength: 20, writeOnly: true };
const mfaCode: Schema = { type: 'string', pattern: '^[0-9]{6}$', writeOnly: true };
const recoveryCode: Schema = { type: 'string', pattern: '^[a-fA-F0-9-]{32,39}$', writeOnly: true };
const role = enumeration('OWNER', 'MANAGER', 'STAFF', 'VIEWER');
const membershipStatus = enumeration('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');
const resourceStatus = enumeration('ACTIVE', 'SUSPENDED', 'ARCHIVED');
const locale = enumeration('en', 'ar');
const timezone: Schema = { type: 'string', description: 'Valid IANA timezone, e.g. Asia/Kuwait.' };
const currency: Schema = { type: 'string', description: 'Valid ISO 4217 currency code.', pattern: '^[A-Z]{3}$' };
const stamps = { createdAt: date, updatedAt: date };
const locationSummary = { id: uuid, name: string, slug: string, timezone, currency, defaultLanguage: locale };
const organizationSummary = { id: uuid, name: string, slug: string, defaultLocale: locale, timezone };
const user = { id: uuid, email, displayName: nullable(string), platformAdmin: boolean };
const membership = { id: uuid, organizationId: uuid, userId: uuid, role, status: membershipStatus, allLocations: boolean, permissions: array(string), invitedEmail: nullable(email), invitedAt: nullable(date), acceptedAt: nullable(date), revokedAt: nullable(date), ...stamps };
const testToken: Schema = { type: 'string', description: 'Present only with NODE_ENV=test. Never returned in development or production.' };

const schemas: Record<string, Schema> = {
  ...menuSchemas,
  User: object(user),
  SessionUser: object({ ...user, sessionId: uuid, assuranceLevel: enumeration('AAL1', 'AAL2') }),
  SignupRequest: object({ email, displayName: name, password }),
  LoginRequest: object({ email, password: { type: 'string', maxLength: 128, writeOnly: true }, mfaCode, recoveryCode }, ['mfaCode', 'recoveryCode']),
  EmailRequest: object({ email }),
  TokenRequest: object({ token }),
  ResetPasswordRequest: object({ token, password }),
  MfaSetupRequest: object({ password: currentPassword, mfaCode, recoveryCode }, ['mfaCode', 'recoveryCode']),
  MfaConfirmRequest: object({ password: currentPassword, code: mfaCode }),
  SignupResponse: object({ user: ref('User'), verificationRequired: { const: true }, verificationToken: testToken }, ['verificationToken']),
  UserResponse: object({ user: ref('User') }),
  LoginResponse: object({ user: ref('User'), assuranceLevel: enumeration('AAL1', 'AAL2') }),
  MeResponse: object({ user: ref('SessionUser') }),
  VerificationAccepted: object({ accepted: { const: true }, verificationToken: testToken }, ['verificationToken']),
  ResetAccepted: object({ accepted: { const: true }, resetToken: testToken }, ['resetToken']),
  PasswordResetResponse: object({ reset: { const: true } }),
  MfaStatus: object({ enabled: boolean, recoveryCodesRemaining: { type: 'integer', minimum: 0, maximum: 10 } }),
  MfaSetup: object({ secret: { type: 'string', pattern: '^[A-Z2-7]{32}$' }, expiresAt: date, issuer: { const: 'DAIFY' }, account: email }),
  MfaConfirmed: object({ enabled: { const: true }, recoveryCodes: { type: 'array', minItems: 10, maxItems: 10, items: { type: 'string', pattern: '^[a-f0-9]{4}(-[a-f0-9]{4}){7}$' } } }),
  CreateOrganizationRequest: object({ name, slug, defaultLocale: locale, timezone }, ['defaultLocale', 'timezone']),
  CreateLocationRequest: object({ name, slug, timezone, currency, defaultLanguage: locale }),
  InviteRequest: object({ email, role, permissions: { ...array(string), maxItems: 30, default: [] }, allLocations: { type: 'boolean', default: false }, locationIds: { ...array(uuid), maxItems: 100, default: [] } }, ['permissions', 'allLocations', 'locationIds']),
  AcceptInvitationRequest: object({ token: { type: 'string', writeOnly: true } }),
  UpdateMemberRequest: object({ role, status: membershipStatus, permissions: { ...array(string), maxItems: 30 } }, ['role', 'status', 'permissions']),
  Organization: object({ ...organizationSummary, status: resourceStatus, brandSettings: {}, archivedAt: nullable(date), ...stamps }),
  OrganizationDetail: object({ ...organizationSummary, locations: array(object({ id: uuid, name: string, slug: string, status: resourceStatus })) }),
  Workspace: object({ ...organizationSummary, membership: object({ role: enumeration('owner', 'manager', 'staff', 'viewer'), permissions: array(string) }), locations: array(object(locationSummary)) }),
  Location: object({ ...locationSummary, organizationId: uuid, status: resourceStatus, address: {}, contact: {}, archivedAt: nullable(date), ...stamps }),
  Member: object(membership),
  TeamMember: object({ id: uuid, role, status: membershipStatus, allLocations: boolean, permissions: array(string), locationScopes: array(object({ locationId: uuid })), user: object({ displayName: nullable(string), email }) }),
  InvitationResponse: object({ invited: { const: true }, invitationToken: testToken }, ['invitationToken']),
  PlatformOrganization: object({ id: uuid, name: string, slug: string, status: resourceStatus }),
  HealthResponse: object({ status: { const: 'ok' }, service: { const: 'daify-api' }, database: { const: 'up' } }, ['database']),
  ProblemDetails: object({ type: { type: 'string', format: 'uri' }, title: string, status: { type: 'integer' }, detail: { oneOf: [string, array(string)] }, instance: string, timestamp: date, requestId: string }, ['requestId']),
};

const problem = { $ref: '#/components/responses/Problem' };
const origin = { name: 'Origin', in: 'header', required: true, description: 'Must exactly match the configured WEB_ORIGIN.', schema: { type: 'string', format: 'uri' } };
const idParameter = (name: string) => ({ name, in: 'path', required: true, schema: uuid });
const tenant = [idParameter('organizationId')];
const json = (schema: Schema) => ({ 'application/json': { schema } });
interface OperationOptions { public?: boolean; body?: string; parameters?: object[]; status?: number; errors?: number[]; description?: string; mutation?: boolean; }
function operation(operationId: string, tag: string, response: Schema | null, options: OperationOptions = {}) {
  const errors = new Set([400, 403, 429, 500, 503, ...(options.public ? [] : [401]), ...(options.errors ?? [])]);
  const responses: Record<string, object> = Object.fromEntries([...errors].map(status => [status, problem]));
  responses[String(options.status ?? 200)] = { description: options.description ?? 'Request succeeded.', ...(response ? { content: json(response) } : {}) };
  return {
    operationId, tags: [tag], description: options.description,
    ...(options.public ? { security: [] } : {}),
    parameters: [...(options.parameters ?? []), ...(options.mutation ? [origin] : [])],
    ...(options.body ? { requestBody: { required: true, content: json(ref(options.body)) } } : {}), responses,
  };
}

export const openApiDocument = {
  openapi: '3.1.0',
  info: { title: 'DAIFY API', version: '1.0.0', description: 'M3 account and workspace contract. All mutations require the allowed Origin. Production API access also requires signed client metadata from the trusted web server; this transport proof never replaces session authorization. MFA/login/logout may set or replace the HttpOnly session cookie. A 429 response carries Retry-After in seconds. Test-only raw tokens are explicitly marked.' },
  servers: [{ url: '/api/v1' }],
  security: [{ sessionCookie: [] }],
  paths: {
    ...menuPaths,
    '/auth/signup': { post: operation('signUp', 'authentication', ref('SignupResponse'), { public: true, mutation: true, body: 'SignupRequest', status: 201, errors: [409], description: 'Creates an unverified account and sends verification email. SMTP failure may occur after account creation; use resend-verification to retry.' }) },
    '/auth/verify-email': { post: operation('verifyEmail', 'authentication', ref('UserResponse'), { public: true, mutation: true, body: 'TokenRequest', status: 201, errors: [401] }) },
    '/auth/login': { post: operation('login', 'authentication', ref('LoginResponse'), { public: true, mutation: true, body: 'LoginRequest', errors: [401], description: 'Sets the session cookie. Enrolled users must supply exactly one fresh authenticator or unused recovery code with their password.' }) },
    '/auth/logout': { post: operation('logout', 'authentication', null, { mutation: true, status: 204, description: 'Revokes this session and clears its cookie; no response body.' }) },
    '/auth/me': { get: operation('currentUser', 'authentication', ref('MeResponse')) },
    '/auth/resend-verification': { post: operation('resendVerification', 'authentication', ref('VerificationAccepted'), { public: true, mutation: true, body: 'EmailRequest', status: 202 }) },
    '/auth/forgot-password': { post: operation('forgotPassword', 'authentication', ref('ResetAccepted'), { public: true, mutation: true, body: 'EmailRequest', status: 202 }) },
    '/auth/reset-password': { post: operation('resetPassword', 'authentication', ref('PasswordResetResponse'), { public: true, mutation: true, body: 'ResetPasswordRequest', status: 201, errors: [401] }) },
    '/auth/mfa': { get: operation('mfaStatus', 'authentication', ref('MfaStatus')) },
    '/auth/mfa/setup': { post: operation('startMfaSetup', 'authentication', ref('MfaSetup'), { mutation: true, body: 'MfaSetupRequest', description: 'Requires the current password and exactly one existing factor when enrolled. Setup expires after ten minutes and is session-bound. Secret response is no-store.' }) },
    '/auth/mfa/confirm': { post: operation('confirmMfaSetup', 'authentication', ref('MfaConfirmed'), { mutation: true, body: 'MfaConfirmRequest', description: 'Confirms in the initiating session, revokes old sessions and sets a new AAL2 cookie. Recovery codes are shown once; response is no-store.' }) },
    '/organizations': {
      get: operation('listOrganizations', 'organizations', array(ref('Workspace'))),
      post: operation('createOrganization', 'organizations', ref('Organization'), { mutation: true, body: 'CreateOrganizationRequest', status: 201, errors: [409] }),
    },
    '/organizations/{organizationId}': { get: operation('getOrganization', 'organizations', ref('OrganizationDetail'), { parameters: tenant, errors: [404] }) },
    '/organizations/{organizationId}/locations': { post: operation('createLocation', 'organizations', ref('Location'), { parameters: tenant, mutation: true, body: 'CreateLocationRequest', status: 201, errors: [404, 409] }) },
    '/organizations/{organizationId}/locations/{locationId}': { get: operation('getLocation', 'organizations', ref('Location'), { parameters: [...tenant, idParameter('locationId')], errors: [404] }), patch: operation('updateLocation', 'organizations', ref('Location'), { parameters: [...tenant, idParameter('locationId')], mutation: true, body: 'CreateLocationRequest', errors: [404, 409] }), delete: operation('archiveLocation', 'organizations', ref('Location'), { parameters: [...tenant, idParameter('locationId')], mutation: true, errors: [404] }) },
    '/organizations/{organizationId}/invitations': { post: operation('inviteOrganizationMember', 'organizations', ref('InvitationResponse'), { parameters: tenant, mutation: true, body: 'InviteRequest', status: 201, errors: [404, 409], description: 'Creates and sends an invitation. If delivery fails, repeating the authorized invitation replaces its old token.' }) },
    '/organizations/invitations/accept': { post: operation('acceptOrganizationInvitation', 'organizations', ref('Member'), { mutation: true, body: 'AcceptInvitationRequest', status: 201, errors: [404, 409] }) },
    '/organizations/{organizationId}/members': { get: operation('listManageableMembers', 'organizations', array(ref('TeamMember')), { parameters: tenant, errors: [404] }) },
    '/organizations/{organizationId}/members/{memberId}': { patch: operation('updateOrganizationMember', 'organizations', ref('Member'), { parameters: [...tenant, idParameter('memberId')], mutation: true, body: 'UpdateMemberRequest', errors: [404, 409] }) },
    '/platform/organizations': { get: operation('platformOrganizations', 'platform', array(ref('PlatformOrganization')), { parameters: [{ name: 'x-support-reason', in: 'header', required: true, schema: { type: 'string', minLength: 10 }, description: 'Meaningful support reason, trimmed before validation. Requires platformAdmin and AAL2.' }] }) },
    '/health': { get: { operationId: 'healthCheck', tags: ['health'], security: [], parameters: [{ name: 'database', in: 'query', schema: { type: 'boolean', default: false } }], responses: { '200': { description: 'Liveness or database readiness succeeded.', content: json(ref('HealthResponse')) }, '400': problem, '503': problem } } },
  },
  components: {
    securitySchemes: { sessionCookie: { type: 'apiKey', in: 'cookie', name: 'daify_session', description: 'Opaque, revocable HttpOnly session cookie.' } },
    schemas,
    responses: { Problem: { description: 'Request failed. Rate-limit failures include Retry-After in seconds.', headers: { 'Retry-After': { description: 'Present for HTTP 429.', schema: { type: 'integer', minimum: 0 } } }, content: { 'application/problem+json': { schema: ref('ProblemDetails') } } } },
  },
};
