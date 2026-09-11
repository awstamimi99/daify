import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string | string[];
  instance: string;
  requestId?: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const duplicate = exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002';
    const status = duplicate ? HttpStatus.CONFLICT :
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const detail = duplicate ? 'A record with these details already exists.' : this.getSafeDetail(exception, status);
    const requestId = response.locals.requestId as string | undefined;

    if (status >= 500) {
      this.logger.error({
        event: 'request.failed',
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: status,
        error:
          exception instanceof Error
            ? { name: exception.name, message: exception.message, stack: exception.stack }
            : { name: 'UnknownError' },
      });
    }

    const body: ProblemDetails = {
      type: `https://httpstatuses.com/${status}`,
      title: HttpStatus[status] ?? 'Error',
      status,
      detail,
      instance: request.originalUrl,
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    };

    response.status(status).type('application/problem+json').json(body);
  }

  private getSafeDetail(
    exception: unknown,
    status: number,
  ): string | string[] {
    if (!(exception instanceof HttpException)) {
      return 'An unexpected error occurred.';
    }

    const body = exception.getResponse();
    if (typeof body === 'string') return body;
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = body.message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
        return message;
      }
    }

    return HttpStatus[status] ?? 'Request failed.';
  }
}
