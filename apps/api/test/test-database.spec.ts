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
});
