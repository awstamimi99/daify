import type { PoolConfig } from 'pg';

interface DatabaseSettings {
  url: string;
  environment: string;
  poolMax?: number | string;
  connectionTimeoutMs?: number | string;
  ca?: string;
}

export function databaseConnectionOptions(settings: DatabaseSettings): PoolConfig {
  const url = new URL(settings.url);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const verifiedTls = !local || settings.environment === 'production';
  const numeric = (value: number | string | undefined, fallback: number) => value === undefined ? fallback : typeof value === 'number' ? value : /^\d+$/.test(value) ? Number(value) : Number.NaN;
  const max = numeric(settings.poolMax, 3), connectionTimeoutMillis = numeric(settings.connectionTimeoutMs, 10000);
  if (!Number.isInteger(max) || max < 1 || max > 5) throw new Error('DATABASE_POOL_MAX must be an integer from 1 to 5.');
  if (!Number.isInteger(connectionTimeoutMillis) || connectionTimeoutMillis < 1000 || connectionTimeoutMillis > 30000) throw new Error('DATABASE_CONNECTION_TIMEOUT_MS must be from 1000 to 30000.');
  const mode = url.searchParams.get('sslmode');
  if (verifiedTls && mode !== null && mode !== 'verify-full') throw new Error('Remote and production database connections require certificate-verified TLS.');
  // URL TLS parameters override pg's ssl object. Reject client certificates and
  // driver-specific bypasses; the server CA is supplied in a separate setting.
  for (const key of ['ssl', 'sslcert', 'sslkey', 'sslrootcert', 'sslidentity', 'sslaccept', 'sslnegotiation', 'uselibpqcompat', 'host', 'hostaddr']) {
    if (url.searchParams.has(key)) throw new Error('Use DATABASE_SSL_CA for a database CA; URL TLS or host overrides are not supported.');
  }
  if (verifiedTls) url.searchParams.delete('sslmode');
  return {
    connectionString: url.toString(),
    ...(verifiedTls ? { ssl: { rejectUnauthorized: true, ...(settings.ca ? { ca: settings.ca } : {}) } } : {}),
    max, connectionTimeoutMillis, idleTimeoutMillis: 10000,
    // Keep SQL NOW() and Prisma Date parameters on the same UTC timeline.
    options: '-c timezone=UTC',
  };
}
