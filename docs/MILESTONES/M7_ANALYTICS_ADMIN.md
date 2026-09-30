# Milestone 7 — Analytics / Admin

## Status

IN PROGRESS — explicit owner kickoff “go” on 2026-09-29. Branch:
`feat/m7-analytics-admin`, based on `ffce2e9`. The owner deferred M6's
account setup and external payment verification to M8 before launch. M7 may
proceed from the verified local billing checkpoint (`5a931fc`) while those
acceptance steps remain open.

The analytics/operator checkpoint is committed as `aec724c`. The continuation
adds admin sandbox plan/subscription/template workflows, organization-scoped
support conversations and private in-app notifications. All 162 API tests and the
three focused browser journeys passed, along with all 71 web regression tests
and 17 prototype tests. Production privacy acceptance remains open; see [the verification record](../QA/M7_2026-09-29.md)
and [operator handoff](../QA/M7_OPERATIONS.md).

## Goal

Replace the prototype's simulated analytics and platform-admin data with real analytics events and a real platform-admin backend, including audit logs, notifications, and support tooling.

## Why this milestone exists

The prototype already demonstrates the *shape* of both surfaces convincingly: restaurant-facing analytics in the dashboard, and a full 13-page platform-admin console (restaurants, users, subscriptions, plans, templates, analytics, support, security, audit logs). Neither is backed by real data yet. This milestone is where analytics ingestion becomes real, and where the admin console stops reading prototype seed data and starts operating on the live platform.

## What I need to learn

Append-only event design (why analytics events are never updated, only aggregated), the aggregation-worker pattern (raw events in, query-friendly rollups out), and the specific reason platform-admin authorization is a separate namespace from tenant permissions — already decided in [DECISIONS/AUTH_RBAC.md](../DECISIONS/AUTH_RBAC.md).

## What we will build

- Analytics event ingestion: menu views, QR scans/redirects, language changes, section views, item interactions.
- Aggregation jobs producing the restaurant-facing analytics dashboard's actual data.
- Platform-admin backend for restaurants/organizations, users, subscriptions, plans, and templates — the real data behind the prototype's `admin/` pages.
- Audit log storage and a real audit-log viewer, replacing the prototype's seeded example entries.
- Notifications and basic support tooling.

## Technical scope

- Builds on `AnalyticsEvent` and `AuditLog` from [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md).
- Ingestion is append-only and fast; aggregation happens asynchronously via the Redis/BullMQ queue infrastructure from `DECISIONS/INFRASTRUCTURE.md`.
- Platform Admin access requires the stronger authentication and audit trail already specified in `AUTH_RBAC.md` — this milestone implements that requirement, it doesn't redecide it.
- Privacy, consent, bot filtering, and retention policy for analytics are named as pre-launch legal/product decisions in `PRODUCTION_ARCHITECTURE.md` — they need resolving during this milestone's planning, not deferred indefinitely.

## Tasks

1. Replace the admin placeholder with bilingual, responsive organization/user
   directories and an audit viewer. Use bounded pagination and explicit support
   reasons; require AAL2 and platform authorization on every API request.
2. Add reversible organization suspension and user disable/restore operations,
   transactional audit records and session revocation. Preserve content and
   prevent self-lockout or ordinary tenant access to operator actions.
3. Define anonymous analytics events, bot/preview exclusion and retention.
   Persist tenant/location/menu/version attribution from server-owned records;
   never trust client-supplied ownership. Keep production collection disabled
   pending privacy review.
4. Add idempotent asynchronous aggregation with Redis/BullMQ, bounded retention
   cleanup and scoped reports over daily totals. Preserve existing public/QR
   links; distinguish future QR redirect counts from general menu views.
5. Implement bilingual tenant analytics and complete the admin subscription,
   plan/template, support and notification surfaces using existing application
   services and audited authorization.
6. Extend OpenAPI and verify tenant/location isolation, privilege boundaries,
   audit atomicity, aggregation/replay correctness, browser journeys and Arabic
   mobile accessibility. Record local acceptance separately from M8 operations.

## Deliverables

- Real analytics ingestion and aggregation feeding the restaurant dashboard.
- Platform-admin CRUD for organizations, users, subscriptions, and plans, replacing prototype seed data.
- A real, append-only audit log with a working viewer.
- Basic notification and support-ticket flows.

## Acceptance Criteria

- Analytics dashboards query pre-aggregated data, not raw events, and tenant/location/menu scope is enforced in the query, not just the UI.
- Platform Admin actions that touch tenant data produce audit log entries with actor, action, target, and request correlation.
- Bot and known preview/editor traffic is filtered from analytics so restaurant owners aren't shown inflated numbers.
- Raw analytics event access is more restricted than aggregate access, per the rule already locked in `PRODUCTION_ARCHITECTURE.md`.

## Tests

Aggregation correctness tests (known event set in, expected rollup out); scope-enforcement tests for analytics queries; audit-log completeness tests for the specific actions `PRODUCTION_ARCHITECTURE.md` requires logging (sign-in, role/scope changes, publish/rollback, subscription changes, support access, suspensions).

## Dependencies

- M6's verified local billing foundation, since billing and published menus give
  analytics and admin something real to operate on. Account-dependent M6
  acceptance is deferred to M8 by the owner's 2026-09-29 sequencing exception.
- Uses [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md) and [DECISIONS/AUTH_RBAC.md](../DECISIONS/AUTH_RBAC.md) as locked inputs.

## Implemented workflow boundaries

Organization/user controls provide reasoned directories and reversible status
changes. Account provisioning, verification and platform promotion keep their
existing protected flows. Billing uses immutable sandbox plan versions and
expiring entitlements; provider payment state stays authoritative. Templates
remain version-controlled renderers with plan/override access controls, not
editable executable code in the operator interface. Support notifications are
in-app and private to the ticket creator. These boundaries preserve saved
content, payment history and the existing authentication model.

## Risks / Notes

- Analytics privacy/consent/retention policy is a legal decision, not just an engineering one — do not ship collection before it's resolved.
- The platform-admin surface is large (13 pages in the prototype); sequence which admin capabilities are real first based on what actually blocks operating the platform, not by prototype page order.

## Completion Checklist

- [x] Explicit kickoff, branch and execution sequence recorded.
- [x] Authenticated organization/user directories and append-only audit viewer.
- [x] Audited suspension/restore and account disable/session revocation.
- [ ] Production privacy and retention approval (local defaults recorded; production collection disabled).
- [x] Attributed event ingestion and bot/preview filtering.
- [x] Idempotent Redis/BullMQ aggregation, replay and retention cleanup.
- [x] Tenant/location-scoped reports and bilingual analytics dashboard.
- [x] Admin billing/template, support and notification workflows.
- [x] Local API/browser/accessibility regression and operational handoff.
