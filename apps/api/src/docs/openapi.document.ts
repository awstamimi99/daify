export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'DAIFY API',
    description: 'DAIFY production API contract',
    version: '1.0.0',
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/auth/signup': { post: { operationId: 'signUp', tags: ['authentication'], security: [], responses: { '201': { description: 'Account created; email verification required.' }, '400': { $ref: '#/components/responses/Problem' }, '409': { $ref: '#/components/responses/Problem' }, '429': { $ref: '#/components/responses/Problem' } } } },
    '/auth/verify-email': { post: { operationId: 'verifyEmail', tags: ['authentication'], security: [], responses: { '201': { description: 'Email verified.' }, '401': { $ref: '#/components/responses/Problem' } } } },
    '/auth/resend-verification': { post: { operationId: 'resendVerification', tags: ['authentication'], security: [], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } }, responses: { '202': { description: 'Request accepted; a pending account receives a replacement link.' }, '429': { $ref: '#/components/responses/Problem' }, '503': { $ref: '#/components/responses/Problem' } } } },
    '/auth/login': { post: { operationId: 'login', tags: ['authentication'], security: [], responses: { '200': { description: 'Authenticated; an HttpOnly session cookie is set.' }, '401': { $ref: '#/components/responses/Problem' }, '429': { $ref: '#/components/responses/Problem' } } } },
    '/auth/logout': { post: { operationId: 'logout', tags: ['authentication'], responses: { '204': { description: 'Session revoked and cookie cleared.' }, '401': { $ref: '#/components/responses/Problem' }, '403': { $ref: '#/components/responses/Problem' } } } },
    '/auth/me': { get: { operationId: 'currentUser', tags: ['authentication'], responses: { '200': { description: 'Current authenticated user.' }, '401': { $ref: '#/components/responses/Problem' } } } },
    '/auth/forgot-password': { post: { operationId: 'forgotPassword', tags: ['authentication'], security: [], responses: { '202': { description: 'Request accepted without revealing account existence.' }, '429': { $ref: '#/components/responses/Problem' } } } },
    '/auth/reset-password': { post: { operationId: 'resetPassword', tags: ['authentication'], security: [], responses: { '201': { description: 'Password reset and all sessions revoked.' }, '401': { $ref: '#/components/responses/Problem' } } } },
    '/organizations': {
      get: { operationId: 'listOrganizations', tags: ['organizations'], responses: { '200': { description: 'Active organizations visible to the current user.' }, '401': { $ref: '#/components/responses/Problem' } } },
      post: { operationId: 'createOrganization', tags: ['organizations'], responses: { '201': { description: 'Organization created with the current user as Owner.' }, '401': { $ref: '#/components/responses/Problem' }, '403': { $ref: '#/components/responses/Problem' } } },
    },
    '/organizations/{organizationId}': { get: { operationId: 'getOrganization', tags: ['organizations'], parameters: [{ $ref: '#/components/parameters/OrganizationId' }], responses: { '200': { description: 'Tenant-scoped organization.' }, '404': { $ref: '#/components/responses/Problem' } } } },
    '/organizations/{organizationId}/locations': { post: { operationId: 'createLocation', tags: ['organizations'], parameters: [{ $ref: '#/components/parameters/OrganizationId' }], responses: { '201': { description: 'Location created within the authorized tenant.' }, '404': { $ref: '#/components/responses/Problem' } } } },
    '/organizations/{organizationId}/locations/{locationId}': { get: { operationId: 'getLocation', tags: ['organizations'], parameters: [{ $ref: '#/components/parameters/OrganizationId' }, { name: 'locationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Location within the user membership scope.' }, '404': { $ref: '#/components/responses/Problem' } } } },
    '/organizations/{organizationId}/invitations': { post: { operationId: 'inviteOrganizationMember', tags: ['organizations'], parameters: [{ $ref: '#/components/parameters/OrganizationId' }], responses: { '201': { description: 'Single-use invitation created.' }, '403': { $ref: '#/components/responses/Problem' }, '404': { $ref: '#/components/responses/Problem' }, '429': { $ref: '#/components/responses/Problem' } } } },
    '/organizations/invitations/accept': { post: { operationId: 'acceptOrganizationInvitation', tags: ['organizations'], responses: { '201': { description: 'Invitation accepted by its intended authenticated user.' }, '404': { $ref: '#/components/responses/Problem' } } } },
    '/organizations/{organizationId}/members/{memberId}': { patch: { operationId: 'updateOrganizationMember', tags: ['organizations'], parameters: [{ $ref: '#/components/parameters/OrganizationId' }, { name: 'memberId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Membership updated within grant boundaries.' }, '403': { $ref: '#/components/responses/Problem' }, '404': { $ref: '#/components/responses/Problem' }, '409': { $ref: '#/components/responses/Problem' } } } },
    '/organizations/{organizationId}/members': { get: { operationId: 'listManageableMembers', tags: ['organizations'], parameters: [{ $ref: '#/components/parameters/OrganizationId' }], responses: { '200': { description: 'Members the current team manager can manage; owners receive the full team.' }, '401': { $ref: '#/components/responses/Problem' }, '404': { $ref: '#/components/responses/Problem' } } } },
    '/platform/organizations': { get: { operationId: 'platformOrganizations', tags: ['platform'], parameters: [{ name: 'x-support-reason', in: 'header', required: true, schema: { type: 'string', minLength: 10 } }], responses: { '200': { description: 'Audited platform directory access.' }, '400': { $ref: '#/components/responses/Problem' }, '403': { $ref: '#/components/responses/Problem' } } } },
    '/health': {
      get: {
        operationId: 'healthCheck',
        summary: 'Check API liveness and optional PostgreSQL readiness',
        tags: ['health'],
        parameters: [
          {
            name: 'database',
            in: 'query',
            required: false,
            schema: { type: 'boolean', default: false },
          },
        ],
        responses: {
          '200': {
            description: 'The requested checks passed.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/Problem' },
          '503': { $ref: '#/components/responses/Problem' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: { type: 'apiKey', in: 'cookie', name: 'daify_session', description: 'Opaque revocable browser session token.' },
    },
    parameters: {
      OrganizationId: { name: 'organizationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        required: ['status', 'service'],
        properties: {
          status: { type: 'string', const: 'ok' },
          service: { type: 'string', const: 'daify-api' },
          database: { type: 'string', const: 'up' },
        },
      },
      ProblemDetails: {
        type: 'object',
        required: ['type', 'title', 'status', 'detail', 'instance', 'timestamp'],
        properties: {
          type: { type: 'string', format: 'uri' },
          title: { type: 'string' },
          status: { type: 'integer' },
          detail: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
          instance: { type: 'string' },
          requestId: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      Problem: {
        description: 'The request failed.',
        content: {
          'application/problem+json': {
            schema: { $ref: '#/components/schemas/ProblemDetails' },
          },
        },
      },
    },
  },
  security: [{ sessionCookie: [] }],
} as const;
