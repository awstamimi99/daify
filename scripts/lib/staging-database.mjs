import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

export const stagingProject = Object.freeze({ reference: 'dflhhtefjqelevmhvyin', host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres', migrator: 'daify_migrator', runtime: 'daify_runtime' });
export const applicationTables = Object.freeze([
  'action_tokens', 'analytics_daily', 'analytics_events', 'analytics_receipts',
  'billing_checkouts', 'billing_observations', 'billing_overrides', 'billing_plans',
  'billing_subscriptions', 'billing_webhook_events', 'commercial_acceptances',
  'discount_coupons', 'inbox_notifications', 'locations', 'menu_image_translations',
  'menu_item_images', 'menu_item_translations', 'menu_items', 'menu_routes',
  'menu_section_translations', 'menu_sections', 'menu_translations',
  'menu_version_images', 'menu_versions', 'menus', 'organization_member_locations',
  'organization_members', 'organizations', 'platform_staff', 'pricing_quotes',
  'publication_events', 'publication_operations', 'rate_limit_buckets',
  'sales_discount_allowances', 'security_events', 'security_notifications',
  'sessions', 'support_messages', 'support_tickets', 'themes', 'users',
]);
export const privateDirectory = resolve('.local/staging');
export function privateFile(path, fallback) {
  let stat;
  try { stat = lstatSync(path); } catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw new Error('Required local credential file is missing. Run npm run staging:db -- init.'); }
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw new Error('Credential files must be regular files readable only by your account (chmod 600).');
  return readFileSync(path, 'utf8');
}
export function writePrivate(path, contents) {
  writeFileSync(path, contents, { flag: 'wx', mode: 0o600 });
}
export function initPrivate(directory = privateDirectory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('The credential directory must be a real local directory.');
  chmodSync(directory, 0o700);
  const passwordPath = resolve(directory, 'admin-password.txt');
  if (privateFile(passwordPath, null) === null) writePrivate(passwordPath, '');
  return passwordPath;
}
export function passwordFromFile(path) {
  const value = privateFile(path).replace(/[\r\n]+$/, '');
  // Validate the saved credential's format; Supabase enforces its password policy when it is set.
  if (value.length === 0 || value.length > 256 || /[\r\n\0]/.test(value) || value.includes('[YOUR-PASSWORD]')) throw new Error('Save only your new database password in .local/staging/admin-password.txt, then retry.');
  return value;
}
export function credentials(directory = privateDirectory, project = stagingProject) {
  const path = resolve(directory, 'database-credentials.json');
  const saved = privateFile(path, null);
  if (saved !== null) {
    let data; try { data = JSON.parse(saved); } catch { throw new Error('The local role credential file is invalid; it has not been overwritten.'); }
    if (data.projectRef !== project.reference || !/^[A-Za-z0-9_-]{43}$/.test(data.migrationPassword) || !/^[A-Za-z0-9_-]{43}$/.test(data.runtimePassword)) throw new Error('The saved role credentials do not match this staging project.');
    return data;
  }
  const data = { projectRef: project.reference, migrationPassword: randomBytes(32).toString('base64url'), runtimePassword: randomBytes(32).toString('base64url'), createdAt: new Date().toISOString() };
  writePrivate(path, `${JSON.stringify(data, null, 2)}\n`);
  return data;
}
export function scramVerifier(password) {
  // Only the verifier, never the role's plain password, is sent in role DDL.
  const salt = randomBytes(16), salted = pbkdf2Sync(password, salt, 4096, 32, 'sha256');
  const client = createHmac('sha256', salted).update('Client Key').digest();
  const stored = createHash('sha256').update(client).digest('base64');
  const server = createHmac('sha256', salted).update('Server Key').digest('base64');
  return `SCRAM-SHA-256$4096:${salt.toString('base64')}$${stored}:${server}`;
}
export function roleIdentifier(value) {
  if (!/^daify_[a-z0-9_]{1,48}$/.test(value)) throw new Error('Invalid DAIFY database role name.');
  return `"${value}"`;
}
export function roleUrl(project, role, password, { migration = false, caPath } = {}) {
  const url = new URL(`postgresql://${project.host}:${project.port}/${project.database}`);
  url.username = `${role}.${project.reference}`; url.password = password;
  if (migration) url.searchParams.set('connection_limit', '1');
  url.searchParams.set('sslmode', 'verify-full'); url.searchParams.set('schema', 'public');
  if (migration && caPath) url.searchParams.set('sslrootcert', caPath);
  return url.toString();
}
export function clientOptions(user, password, { project = stagingProject, directory = privateDirectory } = {}) {
  // The target is pinned; callers cannot supply arbitrary database URLs.
  if (project !== stagingProject) throw new Error('Hosted commands are pinned to the recorded staging project.');
  const cert = resolve(directory, 'supabase-ca.crt');
  const ca = privateFile(cert, '');
  return { host: project.host, port: project.port, database: project.database, user: `${user}.${project.reference}`, password,
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, connectionTimeoutMillis: 10000, query_timeout: 10000, application_name: 'daify-staging-setup' };
}
export async function withClient(user, password, work, options) {
  const client = new pg.Client(clientOptions(user, password, options));
  client.on('error', () => { /* Active queries surface failures through the sanitized CLI handler. */ });
  try { await client.connect(); if (!client.connection.stream.encrypted || !client.connection.stream.authorized) throw new Error('Certificate-verified TLS is required.'); return await work(client); } finally { await client.end(); }
}
export async function inspectDatabase(client) {
  const { rows: [row] } = await client.query(`SELECT current_database() AS database, current_user AS username,
    current_setting('server_version') AS version,
    (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public') AS public_tables`);
  if (row.database !== stagingProject.database) throw new Error('Unexpected database; no changes were made.');
  const { rows: roles } = await client.query('SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls, rolinherit, rolconnlimit FROM pg_roles WHERE rolname = ANY($1::text[]) ORDER BY rolname', [[stagingProject.migrator, stagingProject.runtime]]);
  return { ...row, roles, certificateVerified: true };
}
export async function prepareRoles(client, secrets, project = stagingProject) {
  const migrator = roleIdentifier(project.migrator), runtime = roleIdentifier(project.runtime);
  await client.query('BEGIN');
  try {
    await client.query(`SELECT pg_advisory_xact_lock(17102026, 3)`);
    const { rows: existing } = await client.query('SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])', [[project.migrator, project.runtime]]);
    if (existing.length) throw new Error('DAIFY roles already exist. No passwords or grants were changed; use verify-roles before continuing.');
    const { rows: [{ tables }] } = await client.query("SELECT count(*)::int AS tables FROM pg_tables WHERE schemaname = 'public'");
    if (tables !== 0) throw new Error('The public schema is no longer empty. Stop for an ownership review before preparing roles.');
    await client.query("SELECT set_config('daify.migrator_verifier', $1, true), set_config('daify.runtime_verifier', $2, true)", [scramVerifier(secrets.migrationPassword), scramVerifier(secrets.runtimePassword)]);
    for (const [role, setting, limit] of [[migrator, 'daify.migrator_verifier', 2], [runtime, 'daify.runtime_verifier', 4]]) {
      await client.query(`DO $$ BEGIN EXECUTE format('CREATE ROLE ${role} LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT CONNECTION LIMIT ${limit}', current_setting('${setting}')); END $$`);
    }
    await client.query(`GRANT CONNECT ON DATABASE ${pg.escapeIdentifier(project.database)} TO ${migrator}, ${runtime}`);
    await client.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${migrator}`);
    await client.query(`GRANT USAGE ON SCHEMA public TO ${runtime}`);
    await client.query(`ALTER ROLE ${migrator} SET search_path TO public`);
    await client.query(`ALTER ROLE ${runtime} SET search_path TO public`);
    await client.query(`ALTER ROLE ${runtime} SET statement_timeout TO '30s'`);
    await client.query(`ALTER ROLE ${runtime} SET idle_in_transaction_session_timeout TO '30s'`);
    const check = (await client.query('SELECT has_schema_privilege($1,\'public\',\'CREATE\') AS can_create', [project.runtime])).rows[0];
    if (check.can_create) throw new Error('PUBLIC grants schema creation to the runtime role. Review schema privileges before setup; all role changes were rolled back.');
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
export async function configureMigratorDefaults(client, expected, project = stagingProject) {
  if (expected !== project.migrator) throw new Error('Default privileges may only be configured by the recorded migrator role.');
  const { rows: [{ username }] } = await client.query('SELECT current_user AS username');
  if (username !== expected) throw new Error('Default privileges must be configured through the migrator login itself.');
  await client.query('BEGIN');
  try {
    // Omitting FOR ROLE is intentional: a managed CREATEROLE administrator cannot
    // assume a newly created role on PostgreSQL 17, while a role may set its own defaults.
    await client.query('ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM PUBLIC');
    await client.query('ALTER DEFAULT PRIVILEGES REVOKE ALL ON SEQUENCES FROM PUBLIC');
    await client.query('ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC');
    const apiRoles = (await client.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role') ORDER BY rolname")).rows;
    for (const { rolname } of apiRoles) {
      for (const object of ['TABLES', 'SEQUENCES', 'FUNCTIONS']) await client.query(`ALTER DEFAULT PRIVILEGES REVOKE ALL ON ${object} FROM ${pg.escapeIdentifier(rolname)}`);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
export async function verifyMigratorDefaults(client, project = stagingProject) {
  const { rows: [{ username }] } = await client.query('SELECT current_user AS username');
  if (username !== project.migrator) throw new Error('Migrator default privileges must be verified through the migrator login itself.');
  const { rows: forbidden } = await client.query(`SELECT d.defaclobjtype, COALESCE(g.rolname, 'PUBLIC') AS grantee
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    LEFT JOIN pg_roles g ON g.oid=a.grantee
    WHERE d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname=current_user)
      AND d.defaclnamespace=0
      AND d.defaclobjtype IN ('r','S','f')
      AND (a.grantee=0 OR g.rolname IN ('anon','authenticated','service_role'))`);
  const { rows: functionDefaults } = await client.query(`SELECT 1 FROM pg_default_acl
    WHERE defaclrole=(SELECT oid FROM pg_roles WHERE rolname=current_user)
      AND defaclnamespace=0 AND defaclobjtype='f'`);
  if (forbidden.length || functionDefaults.length !== 1) throw new Error('Migrator default privileges did not match the intended boundary.');
}
export async function verifyRole(client, expected, project = stagingProject) {
  const { rows: [row] } = await client.query(`SELECT current_user AS username, r.rolcanlogin, r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication, r.rolbypassrls, r.rolinherit, r.rolconnlimit,
    has_schema_privilege(current_user,'public','USAGE') AS schema_usage,
    has_schema_privilege(current_user,'public','CREATE') AS schema_create,
    has_database_privilege(current_user,current_database(),'CREATE') AS database_create
    FROM pg_roles r WHERE r.rolname=current_user`);
  const runtime = expected === project.runtime;
  if (row.username !== expected || !row.rolcanlogin || row.rolsuper || row.rolcreatedb || row.rolcreaterole || row.rolreplication || row.rolbypassrls || row.rolinherit || row.database_create || !row.schema_usage || row.schema_create === runtime || row.rolconnlimit !== (runtime ? 4 : 2)) throw new Error('Database role privileges did not match the intended boundary.');
  const { rows: memberships } = await client.query('SELECT r.rolname FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member WHERE u.rolname=current_user');
  if (memberships.length) throw new Error('An application role unexpectedly belongs to another database role.');
  return row;
}
export async function setupRolesPhased(adminClient, secrets, connectRole, project = stagingProject) {
  await adminClient.query('SELECT pg_advisory_lock(17102026, 3)');
  let resumed = false;
  try {
    const { rows: existing } = await adminClient.query('SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[]) ORDER BY rolname', [[project.migrator, project.runtime]]);
    if (existing.length === 0) await prepareRoles(adminClient, secrets, project);
    else {
      if (existing.length !== 2 || !existing.some(({ rolname }) => rolname === project.migrator) || !existing.some(({ rolname }) => rolname === project.runtime)) throw new Error('Only part of the DAIFY role pair exists. No existing role was changed; perform an ownership review before recovery.');
      const { rows: [{ tables }] } = await adminClient.query("SELECT count(*)::int AS tables FROM pg_tables WHERE schemaname = 'public'");
      if (tables !== 0) throw new Error('The public schema is no longer empty. Stop for an ownership review before resuming role setup.');
      // Existing roles are resumable only when their saved credentials and exact
      // restricted profiles verify. This never resets a password or alters a role.
      await connectRole(project.migrator, secrets.migrationPassword, client => verifyRole(client, project.migrator, project));
      await connectRole(project.runtime, secrets.runtimePassword, client => verifyRole(client, project.runtime, project));
      resumed = true;
    }
    await connectRole(project.migrator, secrets.migrationPassword, async client => {
      await verifyRole(client, project.migrator, project);
      await configureMigratorDefaults(client, project.migrator, project);
      await verifyMigratorDefaults(client, project);
    });
    await connectRole(project.runtime, secrets.runtimePassword, client => verifyRole(client, project.runtime, project));
    return { resumed };
  } finally {
    await adminClient.query('SELECT pg_advisory_unlock(17102026, 3)');
  }
}
export async function grantRuntimeAccess(client, project = stagingProject) {
  const { rows: [{ username }] } = await client.query('SELECT current_user AS username');
  if (username !== project.migrator) throw new Error('Runtime grants must be applied through the migrator login.');
  const { rows } = await client.query(`SELECT c.relname, r.rolname AS owner
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname <> '_prisma_migrations' ORDER BY c.relname`);
  if (rows.length !== applicationTables.length || rows.some((row, index) => row.relname !== applicationTables[index])) throw new Error('The migrated application table set does not match the reviewed runtime allowlist. No runtime grants were changed.');
  if (rows.some(row => row.owner !== project.migrator)) throw new Error('An application table is not owned by the migrator. No runtime grants were changed.');
  const tables = applicationTables.map(pg.escapeIdentifier).join(', '), runtime = roleIdentifier(project.runtime);
  await client.query('BEGIN');
  try {
    await client.query(`REVOKE ALL ON TABLE ${tables} FROM PUBLIC`);
    const apiRoles = (await client.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') ORDER BY rolname")).rows;
    for (const { rolname } of apiRoles) await client.query(`REVOKE ALL ON TABLE ${tables} FROM ${pg.escapeIdentifier(rolname)}`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${tables} TO ${runtime}`);
    const sequences = (await client.query("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='S' ORDER BY c.relname")).rows;
    if (sequences.length) await client.query(`GRANT USAGE, SELECT ON SEQUENCE ${sequences.map(({ relname }) => pg.escapeIdentifier(relname)).join(', ')} TO ${runtime}`);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  return { tables: rows.length, sequences: (await client.query("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='S'")).rows[0].count };
}
export async function verifyRuntimeAccess(client, project = stagingProject) {
  await verifyRole(client, project.runtime, project);
  const { rows } = await client.query(`SELECT c.relname,
    has_table_privilege(current_user, c.oid, 'SELECT') AS can_select,
    has_table_privilege(current_user, c.oid, 'INSERT') AS can_insert,
    has_table_privilege(current_user, c.oid, 'UPDATE') AS can_update,
    has_table_privilege(current_user, c.oid, 'DELETE') AS can_delete
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname`);
  const application = rows.filter(row => row.relname !== '_prisma_migrations');
  if (application.length !== applicationTables.length || application.some((row, index) => row.relname !== applicationTables[index] || !row.can_select || !row.can_insert || !row.can_update || !row.can_delete)) throw new Error('Runtime table privileges did not match the reviewed allowlist.');
  const history = rows.find(row => row.relname === '_prisma_migrations');
  if (!history || history.can_select || history.can_insert || history.can_update || history.can_delete) throw new Error('Runtime unexpectedly has access to Prisma migration history.');
  const { rows: executable } = await client.query(`SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND has_function_privilege(current_user,p.oid,'EXECUTE') ORDER BY p.proname`);
  if (executable.length) throw new Error('Runtime unexpectedly has direct execute access to a public database function.');
  return { applicationTables: application.length, migrationHistoryAccessible: false, executableFunctions: 0 };
}
export function safeConnectionError(error) {
  const messages = {
    '28P01': 'Authentication failed. Check the newly reset password and the saved session-pooler settings.',
    '28000': 'The database rejected authentication. Check that the staging project is active.',
    '42501': 'The database account lacks the required role or schema privileges. No broader grants were added automatically.',
    'SELF_SIGNED_CERT_IN_CHAIN': 'Certificate verification needs the project CA. Download it from Database Settings and save it as .local/staging/supabase-ca.crt (chmod 600), then retry.',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE': 'Save the project CA as .local/staging/supabase-ca.crt (chmod 600), then retry.',
    'ENOTFOUND': 'The recorded Supabase pooler hostname could not be resolved.',
    'ETIMEDOUT': 'The connection timed out. Check project status and network access.',
    'ECONNREFUSED': 'The database connection was refused. Check project status and network access.',
  };
  if (messages[error.code]) return messages[error.code];
  // Only errors raised by this module are shown. Driver errors can contain SQL or credentials.
  if (error.constructor === Error && /^(Save only|Required local|Credential files|The credential directory|The local role|The saved role|Hosted commands|Certificate-verified|Unexpected database|DAIFY roles already|Only part|The public schema|PUBLIC grants|Database role|An application role|Default privileges|Migrator default|Runtime grants|The migrated|Runtime table|Runtime unexpectedly|Invalid DAIFY)/.test(error.message)) return error.message;
  return `Database setup did not finish${/^[A-Z0-9_]{2,40}$/.test(error.code ?? '') ? ` (${error.code})` : ''}. No credentials were printed. Check the dashboard and retry deliberately.`;
}
