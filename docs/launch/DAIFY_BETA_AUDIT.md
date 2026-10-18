# DAIFY Beta audit

Date: 2026-10-18  
Branch: `feat/m8-staging`  
Basis: repository source, Prisma schema/migrations, automated tests, deployment files and existing QA records. Hosted claims require new staging evidence.

## Architecture

DAIFY is an npm-workspace monorepo. `apps/web` is a Next.js 16 App Router frontend/BFF, `apps/api` is a NestJS 11 API using Prisma 7 and PostgreSQL 17, `packages/menu-engine` is the shared renderer, and `packages/types`/`packages/ui` contain shared contracts and controls. Netlify hosts web/edge routes, Render hosts the API, and Supabase provides PostgreSQL and planned private S3-compatible media.

The data model contains 41 application models and 15 ordered migrations. Tenant identity is organization-first, with location-scoped membership where needed. Public menu versions are immutable and exposed through stable routes independently of authenticated dashboard routes.

## Feature readiness

| Area | State | Evidence and remaining acceptance |
| --- | --- | --- |
| Marketing/legal | Implemented | Next routes and responsive shared shell exist; final production metadata/domain review remains. |
| Signup/login/logout | Implemented | Real Argon2-backed auth, verification, reset, session cookies, rate limits and API/web routes have integration coverage. Hosted SMTP is unconfigured. |
| Organization onboarding | Implemented | Organization and first-location flows persist through API/Prisma and load into the dashboard workspace. |
| Tenant authorization | Implemented, deployed proof pending | Guards and repository filters use organization/location membership; cross-tenant tests pass locally. Must repeat against deployed staging services. |
| Restaurant settings | Implemented | Location update/archive routes and dashboard UI exist. |
| Menu/category/product CRUD | Implemented | Revision-aware draft menu API/UI supports sections, items, prices, ordering, translations and availability. |
| Product images | Partial operational readiness | Validation and local/S3-compatible storage code exist; real SDK signed upload/read/delete and error redaction pass a local HTTP fixture. Staging private bucket credentials and real upload/read/delete proof are missing. |
| Templates/design | Implemented | Nine templates use the shared renderer; authenticated preview, bilingual rendering and template parity tests exist. |
| Publishing/public menu | Implemented | Immutable versions, publish/rollback/unpublish, stable slug routes, redirects and public no-login rendering exist. Hosted proof pending. |
| QR | Implemented | Stable SVG/PNG QR generation points at configured web origin and is covered by tests. Hosted native dependency proof pending. |
| Arabic/English | Implemented, acceptance pending | BCP-47 localization, translation validation and RTL rendering exist; deployed mobile accessibility review remains. |
| Team management | Implemented | Invitations, roles, location scope and member status exist. SMTP delivery and deployed escalation tests remain. |
| Platform staff | Implemented beyond Beta | Owner/manager/supervisor/support/sales policies and custom permissions exist; not required for core Beta. |
| Billing/offers | Safe Beta mode verified; commercial deferred | Plans, trials, limits, coupons and approvals exist. Disabled-mode bilingual UX and payment refusal pass the 68-check Beta browser suite. Live provider lifecycle is intentionally incomplete and excluded from Beta. |
| Support/analytics | Implemented locally | APIs and dashboards exist; production retention, workers and monitoring are not accepted. |
| Database roles/schema | Hosted staging verified | Restricted migrator/runtime roles, 15 migrations, 41 migrator-owned application tables and exact runtime grants are verified with certificate-checked TLS. No seed was applied. |
| CI/CD | Partial | Quality and controlled staging workflows exist. Provider account settings, hosted deploy evidence and rollback execution remain open. |

## Security findings

### Satisfactory controls

- Separate migration and runtime database identities; neither is superuser, role administrator, database creator, replication user or RLS bypasser.
- Exact-origin CSRF/CORS handling, secure production cookies, signed trusted-ingress identity, shared PostgreSQL rate limiting and bounded database pools.
- Argon2 password hashing, recoverable MFA, input DTO validation, safe image parsing, immutable publication snapshots and no committed secrets.
- Current production dependency audit reports zero known vulnerabilities.
- Browser tests validate a local `TEST_DATABASE_URL` before any seeding or server startup and propagate it to all processes. Existing servers are never reused, preventing accidental writes through an unrelated API.

### Open security and operational risks

1. The administrator database password was previously shared in chat and must be rotated after migration work without changing application credentials.
2. Staging SMTP and private object storage are not configured, blocking real verification/invitation and image acceptance.
3. Netlify-to-Render trusted client identity, direct API rejection, cookie/CORS behavior and cold-start recovery need hosted tests.
4. Runtime grants are tied to an exact 41-table allowlist. Every future schema migration must update and reverify this allowlist before the API can use a new table.
5. Hosted backup/restore, monitoring and alert ownership remain unexercised. Local recovery evidence and release/incident procedures are tracked in the production-readiness runbook.

## Database and migration assessment

- Migration names are chronological and map to the current schema: foundation, auth/RBAC, MFA/operations, menus/audit, publishing, billing/webhooks, analytics/support, staff and commercial offers.
- PostgreSQL-specific triggers, partial indexes and constraints passed a full disposable PostgreSQL 17 migration rehearsal.
- Hosted staging has all 15 migrations applied. It contains 41 application tables, 53 foreign keys and 107 indexes; all application tables are owned by `daify_migrator`.
- Runtime access is explicit for the reviewed table set. `daify_runtime` has no migration-history access, public function execution or schema-creation privilege; no schema ownership change or `GRANT ALL` shortcut was used.
- Hosted rollback is forward-fix first. Before customer data, the empty staging project may be recreated only through a separately reviewed destructive action. Once data exists, rollback requires compatible application rollback or verified backup restore.

## Complexity and deferral

The platform staff, offers, billing, support and analytics domains add surface area but are isolated enough to leave disabled without rewriting them. The fastest safe Beta path is to retain these modules, configure feature flags conservatively, and focus acceptance on the owner menu journey.

## External acceptance dependencies (deferred by owner)

1. Configure a private Supabase S3-compatible bucket or a reviewed equivalent.
2. Configure a verified SMTP sender; domain/account setup is deferred. Do not bypass account verification or use test transport in a public deployment.
3. Obtain/verify Render and Netlify account access and environment configuration, then deploy one reviewed commit.
4. Complete the bilingual deployed end-to-end journey and security smoke suite.

## 2026-10-18 continuation

Local checks now include 205 API tests, 75 sandbox browser checks, 68 Beta-mode
browser checks and 15 script tests. Release TLS/role/ACL checks stop on failure;
local managed-permission fixtures exercise excess grants and schema-default
leakage. See [deployment-preparation evidence](../QA/BETA_DEPLOYMENT_PREPARATION_2026-10-18.md).
No deployment or hosted database mutation occurred in this checkpoint.
