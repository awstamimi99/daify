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
- Current production dependency audit: 0 vulnerabilities.
- Lint, typecheck, Next.js production build and script tests pass.

## Currently working on

- Private staging image storage and SMTP feasibility/configuration.
- Provider access and release-environment inspection for Render and Netlify.
- Browser acceptance coverage for the bilingual owner-to-public-menu journey.

## Remaining

- Configure private image storage and SMTP.
- Close any backend/frontend Beta gaps found by full integration and browser tests.
- Deploy Render API and Netlify web from a reviewed commit.
- Run deployed bilingual owner-to-public-menu and tenant-isolation tests.
- Complete security/operations review and production readiness documents.

## Blockers

- Provider account authentication and required staging secrets may require owner-side account actions if no existing integration is available.
- Email delivery requires a verified sender/domain. Live billing remains intentionally blocked pending explicit commercial approval.

## Test results

- `node --test scripts/*.test.mjs`: 10/10 passed.
- Database-role integration test passes under a PostgreSQL 17 non-superuser administrator with `CREATEROLE`.
- Disposable PostgreSQL 17: 15/15 migrations applied; runtime grant verification passed for 41 tables.
- API: 29 suites passed, 200 tests passed and 1 intentionally skipped (201 total).
- Next.js/API browser acceptance: 75/75 passed against a freshly migrated PostgreSQL 17 database.
- Standalone prototype/template browser suite: 17/17 passed.
- `npm audit --omit=dev --audit-level=high`: 0 findings.
- Root lint, typecheck and build passed sequentially with a synthetic loopback database URL.

## Deployment status

- Supabase staging: 15 migrations applied; 41 application tables and least-privilege runtime grants independently verified. No seed was applied.
- Render API: not deployed/verified.
- Netlify web: packaging configuration exists; hosted deployment not verified.
- Production: untouched.

## Security concerns

- Rotate the previously shared database administrator password after migration work.
- Do not enable billing, analytics workers or public Data API access for Beta without their remaining acceptance checks.

## Next actions

1. Configure and verify private staging object storage.
2. Configure a verified staging SMTP sender or document an explicit manual-verification Beta policy.
3. Verify Render and Netlify access, set their staging environments and deploy one reviewed commit.
4. Run deployed browser, tenant-isolation and security smoke tests.

## Estimated Beta readiness

Core product implementation and the hosted database foundation are ready, but operational staging acceptance is incomplete. Current estimate: **76%**.
