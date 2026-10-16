import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, lstatSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { credentials, initPrivate, passwordFromFile, privateFile, roleUrl, safeConnectionError, stagingProject } from './lib/staging-database.mjs';

test('private setup preserves credentials and never accepts a world-readable password or symlink', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'daify-staging-test-'));
  try {
    const path = initPrivate(dir); assert.equal(lstatSync(dir).mode & 0o777, 0o700);
    assert.equal(lstatSync(path).mode & 0o777, 0o600);
    assert.throws(() => passwordFromFile(path), /Save only/);
    writeFileSync(path, 'placeholder-for-testing-only\n'); assert.equal(passwordFromFile(path), 'placeholder-for-testing-only');
    const one = credentials(dir), two = credentials(dir); assert.deepEqual(one, two);
    assert.notEqual(one.migrationPassword, one.runtimePassword); assert.equal(lstatSync(resolve(dir, 'database-credentials.json')).mode & 0o777, 0o600);
    assert.equal(readFileSync(resolve(dir, 'database-credentials.json'), 'utf8').includes(one.runtimePassword), true);
    chmodSync(path, 0o644); assert.throws(() => passwordFromFile(path), /chmod 600/);
    const link = resolve(dir, 'link'); symlinkSync(path, link); assert.throws(() => privateFile(link), /regular files/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('pooler URLs encode reserved password characters and distinguish the Prisma CLI from pg runtime', () => {
  const password = 'synthetic:@/?& space';
  const runtime = new URL(roleUrl(stagingProject, stagingProject.runtime, password));
  assert.equal(decodeURIComponent(runtime.password), password);
  assert.equal(runtime.hostname, stagingProject.host); assert.equal(runtime.port, '5432');
  assert.equal(runtime.username, 'daify_runtime.dflhhtefjqelevmhvyin');
  assert.equal(runtime.searchParams.get('sslmode'), 'verify-full');
  const migration = new URL(roleUrl(stagingProject, stagingProject.migrator, password, { migration: true, caPath: '/private/supabase-ca.crt' }));
  assert.equal(migration.searchParams.get('sslmode'), 'require'); assert.equal(migration.searchParams.get('sslaccept'), 'strict');
  assert.equal(migration.searchParams.get('sslcert'), '/private/supabase-ca.crt'); assert.equal(migration.searchParams.get('connection_limit'), '1');
});
test('connection errors cannot disclose passwords, URIs or the SQL submitted to PostgreSQL', () => {
  const secret = 'do-not-print-this-value';
  const driver = Object.assign(new Error(`postgresql://postgres:${secret}@pooler.example.test CREATE ROLE x PASSWORD '${secret}'`), { code: 'XX000' });
  assert.equal(safeConnectionError(driver).includes(secret), false);
  assert.equal(safeConnectionError(Object.assign(driver, { code: '28P01' })).includes(secret), false);
  assert.match(safeConnectionError(Object.assign(driver, { code: 'SELF_SIGNED_CERT_IN_CHAIN' })), /project CA/);
});
