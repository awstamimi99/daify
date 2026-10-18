import { releaseDatabaseSettings, runDatabaseRelease } from './lib/staging-release-database.mjs';

try {
  const command = process.argv[2];
  if (process.argv.length !== 3 || !['status', 'deploy'].includes(command)) throw new Error('Usage: node scripts/staging-release-database.mjs status|deploy');
  const settings = releaseDatabaseSettings(process.env);
  const result = await runDatabaseRelease(command, settings);
  console.log(JSON.stringify({ project: 'daify-staging', ...result, certificateVerified: true }));
} catch {
  // Do not forward subprocess/driver error messages, even on configuration failure.
  console.error('Staging database release failed. Check configuration and migration state securely; no service deployment should proceed. No automatic rollback or retry was attempted.');
  process.exitCode = 1;
}
