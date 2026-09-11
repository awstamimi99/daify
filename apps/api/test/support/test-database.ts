const TEST_DATABASE_NAME = /(^|[_-])test($|[_-])/i;

export function configureIntegrationDatabase(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (environment.NODE_ENV !== 'test') {
    throw new Error(
      'Integration tests are destructive and require NODE_ENV=test.',
    );
  }

  const testDatabaseUrl = environment.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error(
      'Integration tests require an explicit TEST_DATABASE_URL. DATABASE_URL is never used as a fallback.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(testDatabaseUrl);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('TEST_DATABASE_URL must use postgres:// or postgresql://.');
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!TEST_DATABASE_NAME.test(databaseName)) {
    throw new Error(
      `Refusing destructive integration tests: database "${databaseName}" is not explicitly named as a test database.`,
    );
  }

  environment.DATABASE_URL = testDatabaseUrl;
  return testDatabaseUrl;
}
