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

  if (!['localhost', '127.0.0.1', '[::1]', 'postgres'].includes(parsed.hostname)) {
    throw new Error('Integration tests may connect only to a local or CI PostgreSQL service.');
  }
  let databaseName: string;
  try { databaseName = decodeURIComponent(parsed.pathname.slice(1)); }
  catch { throw new Error('Invalid test database name.'); }
  if (!/^[a-zA-Z0-9_-]+$/.test(databaseName) || !TEST_DATABASE_NAME.test(databaseName)) {
    throw new Error(
      'Refusing destructive integration tests: database is not explicitly named as a test database.',
    );
  }
  if (parsed.hash || [...parsed.searchParams].some(([key, value]) => key !== 'schema' || value !== 'public')) {
    throw new Error('Integration test database URLs allow only the public schema query parameter.');
  }

  environment.DATABASE_URL = testDatabaseUrl;
  return testDatabaseUrl;
}
