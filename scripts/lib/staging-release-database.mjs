import { X509Certificate } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import { stagingProject, roleUrl, verifyRole, verifyMigratorDefaults, grantRuntimeAccess, verifyRuntimeAccess, applicationTables } from './staging-database.mjs';

const fail = () => { throw new Error('Invalid staging database release configuration. Check the pinned project, role URLs and CA certificate.'); };
export function releaseDatabaseSettings(environment) {
  function password(name, role) {
    try {
      const url = new URL(environment[name]);
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== stagingProject.host
        || url.port !== String(stagingProject.port) || url.pathname !== `/${stagingProject.database}`
        || decodeURIComponent(url.username) !== `${role}.${stagingProject.reference}` || !url.password || url.hash
        || url.searchParams.get('sslmode') !== 'verify-full'
        || [...url.searchParams].some(([key, value]) => !['sslmode', 'schema', 'connection_limit'].includes(key)
          || (key === 'schema' && value !== 'public') || (key === 'connection_limit' && value !== '1'))) fail();
      return decodeURIComponent(url.password);
    } catch { fail(); }
  }
  const migrationPassword = password('MIGRATION_DATABASE_URL', stagingProject.migrator);
  const runtimePassword = password('STAGING_RUNTIME_DATABASE_URL', stagingProject.runtime);
  const ca = environment.STAGING_DATABASE_CA;
  try {
    if (!ca || !ca.trim().startsWith('-----BEGIN CERTIFICATE-----') || ca.includes('PRIVATE KEY')) fail();
    const certificate = new X509Certificate(ca);
    if (!certificate.ca || Date.now() < Date.parse(certificate.validFrom) || Date.now() >= Date.parse(certificate.validTo)) fail();
  } catch { fail(); }
  return { migrationPassword, runtimePassword, ca };
}

export function releaseClientOptions(role, password, ca) {
  return { host: stagingProject.host, port: stagingProject.port, database: stagingProject.database,
    user: `${role}.${stagingProject.reference}`, password, ssl: { rejectUnauthorized: true, ca },
    connectionTimeoutMillis: 10000, query_timeout: 10000, application_name: 'daify-staging-release' };
}

async function connect(role, password, ca, work) {
  const client = new pg.Client(releaseClientOptions(role, password, ca));
  client.on('error', () => {});
  try {
    await client.connect();
    if (!client.connection.stream.encrypted || !client.connection.stream.authorized) throw new Error('TLS verification failed.');
    const { rows: [identity] } = await client.query('SELECT current_database() AS database, current_user AS username');
    if (identity.database !== stagingProject.database || identity.username !== role) throw new Error('Unexpected database identity.');
    return await work(client);
  } finally { await client.end(); }
}

export async function prismaRelease(command, settings, execute = promisify(execFile)) {
  const directory = await mkdtemp(resolve(tmpdir(), 'daify-release-ca-'));
  try {
    const caPath = resolve(directory, 'root.crt');
    await writeFile(caPath, settings.ca, { mode: 0o600, flag: 'wx' });
    // Do not pass runtime/provider secrets through to the migration subprocess.
    const environment = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'SYSTEMROOT'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
    environment.DATABASE_URL = roleUrl(stagingProject, stagingProject.migrator, settings.migrationPassword, { migration: true, caPath });
    environment.CHECKPOINT_DISABLE = '1';
    await execute(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', command], {
      cwd: resolve('apps/api'), env: environment, timeout: 180000, maxBuffer: 4 * 1024 * 1024,
    });
  } finally { await rm(directory, { recursive: true, force: true }); }
}

async function preflight(settings) {
  await connect(stagingProject.migrator, settings.migrationPassword, settings.ca, async client => {
    await verifyRole(client, stagingProject.migrator);
    await verifyMigratorDefaults(client);
    const { rows } = await client.query(`SELECT c.relname, r.rolname AS owner FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner
      WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')`);
    if (rows.some(row => ![...applicationTables, '_prisma_migrations'].includes(row.relname) || row.owner !== stagingProject.migrator)) {
      throw new Error('Unexpected public objects or ownership.');
    }
  });
  await connect(stagingProject.runtime, settings.runtimePassword, settings.ca, client => verifyRole(client, stagingProject.runtime));
}

const operations = {
  preflight,
  prisma: prismaRelease,
  grant: settings => connect(stagingProject.migrator, settings.migrationPassword, settings.ca, client => grantRuntimeAccess(client)),
  verify: settings => connect(stagingProject.runtime, settings.runtimePassword, settings.ca, client => verifyRuntimeAccess(client)),
};

// Individual phases commit separately. Never replay a failed migration or undo
// committed schema automatically; stop before any service deployment instead.
export async function runDatabaseRelease(command, settings, actions = operations) {
  if (!['status', 'deploy'].includes(command)) throw new Error('Use status or deploy.');
  let phase = 'preflight';
  try {
    await actions.preflight(settings);
    if (command === 'deploy') {
      phase = 'migration'; await actions.prisma('deploy', settings);
    }
    phase = 'migration status'; await actions.prisma('status', settings);
    if (command === 'deploy') {
      phase = 'runtime grants'; await actions.grant(settings);
    }
    phase = 'runtime verification';
    return await actions.verify(settings);
  } catch {
    // Driver/process errors can contain SQL, URLs or credential values.
    throw new Error(`Staging database release stopped during ${phase}. No automatic rollback or retry was attempted. Inspect the migration state before recovery.`);
  }
}
