# Infrastructure Decision

Status: Direction accepted; free staging providers selected subject to deployment validation; production providers partially deferred
Decision date: 2026-08-13
Implementation milestones: M1, M2, M8

## Planned platform

| Concern | Decision |
| --- | --- |
| Source control and review | GitHub |
| Web application | Next.js, React, TypeScript |
| Frontend hosting | Netlify Free for M8 staging; Vercel remains a production option |
| API | NestJS, TypeScript; modular monolith initially |
| Database | Managed PostgreSQL with Prisma |
| Cache and queues | Redis and BullMQ |
| Object storage | Cloudflare R2 or equivalent S3-compatible service |
| Edge, DNS, CDN | Cloudflare |
| Error monitoring | Sentry |
| Browser tests | Playwright |
| Other tests | Unit and API/integration suites |
| Delivery | GitHub-based CI/CD with preview, staging, and production environments |
| Later client | Flutter consuming the same NestJS API |

The exact backend runtime host, managed PostgreSQL vendor/region, Redis vendor, and billing/auth providers are not locked yet.

## M8 budget decision — 2026-09-30

The owner specified a $0 monthly hosting budget. Use the
[free staging decision](HOSTING_M8.md) for the initial external demo. This
explicitly replaces Vercel for staging and selects Render plus Supabase, subject
to the listed compatibility and account checks. Production launch, always-on
workers and production region/backup commitments remain unresolved. No service
has been provisioned.

## Boundaries

- `web`: marketing, authenticated UI, server-rendered public menus.
- `api`: business rules, authentication integration, authorization, persistence, billing orchestration, analytics queries, and audit logging.
- `worker`: image processing, analytics aggregation, notifications, cleanup, and later scheduled publishing.
- PostgreSQL is authoritative. Redis contains disposable coordination/cache state.
- Object storage contains media bytes; PostgreSQL stores ownership, object keys, metadata, and processing status.

The production target is a modular monolith and one worker deployment. Current
notification, billing and analytics workers run inside the API; the free staging
demo retains that arrangement with billing and analytics disabled. A separate
always-on worker remains a production decision. Do not introduce microservices
without demonstrated scaling or ownership pressure.

## Media pipeline

```text
Browser → signed upload → R2 original → validation/processing job
                                      → AVIF/WebP/responsive variants → CDN
```

Validate MIME signature, dimensions, and size; strip metadata; correct orientation; create thumbnails and responsive variants; use immutable keys; and clean failed/orphaned files through idempotent jobs.

### M4 media implementation — 2026-09-12

For the initial draft editor, upload small bounded images through the authorized
JSON API, validate declared MIME against decoded JPEG/PNG/WebP content, enforce
byte/pixel limits, and re-encode to strip metadata before storing. This avoids
registering the currently flagged multipart parser. Immutable object keys and
private authenticated retrieval precede the M5 public media/CDN path. Local
filesystem storage is restricted to development/test; production requires an
explicitly configured S3-compatible object store. Provider setup, signed direct
uploads, responsive variants and delayed orphan cleanup remain operational/later
pipeline work. No object store is purchased or configured by this decision.

## Cache and queues

- Cache public menus by host, slug, locale, and published version.
- Commit publication in PostgreSQL before emitting an outbox event for invalidation/warming.
- Give every BullMQ job an idempotency key, retry policy, bounded attempts, logs, metrics, and safe replay procedure.
- Separate image, analytics, notification, scheduled-publish, and cleanup queues.

## Environments and delivery

- Isolated development, preview, staging, and production configuration and credentials.
- CI runs formatting/static checks, unit/API tests, and appropriate Playwright coverage before deployment.
- Migrations are reviewed, backed up, observable, and applied through a controlled deployment step.
- Production requires security headers, rate limiting, monitoring, structured logs, alerting, backups, and tested restoration.

## Deferred provider decisions

- Backend/worker hosting provider and regions.
- Managed PostgreSQL and Redis providers, region, backup/restore targets, and data residency.
- Sentry plan, alert routing, and source-map policy.
- R2 versus another compatible object store and image transformation vendor.
- CI/CD promotion and rollback mechanics.

These decisions must be recorded before the corresponding production infrastructure is purchased or implemented.

## Related references

- [Production architecture](../PRODUCTION_ARCHITECTURE.md)
- [M8 execution plan](../MILESTONES/M8_PRODUCTION.md)
