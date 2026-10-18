import test from 'node:test';
import assert from 'node:assert/strict';
import { X509Certificate } from 'node:crypto';
import { rootCertificates } from 'node:tls';
import { readFile, stat } from 'node:fs/promises';
import { releaseDatabaseSettings, releaseClientOptions, prismaRelease, runDatabaseRelease } from './lib/staging-release-database.mjs';
import { stagingProject, roleUrl } from './lib/staging-database.mjs';

const ca = rootCertificates.find(value => {
  const cert = new X509Certificate(value);
  return cert.ca && Date.parse(cert.validFrom) < Date.now() && Date.parse(cert.validTo) > Date.now();
});
const configuration = () => ({
  MIGRATION_DATABASE_URL: roleUrl(stagingProject, stagingProject.migrator, 'synthetic:secret&value'),
  STAGING_RUNTIME_DATABASE_URL: roleUrl(stagingProject, stagingProject.runtime, 'synthetic-runtime-secret'),
  STAGING_DATABASE_CA: ca,
});

test('release accepts only the recorded staging project and exact restricted logins with verified TLS', () => {
  const settings = releaseDatabaseSettings(configuration());
  assert.equal(settings.migrationPassword, 'synthetic:secret&value');
  const options = releaseClientOptions(stagingProject.runtime, settings.runtimePassword, settings.ca);
  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.equal(options.ssl.ca, ca);
  assert.equal(options.host, stagingProject.host);
  for (const change of [
    url => { url.hostname = 'other.example'; },
    url => { url.username = `postgres.${stagingProject.reference}`; },
    url => { url.username = 'daify_migrator.anotherproject'; },
    url => { url.port = '6543'; },
    url => { url.pathname = '/other'; },
    url => { url.searchParams.set('sslmode', 'require'); },
    url => { url.searchParams.set('hostaddr', '127.0.0.1'); },
    url => { url.searchParams.set('sslrootcert', '/local/private/path'); },
    url => { url.password = ''; },
  ]) {
    const env = configuration(), url = new URL(env.MIGRATION_DATABASE_URL); change(url); env.MIGRATION_DATABASE_URL = url.toString();
    assert.throws(() => releaseDatabaseSettings(env), /Invalid staging database release configuration/);
  }
  for (const value of [undefined, 'synthetic-secret', `${ca}\n-----BEGIN PRIVATE KEY-----`]) {
    assert.throws(() => releaseDatabaseSettings({ ...configuration(), STAGING_DATABASE_CA: value }), /Invalid staging/);
  }
});

test('Prisma receives a private runner-local CA and only migration credentials; temporary files are removed on failure', async () => {
  for (const failing of [false, true]) {
    let path;
    const settings = releaseDatabaseSettings(configuration());
    const work = prismaRelease('status', settings, async (_file, args, options) => {
      assert.deepEqual(args.slice(-2), ['migrate', 'status']);
      const url = new URL(options.env.DATABASE_URL);
      assert.equal(url.searchParams.get('sslmode'), 'verify-full');
      assert.equal(url.searchParams.get('connection_limit'), '1');
      assert.equal(options.env.STAGING_RUNTIME_DATABASE_URL, undefined);
      assert.equal(JSON.stringify(options.env).includes(settings.runtimePassword), false);
      path = url.searchParams.get('sslrootcert');
      assert.equal(await readFile(path, 'utf8'), ca);
      assert.equal((await stat(path)).mode & 0o777, 0o600);
      if (failing) throw new Error('synthetic-process-error');
    });
    if (failing) await assert.rejects(work); else await work;
    await assert.rejects(stat(path), { code: 'ENOENT' });
  }
});

test('release stops at every failed phase, redacts errors, and never replays operations', async () => {
  const expected = ['preflight', 'deploy', 'status', 'grant', 'verify'];
  for (const failure of [...expected, null]) {
    const calls = [];
    const action = async name => { calls.push(name); if (name === failure) throw new Error('postgresql://secret:do-not-print@host'); return { applicationTables: 41 }; };
    const actions = { preflight: () => action('preflight'), prisma: name => action(name), grant: () => action('grant'), verify: () => action('verify') };
    if (failure) {
      await assert.rejects(runDatabaseRelease('deploy', {}, actions), error => !error.message.includes('secret') && /release stopped/.test(error.message));
      assert.deepEqual(calls, expected.slice(0, expected.indexOf(failure) + 1));
    } else {
      assert.deepEqual(await runDatabaseRelease('deploy', {}, actions), { applicationTables: 41 });
      assert.deepEqual(calls, expected);
    }
  }
  const calls = [];
  await runDatabaseRelease('status', {}, { preflight: async () => calls.push('preflight'), prisma: async name => calls.push(name), grant: async () => assert.fail('Read-only command granted privileges'), verify: async () => calls.push('verify') });
  assert.deepEqual(calls, ['preflight', 'status', 'verify']);
});
