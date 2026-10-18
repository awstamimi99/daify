import { configureIntegrationDatabase } from './support/test-database';

describe('configureIntegrationDatabase', () => {
  it('requires test mode', () => {
    expect(() =>
      configureIntegrationDatabase({
        NODE_ENV: 'development',
        TEST_DATABASE_URL: 'postgresql://daify:daify@localhost/daify_test',
      }),
    ).toThrow('NODE_ENV=test');
  });

  it('never falls back to DATABASE_URL', () => {
    expect(() =>
      configureIntegrationDatabase({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://daify:daify@localhost/daify_test',
      }),
    ).toThrow('explicit TEST_DATABASE_URL');
  });

  it('rejects a database without an explicit test name', () => {
    expect(() =>
      configureIntegrationDatabase({
        NODE_ENV: 'test',
        TEST_DATABASE_URL: 'postgresql://daify:daify@localhost/daify',
      }),
    ).toThrow('is not explicitly named as a test database');
  });

  it('promotes a validated test URL to the runtime database URL', () => {
    const environment: NodeJS.ProcessEnv = {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://daify:daify@shared/daify',
      TEST_DATABASE_URL: 'postgresql://daify:daify@localhost/daify_test',
    };

    configureIntegrationDatabase(environment);

    expect(environment.DATABASE_URL).toBe(environment.TEST_DATABASE_URL);
  });

  it('rejects hosted targets and connection overrides before changing the environment, without leaking input', () => {
    for (const target of [
      'postgresql://user:synthetic-secret@remote.example/daify_test',
      'postgresql://user:synthetic-secret@localhost/daify_test?host=remote.example',
      'postgresql://user:synthetic-secret@localhost/daify_test?dbname=production',
      'postgresql://user:synthetic-secret@localhost/daify_test?schema=private',
      'postgresql://user:synthetic-secret@localhost/test%2Fsynthetic-secret',
      'postgresql://user:synthetic-secret@localhost/test%ZZ',
    ]) {
      const environment = { NODE_ENV: 'test', TEST_DATABASE_URL: target, DATABASE_URL: 'unchanged' };
      expect(() => configureIntegrationDatabase(environment)).toThrow();
      try { configureIntegrationDatabase(environment); } catch (error) {
        expect(String(error)).not.toContain('synthetic-secret');
      }
      expect(environment.DATABASE_URL).toBe('unchanged');
    }
  });
});
