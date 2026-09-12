import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ClientIdentityMiddleware } from './client-identity.middleware';

describe('Production proxy boundary', () => {
  const middleware = new ClientIdentityMiddleware(new ConfigService({ NODE_ENV: 'production', PROXY_SIGNING_KEY: Buffer.alloc(32, 8).toString('base64') }));
  const response = {} as Response;
  it('fails closed without proof in production but keeps liveness public', () => {
    const next = jest.fn();
    const request = { originalUrl: '/api/v1/auth/me', get: () => undefined } as unknown as Request;
    expect(() => middleware.use(request, response, next)).toThrow('Trusted client identity is required');
    expect(next).not.toHaveBeenCalled();
    middleware.use({ ...request, originalUrl: '/api/v1/health?database=true' } as Request, response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
