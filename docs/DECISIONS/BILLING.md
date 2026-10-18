# Billing implementation and sandbox decision

Status: **Sandbox implementation authorized; live commercial decisions pending**
Prepared: 2026-09-14, after the owner's M6 kickoff.
Scope: [M6 Billing / Subscriptions](../MILESTONES/M6_BILLING_SUBSCRIPTIONS.md).

## Authorized sandbox scope — 2026-09-14

The owner approved continuing without a merchant account using MyFatoorah's
public test key. This explicitly supersedes the M6 sequencing prerequisite for
local/sandbox development. Live billing, final prices and commercial policies
remain unapproved. Sandbox code must refuse production startup when enabled.

Build real persisted plan versions, subscriptions and entitlements, with
illustrative KWD fixtures and explicit enrollment into sandbox billing. Existing
workspaces keep M5 access until enrolled; no automatic charge or trial conversion.
Sandbox policies: 14-day trial, monthly manual renewal, 3-day failed-renewal grace,
cancel at period end, immediate paid plan replacement with no proration. Limits
count nonarchived locations/menus and active members (including owners); pending
invitations do not reserve seats but acceptance/reactivation must recheck them.
Trial/paid/grace access permits new resources and publication within limits;
expiry preserves editing, existing public menus, versions and QR aliases while
blocking new resources, design upgrades and publication. These are test rules,
not customer terms. Overrides are explicit, expiring, audited admin actions.

Initial provider scope is hosted V2 sandbox checkout and authoritative
GetPaymentStatus reconciliation. The public test key does not establish a
project-owned webhook secret or recurring-payment activation: signed provider
webhook and automatic-renewal acceptance remain open. Never represent a return
redirect or a simulated test response as proof of a real payment. The public key
is local configuration, never embedded in browser assets or committed source.

This document records the implemented sandbox scope and remaining live decisions.
It does not select a live provider, activate commercial prices or automatically
enroll existing workspaces.
The accepted boundaries remain: Organization owns billing; provider-verified
payment facts drive database entitlements; API commands enforce access; all
billing changes are audited; cancellation does not delete customer content.

## Live inputs to resolve

| Decision | Current evidence / required input |
| --- | --- |
| Merchant entity and country | Not recorded. Kuwait timezone and KWD menu prices do not establish merchant registration or settlement eligibility. |
| Provider and merchant account | MyFatoorah public-key sandbox is implemented. Confirm the owner's live provider/account and recurring-payment activation. |
| Currency and price versions | Existing USD Starter 10/month or 96/year and Pro 15/month or 156/year are illustrative, not approved. Business has no fixed price. |
| Location/menu/member limits | Confirm per-organization versus per-location menu counts, owner/manager/staff seat counting and invitation reservations. Prototype copy does not fully define these. |
| Template access | Define the exact template keys in each tier; “Core” is not an enforceable list. |
| Trial and existing workspaces | Confirm duration, payment method requirement, post-trial access and the transition for existing M1–M5 workspaces. Do not auto-enroll or charge them. |
| Failed payments and grace | Confirm grace duration and which edit, publish and public-serving capabilities remain available. |
| Cancellation and plan changes | Confirm effective dates, renewal behavior, prorations and over-limit behavior. Preserve stored content and slug reservations. |
| Tax, invoicing and refunds | Owner-supplied commercial policy is pending, including sales regions and invoice identity. No tax or refund rule is inferred. |

Merchant/provider selection is the first question. Remaining commercial inputs
can be resolved against the selected provider's supported lifecycle before
implementing or enabling the affected live behavior.

## Provider feasibility notes

Official documentation checked on 2026-09-14; these are candidate capabilities,
not confirmation of this merchant's eligibility or an approved provider choice.

- Tap documents recurring charges using saved customer/card/agreement references;
  the merchant must activate Save Card through its account manager. Its payment
  webhook reports payment events. The exact scheduled billing product and
  lifecycle API must be selected before mapping DAIFY subscriptions.
  Sources: [Recurring Payments](https://developers.tap.company/docs/recurring-payments),
  [Payment Webhook](https://developers.tap.company/docs/webhook).
- MyFatoorah documents provider-managed recurring payments through the V2 payment
  flow and requires account activation and confirmation of supported payment
  methods. Webhook V2 includes payment, refund and recurring events; recurring
  updates have their own signature field set. The adapter must verify each event
  type using its documented scheme, not a generic assumed payload signature.
  Sources: [Recurring Payment](https://docs.myfatoorah.com/docs/recurring-payment),
  [Webhook V2](https://docs.myfatoorah.com/docs/webhook-v2),
  [Recurring Data Model](https://docs.myfatoorah.com/docs/webhook-v2-recurring-data-model).

## Original repository integration map

This records the pre-implementation seams. Implemented sandbox behavior and
verification are tracked in [the M6 checkpoint](../QA/M6_2026-09-14.md).

| Existing seam | Planned change and constraint |
| --- | --- |
| `apps/api/prisma/schema.prisma` | No billing tables exist. Add immutable commercial versions, subscriptions, effective entitlements, checkout operations and verified events; never reinterpret an old invoice using the latest plan price. |
| `organizations/organizations.service.ts` | Creation, invitations, acceptance and membership changes already serialize on the organization. Add limits inside these transactions, including reactivation and any approved invitation reservation policy. |
| `menus/menus.service.ts` | `create` locks the organization. Evaluate the approved menu count in that same transaction; independent check-then-create requests can oversubscribe. |
| `menus/publishing.service.ts` | `publishingEnabled` is an M5 manual gate. Combine it with billing entitlements and exact template access; check the restored snapshot's template on rollback. Preserve unpublish and historical versions. |
| Public menu/media routes | Apply the approved expiry/public-serving policy consistently to HTML, JSON and images; never recycle a printed QR slug. |
| `bootstrap.ts` | Explicit JSON parsers already consume request bodies. If provider verification requires raw bytes, capture them before parsing on the exact webhook route; preserve image upload bounds. |
| `common/middleware/client-identity.middleware.ts` | Production currently requires Next's signed client identity. Provider callbacks cannot supply that signature. Use an exact webhook-route exception with provider authentication, bounded bodies and suitable rate limits; do not weaken other routes. |
| `platform/platform-admin.guard.ts` | Existing admin guard requires AAL2. Reuse it for plan/override administration; persist reason, actor, request correlation and before/after effect atomically. |
| `auth/auth.guard.ts` | Sessions expose AAL1/AAL2, but no dedicated recent billing step-up flow exists. Implement sensitive-action assurance consistently with `AUTH_RBAC.md`. |
| `web/src/components/marketing/pricing-plans.tsx` | Replace hardcoded illustrative plans only after commercial approval. Its annual-saving label also needs to be calculated from actual prices. |
| `web/src/app/(dashboard)/dashboard/[section]/page.tsx` | Replace the billing placeholder with organization-scoped subscription, invoices, usage, checkout/cancellation and recovery UI. |

## Processing requirements

Create checkout requests from a server-selected active price version and the
authenticated organization. Persist an operation key and intent before network
I/O. An ambiguous timeout must be reconciled through the provider's supported
idempotency/retrieval mechanism, never blindly retried as a new charge. Redirects
to success pages alone must never grant access.

Verify events before storing trusted payment facts. Bind provider/account/mode,
customer, subscription, amount and currency to local intent using authoritative
provider data where needed. Do not trust an arbitrary organization ID in a
callback. Keep a durable event inbox with retry/reconciliation state, and apply
subscription, entitlement and audit changes atomically under the organization
lock. Reordered events must not revoke a later successful renewal or resurrect
an old subscription. Provider event time alone may be insufficient; finalize
ordering/reconciliation rules from the chosen provider's contract.

Use explicit UTC effective dates and deterministic evaluation at a supplied
clock time. Preserve historical commercial and entitlement provenance. Expired
overrides must stop granting access even if background work is delayed. Grace
and downgrade behavior for live use remain policy inputs. The explicit test
rules above apply only to sandbox use.

## Acceptance matrix

| Scenario | Required evidence |
| --- | --- |
| Duplicate/concurrent webhook | One effective transition and audit effect; no duplicate access extension. |
| Forged, mismatched or test/live-crossed event | No subscription or entitlement mutation. |
| Out-of-order renewal/failure/cancellation | Final state follows authoritative provider facts and approved effective dates. |
| Checkout timeout or browser retry | Same intent resolves to one provider operation; success redirect alone grants nothing. |
| Last resource slot claimed concurrently | Exactly one permitted create/reactivation; API bypass cannot exceed limit. |
| Seat acceptance/reinstatement | Approved seat policy enforced under lock, preserving last-owner invariants. |
| Template save/publish/rollback | Restricted keys rejected at every relevant command, including historical snapshots. |
| Trial/grace/override boundary | Check immediately before, at and after expiry with a controlled clock. |
| Cancellation/downgrade | Content, media, versions and QR reservations retained; access follows accepted policy. |
| Plan/override admin mutation | Ordinary tenant and AAL1 admin denied; successful action has atomic audit provenance. |
| Migration of existing workspaces | No accidental charges or unexplained loss of access; approved transition is repeatable. |
| Provider outage/replay | Durable retry and reconciliation recover without duplicate effects or leaked secrets. |
| Browser billing journey | Owner selects actual plan, returns from sandbox checkout, sees verified status and can cancel/recover; tenant isolation and mobile accessibility pass. |

Local fixtures and mocked webhooks do not replace real provider sandbox
acceptance. M6 completion must report each separately. Credentials belong in
environment configuration, not this document or source control.

## Commercial offers — 2026-10-15

See [coupons and custom pricing](COMMERCIAL_OFFERS.md) for implemented employee
authority, quote approvals, customer acceptance and the payment activation gate.
Accepted offers are not yet applied to subscriptions or provider payments.
