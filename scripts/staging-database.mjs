import { resolve } from 'node:path';
import { initPrivate, privateDirectory, passwordFromFile, credentials, stagingProject, inspectDatabase, withClient, prepareRoles, verifyRole, roleUrl, privateFile, writePrivate, safeConnectionError } from './lib/staging-database.mjs';
const command = process.argv[2] ?? 'help';
try {
  if (process.argv.length > 3 || !['help', 'init', 'check', 'setup-roles', 'verify-roles'].includes(command)) throw new Error('Unsupported command.');
  if (command === 'help') console.log('Usage: npm run staging:db -- init | check | setup-roles | verify-roles\nThe target is daify-staging. These commands never run migrations or seed data.');
  else if (command === 'init') {
    const path = initPrivate();
    console.log(`Private input file: ${path}\nSave only the new database password here. It is ignored by Git. No database connection was opened.`);
  } else if (command === 'check') {
    const password = passwordFromFile(resolve(privateDirectory, 'admin-password.txt'));
    const info = await withClient('postgres', password, inspectDatabase);
    console.log(JSON.stringify(info, null, 2));
  } else if (command === 'setup-roles') {
    const password = passwordFromFile(resolve(privateDirectory, 'admin-password.txt'));
    const secrets = credentials();
    await withClient('postgres', password, async client => {
      const info = await inspectDatabase(client);
      if (info.username !== 'postgres') throw new Error('Unexpected database administrator; no changes were made.');
      await prepareRoles(client, secrets);
    });
    // Save connection strings only to the ignored file; never console output.
    const path = resolve(privateDirectory, 'role-connections.env');
    const ca = privateFile(resolve(privateDirectory, 'supabase-ca.crt'), '');
    if (privateFile(path, null) === null) writePrivate(path, `MIGRATION_DATABASE_URL=${roleUrl(stagingProject, stagingProject.migrator, secrets.migrationPassword, { migration: true, ...(ca ? { caPath: resolve(privateDirectory, 'supabase-ca.crt') } : {}) })}\nDATABASE_URL=${roleUrl(stagingProject, stagingProject.runtime, secrets.runtimePassword)}\nDATABASE_POOL_MAX=3\nDATABASE_CONNECTION_TIMEOUT_MS=10000\n${ca ? `DATABASE_SSL_CA=${JSON.stringify(ca)}\n` : ''}`);
    console.log('Migration and runtime roles were created. Credentials are in .local/staging/database-credentials.json and role-connections.env. Verify both roles next. No application tables were created.');
  } else {
    const secrets = JSON.parse(privateFile(resolve(privateDirectory, 'database-credentials.json')));
    if (secrets.projectRef !== stagingProject.reference) throw new Error('The saved role credentials do not match this staging project.');
    for (const [role, password] of [[stagingProject.migrator, secrets.migrationPassword], [stagingProject.runtime, secrets.runtimePassword]]) {
      const row = await withClient(role, password, client => verifyRole(client, role));
      console.log(JSON.stringify({ ...row, certificateVerified: true }));
    }
    console.log('Both roles match the intended boundary. Step 4 will apply migrations and grant runtime access to the reviewed application tables.');
  }
} catch (error) { console.error(safeConnectionError(error)); process.exitCode = 1; }
