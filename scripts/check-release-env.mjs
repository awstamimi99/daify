import { releaseDatabaseSettings } from './lib/staging-release-database.mjs';
const required = ['RENDER_API_KEY', 'RENDER_SERVICE_ID', 'NETLIFY_AUTH_TOKEN', 'NETLIFY_SITE_ID', 'MIGRATION_DATABASE_URL', 'STAGING_RUNTIME_DATABASE_URL', 'STAGING_DATABASE_CA', 'DAIFY_API_URL', 'DAIFY_WEB_ORIGIN'];
for (const name of required) {
  if (!process.env[name]?.trim()) throw new Error(`Missing release configuration: ${name}`);
}
for (const name of ['DAIFY_API_URL', 'DAIFY_WEB_ORIGIN']) {
  let url;
  try { url = new URL(process.env[name]); } catch { throw new Error(`${name} must be a canonical HTTPS origin.`); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error(`${name} must be a canonical HTTPS origin.`);
}
releaseDatabaseSettings(process.env);
console.log('Release configuration is present; no secret values logged.');
