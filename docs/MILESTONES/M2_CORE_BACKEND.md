# Milestone 2 — Core Backend: NestJS / PostgreSQL / Prisma

## Status

NOT STARTED. Detailed task breakdown will be written when M1 is complete and this milestone is about to start — this file currently holds enough scope to understand the roadmap, not an execution plan.

## Goal

Stand up the NestJS API, PostgreSQL database, and Prisma schema that M1's frontend will eventually call, and that M3/M4 will build real features on top of.

## Why this milestone exists

`PRODUCTION_ARCHITECTURE.md` is explicit: the web application must never be trusted to enforce access on its own, and PostgreSQL — not `localStorage` — must become the source of truth. M2 is where that boundary becomes real infrastructure instead of a documented intention.

## What I need to learn

Node.js backend fundamentals (if not already comfortable), NestJS's module/controller/service/provider structure, relational schema design with Prisma, database migrations, and request validation. This is the first milestone with a real database, so understanding how a migration works — and how to not lose data with one — matters before M3/M4 start writing real user data into it.

## What we will build

- A NestJS application implementing the `api` boundary from `PRODUCTION_ARCHITECTURE.md`.
- A Prisma schema translating [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md) into real tables, starting with the entities M3/M4 need first (`User`, `Organization`, `OrganizationMember`, `Location`, `Menu`) rather than the full entity list at once.
- Migrations, request validation, and a documented API contract.
- No production authentication, billing, or public menu serving yet — those are M3, M6, and M5/M4 respectively.

## Technical scope

- NestJS, TypeScript, PostgreSQL, Prisma.
- REST API (per the locked stack; GraphQL was not selected).
- Input validation at the API boundary, consistent with the security baseline in `PRODUCTION_ARCHITECTURE.md`.
- API documentation (OpenAPI/Swagger or equivalent) so M1's frontend work and later milestones have a real contract to build against instead of guessing at shapes.
- Local development database setup; production PostgreSQL hosting choice remains deferred per [DECISIONS/INFRASTRUCTURE.md](../DECISIONS/INFRASTRUCTURE.md).

## Tasks

Detailed task breakdown deferred until M1 is complete and this milestone starts. At minimum it will need to cover: NestJS project scaffolding, Prisma schema for the first entity slice, migration tooling, a health-check/first real endpoint, and validation middleware.

## Deliverables

- A running NestJS API with a database it owns.
- A Prisma schema for the initial entity slice, matching `DATA_MODEL.md`'s ownership rules (tenant scope derived from parent chain, never trusted from client input).
- API documentation covering whatever endpoints exist at the end of this milestone.

## Acceptance Criteria

- The API runs locally against a real PostgreSQL database with applied migrations.
- Every query enforces tenant scope in the database predicate, per the invariant already locked in `DATA_MODEL.md` — not filtered after a global fetch.
- No secrets or authorization source of truth live in the frontend.

## Tests

Unit tests for service-layer logic; API/integration tests against a real (test) database rather than mocks, consistent with this project's stated testing direction. Specific coverage targets to be defined at milestone start.

## Dependencies

- M1 (a frontend must exist to eventually consume this API, and the domain types from M1.1 inform the Prisma schema).
- Uses [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md) and [DECISIONS/INFRASTRUCTURE.md](../DECISIONS/INFRASTRUCTURE.md) as locked inputs.

## Risks / Notes

- Building the full entity list from `DATA_MODEL.md` at once is unnecessary and risky; slice by what M3/M4 actually need first.
- Backend hosting provider and managed PostgreSQL vendor are still deferred decisions (see `INFRASTRUCTURE.md`) — local development should not be blocked on resolving them.

## Completion Checklist

Not applicable yet — a real checklist will be written from the detailed task breakdown when this milestone starts.
