# Milestone 6 — Billing / Subscriptions

## Status

**IN PROGRESS — sandbox implementation.** Explicit owner kickoff on 2026-09-14: “go”, after
the M5 handoff. Branch: `feat/m6-billing`, based on `8c4ff43`.
The owner subsequently approved development with MyFatoorah's public test key
without a merchant account. Persisted sandbox billing, API-enforced limits,
manual checkout/reconciliation and the bilingual billing workspace are implemented.
The 2026-09-21 continuation completed local verification of the signed Webhook V2
payment inbox, replay handling and background retries; see
[webhook verification](../QA/M6_WEBHOOKS_2026-09-21.md).
The 2026-09-29 checkpoint review repeated all 136 API tests, build/lint/typecheck,
schema validation and fresh-database migrations successfully. The owner confirmed
that no project-owned sandbox account exists yet and requested completion of the
local checkpoint; external payment/webhook acceptance remains pending.
Live provider/commercial decisions and account-specific webhook/automatic-renewal
acceptance remain open. See [the billing decision](../DECISIONS/BILLING.md) and
[verification/runbook](../QA/M6_2026-09-14.md).

## Goal

Replace the prototype's static pricing page with real Plans, Subscriptions, Entitlements, checkout, and payment-provider webhook handling.

## Why this milestone exists

At kickoff, the prototype's pricing and billing pages were illustrative, with no provider integration, entitlement enforcement or subscription state. The sandbox checkpoint now implements these foundations using verified provider status queries. `PRODUCTION_ARCHITECTURE.md` also requires verified webhook processing for the complete payment lifecycle. Sandbox payment notifications now pass local verification; actual account delivery, refunds, disputes and recurring-payment acceptance remain open.

## What I need to learn

Webhook-driven state (as opposed to polling a payment provider), idempotency (why the same webhook arriving twice must not double-charge or double-grant access), and the difference between a Plan (what's sold) and an Entitlement (what a specific Organization is currently allowed to do) — they are deliberately separate concepts in [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md).

## What we will build

- Plan definitions (replacing the prototype's static Starter/Pro/Business copy with real, platform-admin-managed records).
- Subscription creation via checkout, tied to an Organization.
- Entitlement evaluation, enforced in the API (not just hidden in the UI) for limits like location count, menu count, member count, and template access.
- Idempotent webhook handling for subscription state changes.
- Cancellation, grace period, downgrade, and failed-payment flows as explicit state transitions.

## Technical scope

- MyFatoorah is selected for sandbox exploration only. The owner's explicit
  sandbox authorization supersedes the earlier prerequisite for this scope;
  final provider/commercial approval remains required for live billing.
- Builds on the Organization/Subscription/Plan/Entitlement entities already scoped in `DATA_MODEL.md`.
- Entitlement checks must live in API commands, consistent with the rule already locked in `PRODUCTION_ARCHITECTURE.md`: "hiding UI controls is insufficient."
- All plan overrides and billing-affecting admin actions must produce `AuditLog` entries, per the same document.

## Tasks

1. Confirm merchant country, provider/account eligibility, recurring-payment
   capability, currency, prices, resource limits and subscription policies.
   Record accepted choices in `DECISIONS/BILLING.md` before live implementation;
   the explicit sandbox exception and test policies are already recorded there.
2. Add additive Plan/price-version, Subscription, Entitlement, checkout-operation
   and verified-event persistence. Preserve historical plan meaning and isolate
   test/live provider identities. Document how existing workspaces transition.
3. Implement typed entitlement evaluation with explicit effective dates and
   audited overrides. Check resource usage under the existing organization lock
   in the same transaction as creation/reactivation/publication.
4. Build authenticated checkout and cancellation commands, with scoped permission
   and sensitive-action assurance checks. Persist idempotency before provider
   requests; recover ambiguous provider timeouts without creating a second charge.
5. Implement the selected provider's exact webhook verification and durable
   inbox/processor. Bind the event to the server-created checkout/subscription;
   atomically persist subscription, entitlements and audit effects. Verify
   duplicate, conflicting, late and reordered delivery behavior.
6. Implement the accepted grace, cancellation, expiry, downgrade, refund and
   restoration policies. Preserve content and QR reservations. Reconcile missed
   events and time-based expiry without requiring a customer request.
7. Replace illustrative pricing with active database plans, add the owner billing
   workspace, usage/limit messages and payment recovery. Add the narrowly scoped
   platform-admin plan/override commands required by M6, with AAL2 and audit.
8. Extend OpenAPI, test fixtures, migrations and browser journeys. Run all
   regression checks, then verify a real provider sandbox checkout, webhook,
   renewal/failure and cancellation. Document deployment setup separately from
   local acceptance; do not enable live charging as part of local verification.

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

- Final payment provider, pricing, tax handling, invoicing regions, and refund policy remain open per `PRODUCTION_ARCHITECTURE.md`. Resolve and document these commercial decisions before implementing live billing. The authorized sandbox scope uses separately recorded test policies.
- Do not let entitlement enforcement become UI-only under deadline pressure — that defeats the entire point of this milestone.

## Completion Checklist

- [x] Owner kickoff, branch and repository integration map recorded.
- [x] Detailed implementation sequence and acceptance matrix prepared.
- [ ] Merchant/provider and commercial policies accepted.
- [x] Explicit public-key sandbox sequencing exception and test policies recorded.
- [x] Versioned plans, subscriptions, entitlements and billing operation/observation persistence.
- [x] Authorized sandbox checkout, cancellation and payment-status recovery.
- [x] Sandbox payment webhooks with signature verification, durable replay handling and reconciliation tested locally.
- [ ] Account-specific webhook delivery and full provider lifecycle acceptance.
- [x] Transactional location/menu/member/template/publication limits.
- [x] Tested sandbox grace, downgrade, cancellation, expiry and restoration behavior.
- [x] Audited, strongly authenticated plan and override administration.
- [x] Database-backed sandbox plan catalog and billing UI with Arabic/English support.
- [ ] Replace public illustrative pricing with accepted commercial offers.
- [x] API, concurrency, browser and regression checks passed: the initial checkpoint had 123 API, 68 web and 17 prototype tests. The 2026-09-21 webhook continuation passed all 136 API tests, API build/lint/typecheck and schema validation; browser/prototype suites were not rerun for this backend change.
- [ ] Actual provider sandbox acceptance and operational handoff recorded.

The actual sandbox smoke check created invoice `7173687` for 1.000 KWD and verified
its matching reference and amount through GetPaymentStatus. Its status was
`Pending`; this is not a successful-payment, webhook or recurring-charge test.
