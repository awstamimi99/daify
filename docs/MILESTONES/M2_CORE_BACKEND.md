# Milestone 2 — Core Backend: NestJS / PostgreSQL / Prisma

## Status

**COMPLETE — independent audit remediation verified.** Implemented and locally verified on 2026-08-13; the independent technical audit was reviewed and its one MEDIUM finding was fixed and re-tested. M2 began through an explicit owner kickoff while M1 still had independent-review gates; that exception is recorded in the roadmap rather than silently marking M1 complete.

## Goal and boundary

M2 establishes DAIFY's production API and relational persistence boundary. It does not implement authentication, billing, analytics, public publishing, or tenant CRUD endpoints. Those remain owned by later milestones.

The only HTTP domain slice exposed in M2 is health/readiness. Tenant data stays behind application repositories until M3 can supply verified identity and authorization context. This avoids publishing an unauthenticated resource API that later has to be removed.

## Architecture delivered

```text
apps/api
├── src
│   ├── common/          validated config, problem-details errors, request IDs/logging
│   ├── database/        global Prisma integration
│   ├── docs/            versioned OpenAPI 3.1 contract
│   ├── health/          controller → service → repository vertical slice
│   └── menus/           tenant-scoped repository pattern (not exposed over HTTP)
├── prisma
│   ├── schema.prisma
│   ├── migrations/      checked-in initial PostgreSQL migration
│   └── seed.ts          guarded, idempotent development seed
└── test/                API integration tests against real PostgreSQL
```

- NestJS 11 modular monolith under the existing npm workspace.
- Strict TypeScript extending `@daify/config`, with Nest build and standalone typecheck.
- `@nestjs/config` plus Joi startup validation for runtime environment, port, log level, PostgreSQL URL, and guarded seeding.
- Prisma ORM 7 using the PostgreSQL `pg` driver adapter and lifecycle-managed disconnect.
- URI API versioning and global prefix: `/api/v1/...`.
- Global `ValidationPipe`: transforms DTOs, rejects unknown fields, and hides input values from validation metadata.
- Global exception filter using `application/problem+json`; unexpected exceptions do not leak internal details.
- Structured JSON Nest logs, request completion events, response/request correlation via `x-request-id`, and shutdown hooks.
- Client correlation IDs are accepted only when they are UUID/ULID-shaped; malformed values are replaced with a server-generated UUID before entering response headers or logs.
- OpenAPI 3.1 contract at `/api/docs/openapi.json`. A bundled Swagger UI was intentionally not retained because the current stable Nest Swagger package introduced an active high-severity YAML parser advisory; the machine-readable contract is complete and the dependency audit is clean.
- Controller → service → repository boundaries demonstrated by the health slice. Menu repository queries include tenant ownership in the database predicate.

## Final relational schema

Core models:

- `User`: global identity/profile and lifecycle state; unique email.
- `Organization`: tenant boundary with locale, timezone, brand JSON, status, and archival timestamp.
- `OrganizationMember`: unique User↔Organization membership, role/status, invitation lifecycle, and all-location scope flag.
- `Location`: belongs to exactly one Organization; organization-scoped slug, currency, locale/timezone, contact/address JSON, lifecycle state.
- `Menu`: belongs to a Location; location-scoped slug, language configuration, draft revision, lifecycle state.
- `MenuSection`: stable key and ordering under one Menu, visibility/schedule and soft-archive fields.
- `MenuItem`: stable key/order under one section, precise decimal price/currency, availability, dietary/allergen arrays, metadata and soft-archive fields.
- `Theme`: one-to-one with Menu; stable template key, schema version, validated-token/layout JSON containers.

Supporting relation:

- `OrganizationMemberLocation`: explicit per-location grants. Its composite foreign keys include `organizationId` on both sides, so PostgreSQL itself rejects cross-tenant membership/location links.

Ownership chain is normalized as Organization → Location → Menu → MenuSection → MenuItem. Child organization ownership is derived through that chain and is never accepted as duplicated child input. Parent deletion is restricted for domain records; explicit scope links cascade only when their parent membership/location is intentionally removed.

Localization values remain deferred to M4's translation rows, per the accepted localization decision. M2 stores only default/supported language tags and structured non-translated values.

## API contract

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Liveness; does not require the database by default. |
| `GET` | `/api/v1/health?database=true` | Readiness query executing `SELECT 1` through Prisma/PostgreSQL. |
| `GET` | `/api/docs/openapi.json` | OpenAPI 3.1 contract, version-neutral documentation route. |

Invalid DTO values return HTTP 400 problem details. Database readiness failure returns HTTP 503 problem details. Both include request correlation.

## Local workflow

1. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`.
2. Start PostgreSQL with `npm run db:up` (Docker Compose) or `npm run db:dev --workspace @daify/api` (Prisma Local Postgres).
3. Apply migrations with `npm run db:migrate`.
4. Start the API with `npm run dev:api`.
5. Seed only when desired: set `ALLOW_DEV_SEED=true`, then run `npm run db:seed`. The seed refuses production and is idempotent.

Integration tests are intentionally destructive only inside their dedicated database. They require both `NODE_ENV=test` and an explicit `TEST_DATABASE_URL` whose database name contains a standalone `test` marker. They never fall back to `DATABASE_URL`; the guard runs through Jest `setupFiles` before the Nest application or Prisma service is imported.

Production migration workflow uses `npm run prisma:migrate:deploy --workspace @daify/api`; migration files are generated/reviewed in development and committed. Production startup must not generate migrations.

## Verification evidence

All M2 gates passed locally on 2026-08-13:

- API lint: pass, zero warnings.
- API strict TypeScript: pass.
- Prisma schema validation and formatting: pass.
- Fresh real PostgreSQL migration deploy: pass; one migration applied.
- Migration status: pass; database schema up to date.
- Tests after audit remediation: **20/20 pass** across 5 suites (4 unit, 1 real-PostgreSQL integration).
- API production build: pass.
- Built `dist/main.js` smoke test: pass for liveness and OpenAPI contract.
- Guarded idempotent development seed: pass.
- `npm audit`: **0 vulnerabilities**.
- Full monorepo lint, typecheck, and production build: pass.
- Full monorepo tests after audit remediation: **55/55 pass** — 17 preserved-prototype Playwright, 18 production-web Playwright, and 20 API unit/integration tests.

Integration coverage verifies versioned health, real PostgreSQL readiness, DTO rejection/problem details, OpenAPI availability, and that Organization B cannot retrieve Organization A's menu through the repository predicate.

## Independent audit disposition

- **Confirmed and fixed — MEDIUM:** integration setup previously called table-wide `deleteMany()` operations without a database safety guard. Tests now fail before application import unless an explicit, clearly named test database is supplied. Unit tests cover wrong environment, missing `TEST_DATABASE_URL`, unsafe database names, and the safe promotion into runtime `DATABASE_URL`. A deliberate unsafe invocation was also executed and confirmed to exit before database access.
- **Accepted hardening — LOW:** client-provided request IDs were only length checked. They now require UUID or ULID format; malformed input receives a generated UUID. Unit and integration coverage were added.
- **Confirmed but intentionally retained — LOW:** OpenAPI remains hand-maintained for the single M2 endpoint. This avoids the audited vulnerable Swagger dependency; M3 must reassess generation before route growth makes drift material.
- **Not a repository defect:** the auditor could not reproduce real-PostgreSQL tests because their sandbox lacked a usable database. This workspace did reproduce migration deploy/status and the complete integration suite against Prisma Local PostgreSQL both before and after remediation. CI also provisions PostgreSQL 17 and runs migrations/tests.

## Acceptance checklist

- [x] NestJS application and strict TypeScript foundation.
- [x] Validated production configuration and environment failure-fast behavior.
- [x] PostgreSQL/Prisma integration with an applied, checked-in migration.
- [x] Foundational tenant schema for all eight requested core entities.
- [x] Database-level cross-tenant protection for explicit location scopes.
- [x] Health/readiness endpoint and URI versioning.
- [x] DTO validation and consistent global error contract.
- [x] Structured logs and request correlation.
- [x] OpenAPI 3.1 API contract.
- [x] Repository/service boundaries with no controller business logic.
- [x] Safe development seed strategy.
- [x] Unit and real-database integration infrastructure.
- [x] Lint, typecheck, tests, Prisma validation, migration validation, and production build passing.

## Intentionally deferred

- Authentication, sessions, Organization CRUD, RBAC policy enforcement, and protected HTTP resources: M3.
- Menu/location CRUD and translation rows: M4.
- Immutable publication versions, public routes, templates/QR: M5.
- Billing: M6. Analytics/audit implementation: M7.
- Managed PostgreSQL/backend provider and production observability vendor: infrastructure decision remains deferred.

## Review status

M2 is ready for independent technical review. Do not start M3 automatically.
