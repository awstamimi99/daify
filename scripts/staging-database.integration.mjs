// Deliberately separate from scripts/*.test.mjs: this needs an isolated PostgreSQL service.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { prepareRoles, setupRolesPhased, verifyRole, verifyMigratorDefaults } from './lib/staging-database.mjs';

const input = process.env.TEST_DATABASE_URL;
if (!input || !/(^|[_-])test($|[_-])/i.test(new URL(input).pathname.slice(1))) throw new Error('An explicitly named isolated TEST_DATABASE_URL is required.');
const host = new URL(input).hostname;
if (!['localhost', '127.0.0.1', '[::1]', 'postgres'].includes(host)) throw new Error('Database role tests may run only on a local or CI PostgreSQL service.');

const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const database = `daify_roles_test_${suffix}`;
const administrator = `daify_test_admin_${suffix}`;
const adminPassword = randomUUID();
const project = { database, migrator: `daify_migrator_${suffix}`, runtime: `daify_runtime_${suffix}` };
const recoveryProject = { database, migrator: `daify_migrator_${suffix}_recovery`, runtime: `daify_runtime_${suffix}_recovery` };
const rollbackProject = { database, migrator: `daify_migrator_${suffix}_rollback`, runtime: `daify_runtime_${suffix}_rollback` };
const partialProject = { database, migrator: `daify_migrator_${suffix}_partial`, runtime: `daify_runtime_${suffix}_partial` };
const bootstrap = new pg.Client({ connectionString: input, connectionTimeoutMillis: 5000 });
let fixtureClient, adminClient;

function urlFor(base, databaseName, username, password) {
  const url = new URL(base); url.pathname = `/${databaseName}`; url.username = username; url.password = password; return url.toString();
}
async function connectRole(role, password, work) {
  const client = new pg.Client({ connectionString: urlFor(input, database, role, password), connectionTimeoutMillis: 5000 });
  try { await client.connect(); return await work(client); } finally { await client.end(); }
}
async function passwordVerifier(role) {
  return (await bootstrap.query('SELECT rolpassword FROM pg_authid WHERE rolname=$1', [role])).rows[0].rolpassword;
}

try {
  await bootstrap.connect();
  await bootstrap.query(`CREATE ROLE ${pg.escapeIdentifier(administrator)} LOGIN PASSWORD ${pg.escapeLiteral(adminPassword)} NOSUPERUSER NOCREATEDB CREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`);
  await bootstrap.query(`CREATE DATABASE ${pg.escapeIdentifier(database)} OWNER ${pg.escapeIdentifier(administrator)}`);

  fixtureClient = new pg.Client({ connectionString: urlFor(input, database, new URL(input).username, new URL(input).password), connectionTimeoutMillis: 5000 });
  await fixtureClient.connect();
  await fixtureClient.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  await fixtureClient.end(); fixtureClient = undefined;

  adminClient = new pg.Client({ connectionString: urlFor(input, database, administrator, adminPassword), connectionTimeoutMillis: 5000 });
  await adminClient.connect();
  const { rows: [adminFlags] } = await adminClient.query('SELECT rolsuper, rolcreaterole FROM pg_roles WHERE rolname=current_user');
  assert.deepEqual(adminFlags, { rolsuper: false, rolcreaterole: true });

  const secrets = { migrationPassword: randomUUID(), runtimePassword: randomUUID() };
  const fresh = await setupRolesPhased(adminClient, secrets, connectRole, project);
  assert.equal(fresh.resumed, false);
  const runtimeVerifier = await passwordVerifier(project.runtime);
  await assert.rejects(
    setupRolesPhased(adminClient, { ...secrets, runtimePassword: randomUUID() }, connectRole, project),
    error => error.code === '28P01',
  );
  assert.equal(await passwordVerifier(project.runtime), runtimeVerifier);
  const resumed = await setupRolesPhased(adminClient, secrets, connectRole, project);
  assert.equal(resumed.resumed, true);
  assert.equal(await passwordVerifier(project.runtime), runtimeVerifier);

  // PostgreSQL 17 grants a CREATEROLE creator ADMIN membership without SET.
  // This reproduces the managed failure that the old single-session setup hit.
  await adminClient.query('BEGIN');
  await assert.rejects(
    adminClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${pg.escapeIdentifier(project.migrator)} REVOKE ALL ON TABLES FROM PUBLIC`),
    error => error.code === '42501',
  );
  await adminClient.query('ROLLBACK');

  await connectRole(project.migrator, secrets.migrationPassword, async migrationClient => {
    await verifyRole(migrationClient, project.migrator, project);
    await verifyMigratorDefaults(migrationClient, project);
    await migrationClient.query('CREATE TABLE public.role_probe (id integer PRIMARY KEY)');
    await migrationClient.query('CREATE FUNCTION public.role_probe_function() RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$');
  });
  const { rows: [defaults] } = await adminClient.query(`SELECT has_function_privilege($1, 'public.role_probe_function()', 'EXECUTE') AS function_access, has_table_privilege($1, 'public.role_probe', 'SELECT') AS table_access`, [project.runtime]);
  assert.equal(defaults.function_access, false); assert.equal(defaults.table_access, false);
  await connectRole(project.runtime, secrets.runtimePassword, async runtimeClient => {
    await verifyRole(runtimeClient, project.runtime, project);
    await assert.rejects(runtimeClient.query('CREATE TABLE public.forbidden_probe (id integer)'), error => error.code === '42501');
    await assert.rejects(runtimeClient.query('SELECT * FROM public.role_probe'), error => error.code === '42501');
    await assert.rejects(runtimeClient.query('SELECT public.role_probe_function()'), error => error.code === '42501');
    await assert.rejects(runtimeClient.query(`SET ROLE ${pg.escapeIdentifier(project.migrator)}`), error => error.code === '42501');
  });
  assert.match(await passwordVerifier(project.runtime), /^SCRAM-SHA-256\$4096:/);
  await adminClient.query('DROP TABLE public.role_probe');
  await adminClient.query('DROP FUNCTION public.role_probe_function()');

  // Simulate a process dying after the administrator transaction committed.
  const recoverySecrets = { migrationPassword: randomUUID(), runtimePassword: randomUUID() };
  await prepareRoles(adminClient, recoverySecrets, recoveryProject);
  const recoveryVerifier = await passwordVerifier(recoveryProject.runtime);
  const recovered = await setupRolesPhased(adminClient, recoverySecrets, connectRole, recoveryProject);
  assert.equal(recovered.resumed, true);
  assert.equal(await passwordVerifier(recoveryProject.runtime), recoveryVerifier);

  const partialPassword = randomUUID();
  await adminClient.query(`CREATE ROLE ${pg.escapeIdentifier(partialProject.migrator)} LOGIN PASSWORD ${pg.escapeLiteral(partialPassword)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`);
  const partialVerifier = await passwordVerifier(partialProject.migrator);
  await assert.rejects(setupRolesPhased(adminClient, { migrationPassword: partialPassword, runtimePassword: randomUUID() }, connectRole, partialProject), /Only part/);
  assert.equal(await passwordVerifier(partialProject.migrator), partialVerifier);

  await adminClient.query('GRANT CREATE ON SCHEMA public TO PUBLIC');
  const rollbackSecrets = { migrationPassword: randomUUID(), runtimePassword: randomUUID() };
  await assert.rejects(prepareRoles(adminClient, rollbackSecrets, rollbackProject), /PUBLIC grants schema creation/);
  assert.equal((await adminClient.query('SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])', [[rollbackProject.migrator, rollbackProject.runtime]])).rows.length, 0);
  await adminClient.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');

  console.log('PASS: phased setup works under a non-superuser CREATEROLE administrator; both real logins and migrator defaults verify, unsafe grants roll back atomically, and an interrupted setup resumes without replacing credentials.');
} finally {
  if (adminClient) await adminClient.end();
  if (fixtureClient) await fixtureClient.end();
  try {
    await bootstrap.query(`DROP DATABASE IF EXISTS ${pg.escapeIdentifier(database)} WITH (FORCE)`);
  } finally {
    for (const role of [partialProject.runtime, partialProject.migrator, rollbackProject.runtime, rollbackProject.migrator, recoveryProject.runtime, recoveryProject.migrator, project.runtime, project.migrator, administrator]) {
      try { await bootstrap.query(`DROP ROLE IF EXISTS ${pg.escapeIdentifier(role)}`); } catch {}
    }
    await bootstrap.end();
  }
}
