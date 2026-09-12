import { ServiceUnavailableException } from '@nestjs/common';
import type { HealthRepository } from './health.repository';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const databaseIsReachable = jest.fn<Promise<boolean>, []>();
  const repository = { databaseIsReachable } as unknown as HealthRepository;
  const service = new HealthService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('returns liveness without touching the database', async () => {
    await expect(service.check(false)).resolves.toEqual({
      status: 'ok',
      service: 'daify-api',
    });
    expect(databaseIsReachable).not.toHaveBeenCalled();
  });

  it('returns database readiness after a successful query', async () => {
    databaseIsReachable.mockResolvedValue(true);
    await expect(service.check(true)).resolves.toEqual({
      status: 'ok',
      service: 'daify-api',
      database: 'up',
    });
  });

  it('maps a database failure to service unavailable', async () => {
    databaseIsReachable.mockRejectedValue(new Error('connection failed'));
    await expect(service.check(true)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
