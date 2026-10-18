# DAIFY launch progress

Last updated: 2026-10-18

## Completed

- Repository, architecture, feature, schema, migration, test and deployment configuration audit initiated and Beta scope fixed.
- Supabase staging identity and TLS verified; `public` was empty before role setup.
- Restricted `daify_migrator` and `daify_runtime` created and independently verified with actual credentials and migrator default ACL checks.
- All 15 reviewed Prisma migrations applied to Supabase staging through `daify_migrator`; 41 application tables are owned by that role.
- Runtime access granted only to the reviewed 41-table allowlist. `daify_runtime` cannot read Prisma migration history, execute public functions or create schema objects.
- Disposable PostgreSQL 17 migration rehearsal and the full API suite pass with the restricted runtime identity.
- Full browser acceptance passes locally for authentication, menus, publishing, QR, bilingual rendering, employee permissions, offers, support, analytics and accessibility.
- Browser-test startup now pins seeding, API and fixtures to the same validated local `TEST_DATABASE_URL`, rejects hosted/redirected URLs, and refuses to reuse servers with unknown database targets.
- Current production dependency audit: 0 vulnerabilities.
- Lint, typecheck, Next.js production build and script tests pass.

## Current checkpoint

The owner explicitly deferred hosting account setup and email domain configuration
and requested deployment preparation without deployment. Independent development,
integration and security verification continued. No services were deployed and no
hosted database changes were made during this checkpoint.

- Billing-disabled Beta has a bilingual, mobile-accessible no-charges page. It
  does not offer sandbox checkout/trial actions that the backend refuses.
- A dedicated Beta browser run exercises core journeys with billing and analytics
  disabled, independently of sandbox regression coverage.
- The release workflow pins the Supabase project, verifies TLS with a runner-local
  CA, checks both real role logins, runs Prisma, grants only reviewed table access,
  and fails before service deployment if any phase fails.
- Runtime verification rejects excessive privileges, grant options, incorrect
  ownership, unexpected views/sequences and public schema default-ACL leakage.
- The real S3 SDK is exercised against a local HTTP fixture for signed private
  upload/read/delete and provider failure redaction. Hosted storage proof remains open.
- API and role-test guards now reject hosted targets and query-string connection
  overrides before destructive fixture operations.

## Pending external dependencies

- Render/Netlify account setup and runtime secret configuration: explicitly deferred.
- Email domain verification and hosted SMTP delivery: explicitly deferred.
- Private hosted object-store credentials and actual provider upload/read/delete.
- Hosted ingress, HTTPS/cookies, SSR/native QR, cold starts and rollback acceptance
  require a future approved deployment. These do not prevent local development.

## Test results

- `node --test scripts/*.test.mjs`: 15/15 passed, including browser database isolation and secret-safe rejection.
- Database-role integration test passes under a PostgreSQL 17 non-superuser administrator with `CREATEROLE`.
- Disposable PostgreSQL 17: 15/15 migrations applied; runtime grant verification passed for 41 tables.
- API: 30 suites passed, 205/205 tests passed, including a real local Redis/BullMQ worker; no skipped API checks.
- Next.js/API browser acceptance: 75/75 passed against a freshly migrated PostgreSQL 17 database.
- Repeat acceptance with the built Next.js frontend and compiled test-mode API: 75/75 passed while inherited `DATABASE_URL` pointed to an intentionally unusable address, proving test-target selection. This is local evidence, not production configuration or hosted acceptance.
- Dedicated Beta mode: 68/68 browser checks passed with disabled billing/analytics, built Next.js and compiled API, including payment refusal and Arabic accessibility. The API uses the isolated test email adapter; this is not hosted mail acceptance.
- Regular sandbox regression after the Beta UI change: 75 passed, 1 Beta-only test intentionally skipped.
- Local restore rehearsal: 41 tables / 15 migration records / 94 synthetic rows matched exactly after encrypted export and restricted-migrator restore; runtime verification passed. 42 JPEG fixtures round-tripped authenticated encryption. Hosted recovery remains pending.
- S3-compatible wire tests: 3 passed; image validation: 3 passed.
- Standalone prototype/template browser suite: 17/17 passed.
- `npm audit --omit=dev --audit-level=high`: 0 findings.
- Root lint, typecheck and build passed sequentially with a synthetic loopback database URL.
- Offline Netlify packaging/artifact inspection passed: Node 24 function, protected edge routes, 678 public files and native Sharp (macOS/ARM64). Release packaging must run on Linux CI.

## Deployment status

- Supabase staging: 15 migrations applied; 41 application tables and least-privilege runtime grants independently verified. No seed was applied.
- Render API: not deployed/verified.
- Netlify web: packaging configuration exists; hosted deployment not verified.
- Production: untouched.

## Security concerns

- Rotate the previously shared database administrator password after migration work.
- Do not enable billing, analytics workers or public Data API access for Beta without their remaining acceptance checks.

## Next actions

1. Preserve the tested checkpoint on the development branch and check CI.
2. When the owner resumes provider setup, use the staging and production-readiness
   runbooks; inject secrets through provider controls, then review the exact commit.
3. Deploy only after the owner lifts the current no-deployment instruction.
4. Perform hosted acceptance before inviting customers or declaring launch complete.

## Estimated Beta readiness

The core Beta journeys and deployment configuration are locally verified. Hosting,
mail, storage and deployed acceptance remain pending external work; DAIFY has not
been declared live or production-ready. See [production readiness](DAIFY_PRODUCTION_READINESS.md)
and [checkpoint evidence](../QA/BETA_DEPLOYMENT_PREPARATION_2026-10-18.md).
