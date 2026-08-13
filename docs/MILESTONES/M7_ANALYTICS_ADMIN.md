# Milestone 7 — Analytics / Admin

## Status

NOT STARTED. Detailed task breakdown will be written when M6 is complete and this milestone is about to start.

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

Detailed task breakdown deferred until M6 is complete and this milestone starts.

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

- M6, since a fuller product surface (billing, published menus) gives analytics and admin something real to operate on.
- Uses [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md) and [DECISIONS/AUTH_RBAC.md](../DECISIONS/AUTH_RBAC.md) as locked inputs.

## Risks / Notes

- Analytics privacy/consent/retention policy is a legal decision, not just an engineering one — do not ship collection before it's resolved.
- The platform-admin surface is large (13 pages in the prototype); sequence which admin capabilities are real first based on what actually blocks operating the platform, not by prototype page order.

## Completion Checklist

Not applicable yet — a real checklist will be written from the detailed task breakdown when this milestone starts.
