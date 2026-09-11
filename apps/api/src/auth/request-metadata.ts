import type { Request, Response } from 'express';

export interface RequestMetadata {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export function requestMetadata(request: Request, response: Response): RequestMetadata {
  return {
    requestId: response.locals.requestId as string | undefined,
    ipAddress: request.ip,
    userAgent: request.get('user-agent')?.slice(0, 512),
  };
}
