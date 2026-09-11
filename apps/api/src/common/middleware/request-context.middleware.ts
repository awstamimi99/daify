import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
const UUID_REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ULID_REQUEST_ID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export function isTrustedRequestId(value: string | undefined): value is string {
  return value !== undefined &&
    (UUID_REQUEST_ID.test(value) || ULID_REQUEST_ID.test(value));
}

@Injectable()
export class RequestContextMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const candidate = request.header(REQUEST_ID_HEADER);
    const requestId = isTrustedRequestId(candidate) ? candidate : randomUUID();

    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.locals.requestId = requestId;
    next();
  }
}
