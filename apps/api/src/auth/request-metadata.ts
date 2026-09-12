import type { Request, Response } from 'express';
import { clientIp } from '../common/middleware/client-identity.middleware';

export interface RequestMetadata {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export function requestMetadata(request: Request, response: Response): RequestMetadata {
  return {
    requestId: response.locals.requestId as string | undefined,
    ipAddress: clientIp(request),
    userAgent: request.get('user-agent')?.slice(0, 512),
  };
}
