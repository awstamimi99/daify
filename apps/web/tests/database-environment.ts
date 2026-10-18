/** Validate before Playwright can seed fixtures, launch servers or load tests. */
export function configureBrowserDatabase(environment: NodeJS.ProcessEnv = process.env): string {
  const input = environment.TEST_DATABASE_URL;
  if (!input) throw new Error('Browser tests require an explicit local TEST_DATABASE_URL; DATABASE_URL is never a fallback.');
  let url: URL;
  try { url = new URL(input); }
  catch { throw new Error('Browser tests require a valid PostgreSQL TEST_DATABASE_URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['127.0.0.1', 'localhost', '[::1]', 'postgres'].includes(url.hostname)) {
    throw new Error('Browser tests may connect only to a local or CI PostgreSQL test service.');
  }
  let database: string;
  try { database = decodeURIComponent(url.pathname.slice(1)); }
  catch { throw new Error('Browser tests require a valid test database name.'); }
  if (!/^[a-zA-Z0-9_-]+$/.test(database) || !/(^|[_-])test($|[_-])/i.test(database)) {
    throw new Error('Browser tests require a database explicitly named as a test database.');
  }
  // pg accepts connection overrides through query parameters. Keep only the
  // Prisma schema selector, so a local-looking URI cannot redirect the driver.
  if (url.hash || [...url.searchParams].some(([key, value]) => key !== 'schema' || value !== 'public')) {
    throw new Error('Browser test database URLs allow only the public schema query parameter.');
  }
  environment.DATABASE_URL = input;
  return input;
}
