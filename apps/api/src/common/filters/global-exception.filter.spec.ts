import { Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('production error redaction', () => {
  afterEach(() => jest.restoreAllMocks());

  it('retains correlation without logging query tokens or exception payloads', () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const response = { locals: { requestId: 'request-123' }, status: jest.fn(), type: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response); response.type.mockReturnValue(response);
    const request = { method: 'GET', originalUrl: '/reset?token=private-token', path: '/reset', route: { path: '/reset' } };
    const host = { switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }) } as ArgumentsHost;
    new GlobalExceptionFilter().catch(new Error('postgresql://user:private-password@host/database'), host);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'request-123', path: '/reset', error: { name: 'Error' } }));
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/private-token|private-password/);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ instance: '/reset', status: 500, detail: 'An unexpected error occurred.' }));
  });
});
