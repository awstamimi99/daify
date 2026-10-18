# Beta deployment preparation — 2026-10-18

Branch: `feat/m8-staging`. All execution below was local. No deployment, hosted
database change, password reset, provider setup or email-domain change occurred.

## Changes

- Billing-disabled Beta UI now explains no-charge access in English/Arabic and
  omits sandbox payment controls. Dedicated Beta acceptance uses disabled billing
  and analytics and runs in CI alongside the full sandbox regression.
- S3 SDK wire coverage uses a loopback HTTP fixture for signed path-style private
  PUT/GET/DELETE. Delete failures now use the same redacted 503 behavior as reads
  and uploads. Existing image format/metadata/pixel-bomb checks remain intact.
- API/browser/role-test database guards require an explicit local test database
  and reject connection overrides. Secrets are not included in rejection messages.
- Staging release configuration now supplies CA PEM and separate migration/runtime
  URLs. A private temporary CA file is used by Prisma; only migration credentials
  reach its subprocess. Actual restricted logins verify TLS, identity, ACLs and
  ownership before service promotion. Raw subprocess/driver errors are suppressed.
- Runtime checks detect excessive grants/options and unreviewed objects.
  Schema-scoped PUBLIC default grants can no longer escape verification.

## Verification

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; synthetic loopback DB URL, no database connection |
| `node --test scripts/*.test.mjs` | 15 passed |
| `npm run staging:db:test` | Passed on disposable PostgreSQL 17.11 with a non-superuser CREATEROLE administrator and actual SCRAM role logins |
| `npm run test:api` | 30 suites / 205 passed; local PostgreSQL and Redis, zero skipped |
| `WEB_TEST_PRODUCTION=true npm run test:web` | 75 passed, Beta-only test intentionally skipped |
| `npm run test:beta` | 68 passed against freshly migrated PostgreSQL, built web and compiled test API |
| S3 wire + image parsing suites | 6 passed, included in API total |
| Offline Netlify build + artifact inspector | Passed; 678 public files, Node 24 server function, edge protection, native Sharp, no synthetic signing key in public output |
| Local encrypted DB restore rehearsal | 41 tables, 15 migration rows, 94 synthetic rows, exact data hashes; restricted migrator restore and runtime verification passed |

The role fixture first exposed a local harness configuration mistake: trust
authentication cannot test wrong-password rejection. The fixture was rerun with
SCRAM for restricted roles and passed. The first restore attempt stopped on the
provider-owned schema comment; excluding schema creation/comment entries allowed
restore without ownership changes. Both findings are reflected in the runbook.

Release failure tests inject failure at every phase and prove subsequent phases
do not execute, operations are not replayed and raw credential-bearing errors
are redacted. CA cleanup is verified on both success and failure. Read-only
release status does not grant privileges or run migration deploy.

## Limits and pending dependencies

Browser API servers use `NODE_ENV=test` for isolated email verification fixtures;
the web uses its production build. SMTP has independent loopback transport tests,
but actual sender authentication/inbox delivery remains external acceptance.
S3 tests exercise the real SDK with a fixture, not Supabase IAM/bucket behavior.
The release coordinator uses injected process/connection phase tests; it was not
executed against hosted Supabase in this checkpoint. SQL checks themselves run
against a real local PostgreSQL 17 service.

The Netlify artifact is macOS/ARM64 evidence; Linux CI must package the release.
Hosted SSR/QR, trusted ingress, HTTPS cookies, private storage, email, cold-start
behavior and provider rollback remain pending an approved deployment. Hosting
and email setup are explicitly deferred external dependencies, not development
blockers. Refer to [production readiness](../launch/DAIFY_PRODUCTION_READINESS.md).
