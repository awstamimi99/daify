import { configureIntegrationDatabase } from './support/test-database';

configureIntegrationDatabase();
// Isolated test key; never used by development or deployment processes.
process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
