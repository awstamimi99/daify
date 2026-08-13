# DAIFY Roadmap

This is the master progress tracker. It answers: **where are we now, and where are we going?**

For *how the system is designed*, see [PRODUCTION_ARCHITECTURE.md](PRODUCTION_ARCHITECTURE.md). For a specific milestone's execution plan, open its file under [MILESTONES/](MILESTONES/). For a decision that should not be repeatedly reconsidered, check [DECISIONS/](DECISIONS/) before reopening the debate.

Status legend: `COMPLETE` · `IN PROGRESS` · `NEXT` · `NOT STARTED` · `BLOCKED`

## Milestone status

| # | Milestone | Status | One-line objective |
| --- | --- | --- | --- |
| M0 | Prototype Cleanup + Architecture Lock | **COMPLETE** | Clean up DAIFY branding, review the MenuFlow legacy, and lock production architecture decisions before writing production code. |
| M1 | Foundation — TypeScript / React / Next.js | **NEXT** | Stand up the production web foundation and migrate the design system, marketing shell, dashboard shell, and template-migration strategy onto it. |
| M2 | Core Backend — NestJS / PostgreSQL / Prisma | NOT STARTED | Stand up the API, database, and migrations that M1's frontend will eventually call. |
| M3 | Auth / Organizations / RBAC | NOT STARTED | Real accounts, sessions, organizations, membership, and server-enforced roles. |
| M4 | Menu Platform | NOT STARTED | Locations, menus, sections, items, and multilingual menu content as real backend resources. |
| M5 | Templates / Publishing / QR | NOT STARTED | Migrate the template engine, and build draft → preview → publish → version → rollback with stable public/QR routes. |
| M6 | Billing / Subscriptions | NOT STARTED | Plans, subscriptions, entitlements, checkout, and webhooks. |
| M7 | Analytics / Admin | NOT STARTED | Real analytics events, the platform-admin backend, audit logs, and support tooling. |
| M8 | Production / Deployment | NOT STARTED | Security review, CI/CD, staging, monitoring, and go-live. |
| M9 | Flutter App | NOT STARTED | Owner/Manager mobile client on top of the stabilized NestJS API. |

## Milestone gates

The table above owns status and objective. These compact gates record the other roadmap-level commitments; the linked milestone files own task detail.

| Milestone | Major deliverables | Dependencies | Definition of done |
| --- | --- | --- | --- |
| M0 | DAIFY cleanup, legacy inventory, architecture/decision baseline, recovery checkpoint | Existing prototype | Public identity is clean, legacy debt is classified, architecture is documented, and prototype QA passes. |
| M1 | Next.js/React/TypeScript app, project structure, design/marketing/dashboard foundations, template migration proof, CI/browser QA | M0 | New web foundation runs and builds; selected migrated surfaces meet parity/quality gates; owner understands the implemented boundaries. |
| M2 | NestJS API, PostgreSQL/Prisma, migrations, validation, OpenAPI, unit/API tests | M1 and data-model decision | Fresh database/API setup is repeatable and a tested vertical slice proves persistence and API conventions. |
| M3 | Identity, sessions, verification/reset, Organizations, memberships, RBAC | M2 and auth-provider decision | Auth lifecycle works and server tests prove tenant isolation, permission boundaries, and audit behavior. |
| M4 | Locations, menus, sections/items, prices/allergens/availability, images, translations, CRUD | M2–M3 and localization decision | Authorized users manage scoped multilingual menu data end to end with persistence and validation. |
| M5 | Typed templates, preview, immutable versions, publish/rollback/unpublish, public route, stable QR | M4 and publishing decision | Draft/public separation and version behavior are tested; supported templates render multilingual public menus without changing QR identity. |
| M6 | Plans, subscriptions, entitlements, limits, checkout, webhooks, invoices/failure/cancellation | M3–M5 and commercial/provider decisions | Verified idempotent billing events deterministically drive API-enforced entitlements and tested lifecycle transitions. |
| M7 | Event ingestion/aggregation, tenant/platform analytics, admin, audit, notifications/support | M3, M5, privacy/retention decisions | Analytics are accurate and tenant-scoped; every privileged platform action is authorized and audited. |
| M8 | CI/CD, environments, security, observability, rate limits, backups/restore, performance/accessibility/SEO | M1–M7 and infrastructure providers | Production-readiness and launch runbooks pass, including demonstrated rollback, restore, alerts, security, accessibility, and performance. |
| M9 | Flutter Owner/Manager client over shared API | Stable production API and M8 operations | Approved mobile journeys pass with secure storage, API-enforced role parity, RTL/accessibility, resilience, and release QA. |

## Current focus

**M1 — Foundation.** See [MILESTONES/M1_FOUNDATION.md](MILESTONES/M1_FOUNDATION.md) for the sub-phase breakdown (M1.1–M1.9) and for what to learn, what to build yourself, and what to build with Codex at each step.

M1 has not started yet. Implementation begins only when explicitly kicked off — see "Rules for this roadmap" below.

## Why M0 is marked complete

M0's deliverables were planning and cleanup, not production code, and all of them exist in the repository today:

- Branding cleanup: canonical URLs, Open Graph tags, `llms.txt`, `robots.txt`, and `sitemap.xml` all point at `daify.net` (previously `menuflow.app` in the crawler-facing files).
- Legacy `MenuFlow` review: documented in [PRODUCTION_ARCHITECTURE.md](PRODUCTION_ARCHITECTURE.md) under "Legacy prototype contract" — kept intentionally, not accidentally.
- Architecture decisions: [PRODUCTION_ARCHITECTURE.md](PRODUCTION_ARCHITECTURE.md) plus all five files under [DECISIONS/](DECISIONS/).
- Prototype preservation: the pre-cleanup state is tagged `pre-milestone-0-prototype`; production work proceeds on the `Milestone-1` branch.
- Data model, roles/permissions, draft/publish, localization, and QR/public-URL planning: each has an accepted decision document.
- Production stack selection: recorded in [DECISIONS/INFRASTRUCTURE.md](DECISIONS/INFRASTRUCTURE.md) and summarized in PRODUCTION_ARCHITECTURE.md.

See [MILESTONES/M0_PRE_MILESTONE.md](MILESTONES/M0_PRE_MILESTONE.md) for the full account, including what was intentionally deferred rather than finished.

## Rules for this roadmap

1. `docs/ROADMAP.md` (this file) is the master progress tracker — if it disagrees with a milestone file, this file is stale and should be corrected first.
2. `docs/PRODUCTION_ARCHITECTURE.md` is the main architecture reference.
3. The milestone marked **NEXT** or **IN PROGRESS** is the active execution plan; do not start a later milestone early unless it is a hard dependency.
4. `docs/DECISIONS/` stores decisions that should not be repeatedly reconsidered without a documented reason.
5. When a task completes, update its milestone file. When a milestone completes, update this file.
6. Architecture decisions are not changed silently — if implementation forces a change, document the reason in the relevant `DECISIONS/` file first.
7. Keep this document aligned with the actual repository. A status here is only as good as the last person who verified it against real commits, branches, and files — not against intent.
