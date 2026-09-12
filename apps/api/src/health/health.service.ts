import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HealthRepository } from './health.repository';

export interface HealthResponse {
  status: 'ok';
  service: 'daify-api';
  database?: 'up';
}

@Injectable()
export class HealthService {
  constructor(private readonly repository: HealthRepository) {}

  async check(includeDatabase: boolean): Promise<HealthResponse> {
    if (!includeDatabase) {
      return { status: 'ok', service: 'daify-api' };
    }

    try {
      await this.repository.databaseIsReachable();
      return { status: 'ok', service: 'daify-api', database: 'up' };
    } catch (error) {
      throw new ServiceUnavailableException('Database is unavailable.', {
        cause: error,
      });
    }
  }
}
