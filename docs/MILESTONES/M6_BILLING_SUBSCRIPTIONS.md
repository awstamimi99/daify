# Milestone 6 — Billing / Subscriptions

## Status

NOT STARTED. Detailed task breakdown will be written when M5 is complete and this milestone is about to start.

## Goal

Replace the prototype's static pricing page with real Plans, Subscriptions, Entitlements, checkout, and payment-provider webhook handling.

## Why this milestone exists

The prototype's pricing page and billing dashboard page are illustrative only — there is no real payment provider, no real entitlement enforcement, and no real subscription state. `PRODUCTION_ARCHITECTURE.md`'s billing section is explicit that the provider is the source of payment truth and DAIFY's database is the access-decision source *after* verified webhook processing — that relationship doesn't exist yet and is what this milestone builds.

## What I need to learn

Webhook-driven state (as opposed to polling a payment provider), idempotency (why the same webhook arriving twice must not double-charge or double-grant access), and the difference between a Plan (what's sold) and an Entitlement (what a specific Organization is currently allowed to do) — they are deliberately separate concepts in [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md).

## What we will build

- Plan definitions (replacing the prototype's static Starter/Pro/Business copy with real, platform-admin-managed records).
- Subscription creation via checkout, tied to an Organization.
- Entitlement evaluation, enforced in the API (not just hidden in the UI) for limits like location count, menu count, member count, and template access.
- Idempotent webhook handling for subscription state changes.
- Cancellation, grace period, downgrade, and failed-payment flows as explicit state transitions.

## Technical scope

- Payment provider is not yet selected — `PRODUCTION_ARCHITECTURE.md` names this an explicit blocker to resolve before this milestone's implementation, not before its planning.
- Builds on the Organization/Subscription/Plan/Entitlement entities already scoped in `DATA_MODEL.md`.
- Entitlement checks must live in API commands, consistent with the rule already locked in `PRODUCTION_ARCHITECTURE.md`: "hiding UI controls is insufficient."
- All plan overrides and billing-affecting admin actions must produce `AuditLog` entries, per the same document.

## Tasks

Detailed task breakdown deferred until M5 is complete and this milestone starts.

## Deliverables

- Working checkout flow creating a real Subscription.
- Entitlement enforcement blocking (not just hiding) actions beyond an Organization's current plan.
- Idempotent webhook handlers for the chosen payment provider.
- Cancellation, grace period, and downgrade flows that do not destroy customer data.

## Acceptance Criteria

- The same webhook delivered twice does not double-apply its effect.
- An Organization at its plan's location/menu/member limit is blocked by the API when attempting to exceed it, even if a client bypasses the UI warning.
- Cancelling a subscription does not immediately delete the Organization's menus or content.
- Every billing-affecting admin action (plan override, manual entitlement grant) produces an audit log entry.

## Tests

Webhook idempotency tests (same event delivered twice, once, out of order where applicable); entitlement-boundary tests for each limited resource; state-transition tests for cancellation/grace-period/downgrade/restoration.

## Dependencies

- M5 is not a strict technical dependency, but billing without a finished product (real menus, real publishing) has nothing meaningful to sell — sequenced after Menu Platform and Publishing by design.
- Uses [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md) for the Plan/Subscription/Entitlement shape.

## Risks / Notes

- Final payment provider, pricing, tax handling, invoicing regions, and refund policy are all still open per `PRODUCTION_ARCHITECTURE.md` — these are product/legal decisions, not engineering defaults, and should be resolved and documented (likely as a new decision record) before this milestone's implementation begins.
- Do not let entitlement enforcement become UI-only under deadline pressure — that defeats the entire point of this milestone.

## Completion Checklist

Not applicable yet — a real checklist will be written from the detailed task breakdown when this milestone starts.
