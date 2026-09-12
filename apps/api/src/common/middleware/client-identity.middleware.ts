import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

type ClientRequest = Request & { verifiedClientIp?: string };
export function clientIp(request: ClientRequest): string {
  return request.verifiedClientIp ?? request.socket.remoteAddress ?? 'unknown';
}

@Injectable()
export class ClientIdentityMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(request: ClientRequest, _response: Response, next: NextFunction) {
    if (['/api/v1/health', '/api/docs/openapi.json'].includes(request.originalUrl.split('?')[0]!)) return next();
    const key = this.config.get<string>('PROXY_SIGNING_KEY');
    const ip = request.get('x-daify-client-ip');
    const timestamp = request.get('x-daify-client-time');
    const signature = request.get('x-daify-client-signature');
    if (!ip && !timestamp && !signature && this.config.get('NODE_ENV') !== 'production') return next();
    if (!key || !ip || !isIP(ip) || !timestamp || !/^\d{13}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 30_000 || !signature || !/^[a-f0-9]{64}$/.test(signature)) throw new ForbiddenException('Trusted client identity is required.');
    const expected = createHmac('sha256', Buffer.from(key, 'base64')).update([timestamp, request.method, request.originalUrl, ip].join('\n')).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new ForbiddenException('Trusted client identity is required.');
    request.verifiedClientIp = ip;
    next();
  }
}
