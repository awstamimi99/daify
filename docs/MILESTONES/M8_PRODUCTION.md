# Milestone 8 — Production / Deployment

## Status

NOT STARTED. Detailed task breakdown will be written when M7 is complete and this milestone is about to start.

## Goal

Take DAIFY from a working system in development to a secure, monitored, production-deployed service.

## Why this milestone exists

Every prior milestone builds product functionality. None of them, by design, resolve hosting providers, CI/CD, monitoring, or a security review — those are explicitly deferred in [DECISIONS/INFRASTRUCTURE.md](../DECISIONS/INFRASTRUCTURE.md) and `PRODUCTION_ARCHITECTURE.md`'s "Deferred until their milestone" list. M8 is where they get resolved and implemented, right before go-live.

## What I need to learn

CI/CD pipeline design, the difference between staging and production environments, what a real security review actually checks for a multi-tenant SaaS product, and production-grade observability (structured logging, error monitoring, alerting) as opposed to console.log debugging.

## What we will build

- CI/CD: automated testing (including the Playwright suite finally running on every push, a gap that has existed since the original prototype), build, and deployment pipeline with staging and production environments.
- Security review across the whole stack — this is the point to systematically re-verify every rule already written into `PRODUCTION_ARCHITECTURE.md`'s "Security baseline," not just trust that earlier milestones followed them.
- Monitoring, structured logging, and alerting (Sentry per `DECISIONS/INFRASTRUCTURE.md`, plus metrics/logs).
- Backups and a tested restore procedure for PostgreSQL.
- Rate limiting on the endpoints already identified as sensitive (auth, uploads, public analytics ingestion, invitations).
- Performance pass, including finally addressing the prototype-era image weight problem (~36MB of uncompressed PNG/JPG, documented in `PRODUCTION_ARCHITECTURE.md`'s media section) with real responsive/optimized delivery.
- Accessibility review.
- Production SEO: verifying the migrated Next.js metadata, sitemap, and robots configuration actually match what M0 already fixed once for the prototype (correct domain, complete page coverage) — don't let it regress during migration.

## Technical scope

- Resolves the deferred provider decisions from `DECISIONS/INFRASTRUCTURE.md`: backend/worker hosting, managed PostgreSQL and Redis vendors, region, and backup targets.
- Implements the full security baseline from `PRODUCTION_ARCHITECTURE.md`: verified identity, CSRF protection, MFA/step-up, tenant-scoped predicates, rate limits, strict media validation, CSP/security headers, environment isolation, secret rotation, encryption, tested backups, and incident response.
- Docker (or the eventual chosen containerization/deploy mechanism) for the API/worker, consistent with the hosting decision made here.

## Tasks

Detailed task breakdown deferred until M7 is complete and this milestone starts.

## Deliverables

- CI/CD pipeline running tests and deploying to staging and production automatically.
- A completed security review with findings resolved or explicitly accepted and documented.
- Monitoring/alerting in place before go-live, not after.
- A tested backup/restore procedure.
- Production performance and accessibility pass.

## Acceptance Criteria

- Every push to the main integration branch runs the full test suite (Playwright plus M2+'s unit/API tests) before it can deploy.
- A documented incident-response process exists.
- A backup restore has actually been tested, not just configured.
- Rate limits are verified to actually trigger under load on the endpoints named in `PRODUCTION_ARCHITECTURE.md`.
- Core Web Vitals / LCP on the public menu route are measured, not assumed, especially given the prototype's known unoptimized-image history.

## Tests

CI pipeline correctness (does a failing test actually block deployment); load/rate-limit tests on sensitive endpoints; a real disaster-recovery drill (restore from backup end to end); accessibility audit against the pages migrated in M1/M5.

## Dependencies

- M7 — production deployment of an incomplete product isn't the goal; this milestone assumes the product surface from M1–M7 is functionally complete.
- Resolves the provider decisions deferred throughout `DECISIONS/INFRASTRUCTURE.md`.

## Risks / Notes

- This is the milestone most likely to get compressed under launch pressure — treat the security review and backup-restore test as non-negotiable regardless of timeline.
- Image/performance debt has existed since the original prototype (documented back in the pre-M0 audit); it's tempting to defer again — this is the last milestone before production where that's acceptable.

## Completion Checklist

Not applicable yet — a real checklist will be written from the detailed task breakdown when this milestone starts.
