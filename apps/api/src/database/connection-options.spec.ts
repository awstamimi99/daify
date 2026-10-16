import { Client } from 'pg';
import { databaseConnectionOptions } from './connection-options';

const remote = 'postgresql://daify_runtime.project:private-placeholder@pooler.example.test:5432/postgres?schema=public';
describe('database connection security and pool bounds', () => {
  it('verifies TLS on every remote connection and retains the separately supplied CA', () => {
    const options = databaseConnectionOptions({ url: `${remote}&sslmode=verify-full`, environment: 'development', ca: 'project CA' });
    const client = new Client(options);
    expect(options.ssl).toEqual({ rejectUnauthorized: true, ca: 'project CA' });
    expect(client.ssl).toEqual({ rejectUnauthorized: true, ca: 'project CA' });
    expect(new URL(options.connectionString!).searchParams.has('sslmode')).toBe(false);
    expect(options.max).toBe(3); expect(options.connectionTimeoutMillis).toBe(10000);
    expect(options.options).toBe('-c timezone=UTC');
  });
  it.each(['disable', 'prefer', 'no-verify', 'verify-ca', 'require'])('rejects a remote TLS downgrade through sslmode=%s', mode => {
    expect(() => databaseConnectionOptions({ url: `${remote}&sslmode=${mode}`, environment: 'production' })).toThrow('certificate-verified TLS');
  });
  it.each(['ssl=false', 'sslrootcert=/tmp/another.crt', 'sslaccept=accept_invalid_certs', 'uselibpqcompat=true', 'host=localhost', 'hostaddr=127.0.0.1', 'sslnegotiation=direct'])('rejects URL overrides that can replace TLS or the intended host: %s', override => {
    expect(() => databaseConnectionOptions({ url: `${remote}&${override}`, environment: 'production' })).toThrow('overrides are not supported');
  });
  it('keeps non-production loopback development compatible and requires TLS even on loopback in production', () => {
    const url = 'postgresql://test@127.0.0.1:5432/daify_test';
    expect(databaseConnectionOptions({ url, environment: 'test' }).ssl).toBeUndefined();
    expect(databaseConnectionOptions({ url, environment: 'production' }).ssl).toEqual({ rejectUnauthorized: true });
  });
  it('accepts numeric environment strings used by operator scripts without ConfigModule validation', () => {
    const options = databaseConnectionOptions({ url: remote, environment: 'test', poolMax: '3', connectionTimeoutMs: '10000' });
    expect(options.max).toBe(3); expect(options.connectionTimeoutMillis).toBe(10000);
  });
  it.each([0, 6, 1.5, Number.NaN])('rejects an unbounded or invalid pool maximum: %s', poolMax => {
    expect(() => databaseConnectionOptions({ url: remote, environment: 'test', poolMax })).toThrow('DATABASE_POOL_MAX');
  });
  it.each([0, 999, 30001])('rejects missing timeout protection: %s', connectionTimeoutMs => {
    expect(() => databaseConnectionOptions({ url: remote, environment: 'test', connectionTimeoutMs })).toThrow('DATABASE_CONNECTION_TIMEOUT_MS');
  });
});
