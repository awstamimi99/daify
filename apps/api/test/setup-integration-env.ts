import { configureIntegrationDatabase } from './support/test-database';

configureIntegrationDatabase();
if (process.env.CI && !process.env.ANALYTICS_TEST_REDIS_URL) {
  throw new Error('CI requires ANALYTICS_TEST_REDIS_URL; worker integration must not be skipped.');
}
// Isolated test key; never used by development or deployment processes.
process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
