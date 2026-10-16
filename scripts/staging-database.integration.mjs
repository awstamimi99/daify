// Deliberately separate from scripts/*.test.mjs: this needs an isolated PostgreSQL service.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { prepareRoles, verifyRole } from './lib/staging-database.mjs';

const input = process.env.TEST_DATABASE_URL;
if (!input || !/(^|[_-])test($|[_-])/i.test(new URL(input).pathname.slice(1))) throw new Error('An explicitly named isolated TEST_DATABASE_URL is required.');
const host = new URL(input).hostname;
if (!['localhost', '127.0.0.1', '[::1]', 'postgres'].includes(host)) throw new Error('Database role tests may run only on a local or CI PostgreSQL service.');
const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const database = `daify_roles_test_${suffix}`, migrator = `daify_migrator_${suffix}`, runtime = `daify_runtime_${suffix}`;
const target = new URL(input); target.pathname = `/${database}`;
const project = { database, migrator, runtime };
const rollbackProject = { database, migrator: `${migrator}_b`, runtime: `${runtime}_b` };
const admin = new pg.Client({ connectionString: input, connectionTimeoutMillis: 5000 });
let client, migrationClient, runtimeClient;
try {
  await admin.connect(); await admin.query(`CREATE DATABASE "${database}"`);
  client = new pg.Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 }); await client.connect();
  const secrets = { migrationPassword: randomUUID(), runtimePassword: randomUUID() };
  await prepareRoles(client, secrets, project);
  const migrationUrl = new URL(target); migrationUrl.username = migrator; migrationUrl.password = secrets.migrationPassword;
  const runtimeUrl = new URL(target); runtimeUrl.username = runtime; runtimeUrl.password = secrets.runtimePassword;
  migrationClient = new pg.Client({ connectionString: migrationUrl.toString(), connectionTimeoutMillis: 5000 });
  runtimeClient = new pg.Client({ connectionString: runtimeUrl.toString(), connectionTimeoutMillis: 5000 });
  await migrationClient.connect(); await runtimeClient.connect();
  // Exercise actual authorization, including a future migration-owned table.
  await verifyRole(migrationClient, migrator, project);
  await migrationClient.query('CREATE TABLE public.role_probe (id integer PRIMARY KEY)');
  await migrationClient.query('CREATE FUNCTION public.role_probe_function() RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$');
  const { rows: [defaults] } = await client.query(`SELECT has_function_privilege($1, 'public.role_probe_function()', 'EXECUTE') AS function_access, has_table_privilege($1, 'public.role_probe', 'SELECT') AS table_access`, [runtime]);
  assert.equal(defaults.function_access, false); assert.equal(defaults.table_access, false);
  await verifyRole(runtimeClient, runtime, project);
  await assert.rejects(runtimeClient.query('CREATE TABLE public.forbidden_probe (id integer)'), error => error.code === '42501');
  await assert.rejects(runtimeClient.query('SELECT * FROM public.role_probe'), error => error.code === '42501');
  await assert.rejects(runtimeClient.query('SELECT public.role_probe_function()'), error => error.code === '42501');
  await assert.rejects(runtimeClient.query(`SET ROLE "${migrator}"`), error => error.code === '42501');
  const { rows: [verifiers] } = await client.query('SELECT rolpassword FROM pg_authid WHERE rolname=$1', [runtime]);
  assert.match(verifiers.rolpassword, /^SCRAM-SHA-256\$4096:/);
  await assert.rejects(prepareRoles(client, secrets, project), /roles already exist/);
  assert.equal((await client.query('SELECT rolpassword FROM pg_authid WHERE rolname=$1', [runtime])).rows[0].rolpassword, verifiers.rolpassword);
  await client.query('DROP TABLE public.role_probe'); await client.query('DROP FUNCTION public.role_probe_function()');
  await client.query('GRANT CREATE ON SCHEMA public TO PUBLIC');
  await assert.rejects(prepareRoles(client, secrets, rollbackProject), /PUBLIC grants schema creation/);
  assert.equal((await client.query('SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])', [[rollbackProject.migrator, rollbackProject.runtime]])).rows.length, 0);
  console.log('PASS: migration DDL works; runtime DDL, data access before grants, function execution and role escalation are denied. Existing credentials are preserved, and unsafe public grants roll back the entire setup.');
} finally {
  if (runtimeClient) await runtimeClient.end();
  if (migrationClient) await migrationClient.end();
  if (client) { try { await client.query('RESET ROLE'); } catch {} await client.end(); }
  try { await admin.query(`DROP DATABASE IF EXISTS "${database}"`); } finally {
    try { await admin.query(`DROP ROLE IF EXISTS "${runtime}"`); await admin.query(`DROP ROLE IF EXISTS "${migrator}"`); await admin.query(`DROP ROLE IF EXISTS "${rollbackProject.runtime}"`); await admin.query(`DROP ROLE IF EXISTS "${rollbackProject.migrator}"`); } finally { await admin.end(); }
  }
}
