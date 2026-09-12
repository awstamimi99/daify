import 'reflect-metadata';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AuthController } from '../auth/auth.controller';
import { MfaController } from '../auth/mfa.controller';
import { OrganizationsController } from '../organizations/organizations.controller';
import { PlatformController } from '../platform/platform.controller';
import { MenusController } from '../menus/menus.controller';
import { HealthController } from '../health/health.controller';
import { openApiDocument } from './openapi.document';

describe('OpenAPI route and schema coverage', () => {
  it('covers every versioned controller operation with no stale paths', () => {
    const actual: string[] = [];
    for (const controller of [AuthController, MfaController, OrganizationsController, PlatformController, HealthController, MenusController]) {
      const prefix = Reflect.getMetadata(PATH_METADATA, controller) as string;
      for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(controller.prototype))) {
        const handler: unknown = descriptor.value;
        if (typeof handler !== 'function') continue;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
        if (method === undefined) continue;
        const suffix = Reflect.getMetadata(PATH_METADATA, handler) as string;
        const path = `/${prefix}/${suffix}`.replace(/\/+/g, '/').replace(/\/$/, '').replace(/:([^/]+)/g, '{$1}');
        actual.push(`${RequestMethod[method]!.toLowerCase()} ${path}`);
      }
    }
    const documented = Object.entries(openApiDocument.paths).flatMap(([path, methods]) => Object.keys(methods).map(method => `${method} ${path}`));
    expect(documented.sort()).toEqual(actual.sort());
  });
  it('compiles every JSON Schema and rejects leaked secrets on account responses', () => {
    const ajv = new Ajv2020({ strict: false }); for (const format of ['email', 'uuid', 'uri', 'date-time'] as const) ajv.addFormat(format, addFormats.get(format));
    ajv.addSchema({ $id: 'urn:daify:contract', components: openApiDocument.components });
    for (const name of Object.keys(openApiDocument.components.schemas)) expect(ajv.getSchema(`urn:daify:contract#/components/schemas/${name}`)).toBeDefined();
    const validate = ajv.getSchema('urn:daify:contract#/components/schemas/User')!;
    const user = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'qa@example.com', displayName: null, platformAdmin: false };
    expect(validate(user)).toBe(true);
    expect(validate({ ...user, passwordHash: 'must-never-leak' })).toBe(false);
  });
});
