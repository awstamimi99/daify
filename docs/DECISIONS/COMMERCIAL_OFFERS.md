# Coupons and custom pricing — 2026-10-15

Implemented locally after the Owner authorized step 2. Platform employees and
restaurant employees remain separate; see [employee authority](PLATFORM_STAFF.md).

## Discount authority

| Actor | Coupon ceiling | Custom pricing authority |
| --- | --- | --- |
| Owner/Admin | 100% off, at most 12 months | Approve monthly quotes at or below the selected plan price, at most 12 months |
| Manager | 50% off, at most 6 months | Approve at most 50% below the selected plan price, at most 6 months; larger proposals wait for Owner approval |
| Sales | Configured allowance; initially 25% for 3 months **or** one free month | Always requires Manager/Owner approval |

The Owner approved the custom-pricing ceilings and renewal behavior in chat.
These ceilings are enforced by the API as well as the interface. Employees need
explicit commercial permissions; role labels alone confer no new grants.
Existing active employees do not automatically receive the new preset grants.

New Manager presets contain `offers.read`, `offers.create`, `offers.approve` and
`discounts.manage`. Sales presets contain `offers.read` and `offers.create`.
Technical Support and Supervisors cannot receive commercial offer permissions.
Delegation still cannot exceed the grantor's own role, permission or customer scope.

The Owner can set a Sales employee's percentage, percentage-duration and free-month
allowances up to the Owner ceiling. A Manager can set up to 50% for 6 months and
retain/reduce the explicit starting Sales exception of one free month. Managers
cannot issue free coupons themselves. Zero percentage **and** zero percentage
months disable percentage offers; free-month offers can be disabled separately.
Changes are versioned and audited. Existing coupons are rechecked against the
issuer's current allowance on review and acceptance.

## Coupons

A coupon has a unique normalized code, percentage, duration, redemption deadline,
maximum total redemptions, issuer, optional customer binding and a change reason.
Duration is separate from the deadline for redeeming the code. Managers with
all-customer access and the Owner can create unbound coupons. Scoped Managers
must choose an assigned customer. Sales coupons always bind to one assigned
customer and allow one redemption.

Coupon terms cannot be edited after creation. Revoke the old code and create a
new one. Issuers may revoke their own coupons; Managers can revoke scoped Sales
coupons, while only the Owner can revoke another Manager's coupon. Revocation
does not rewrite previously accepted terms. Customers review a plan-specific
price, included plan limits, duration and renewal price before confirming.
The server verifies the reviewed terms hash before accepting them.

## Custom quotes

Quotes specify one customer, one versioned plan, monthly KWD amount, duration,
acceptance deadline and internal reason. Included features and usage limits
come from that plan and are copied into the terms; arbitrary custom entitlements
are outside this change. The renewal amount is copied from the selected plan.
A quote cannot move between customers or exceed the plan's price.

Sales proposals always begin `PENDING`. Manager/Owner proposals within their
approval authority begin `APPROVED`; larger Manager proposals remain `PENDING`.
Only a currently authorized Manager/Owner can approve or reject pending,
unexpired quotes. A creator can withdraw their own unaccepted quote; the Owner
can also withdraw it. Only the author or Owner can revise a quote. Every revision
increments its version and clears approval, including an Owner revision.

The customer can see approved unexpired quotes and must explicitly accept the
price, duration and renewal terms. The server checks the quote version, current
creator and approver permissions, customer scope and plan availability again.
Accepted terms are immutable. Prior versions, reasons and decisions remain in
the audit events. Staff cannot accept a quote on behalf of the customer through
platform authority alone: acceptance needs the customer's `billing.manage`
membership and an AAL2 session.

## Acceptance and billing boundary

This checkpoint records terms **awaiting billing activation**. Acceptance is
available only in a non-production billing sandbox. Production acceptance stays
disabled. Acceptance does not charge money, start the offer duration, change
subscriptions, extend free access or enable publishing/other entitlements.

The customer is told this before acceptance. Checkout is paused after acceptance
to avoid charging the undiscounted amount while an agreed offer is awaiting
activation. Unresolved existing checkouts must be settled before acceptance.

The initial policy allows **one introductory offer per customer**. Coupons and
custom prices cannot stack or be repeatedly accepted. Retries of the same
acceptance return the saved result without consuming another redemption. A
unique customer constraint and the shared commercial/grant lock serialize
acceptance, redemption, revocation and approval changes. Payment checkout and
acceptance additionally acquire the customer lock in the same order.

A future billing activation implementation must pin the agreed price to every
invoice, define the exact first billing period, apply monthly duration and
renewal pricing, implement zero-price periods, reconcile provider notifications,
and test term expiry/cancellation. The existing sandbox payment provider has not
been changed to activate these offers. Recurring/provider acceptance remains
in [M6](../MILESTONES/M6_BILLING_SUBSCRIPTIONS.md) and
[M8](../MILESTONES/M8_PRODUCTION.md).

## Storage and screens

Four new tables bring the schema to **41 application tables**, with **15 Prisma
migrations**:

- `sales_discount_allowances`: per-employee limits, version and last grantor.
- `discount_coupons`: immutable coupon terms, deadline, count and revocation.
- `pricing_quotes`: versioned proposals, approval/rejection and customer terms.
- `commercial_acceptances`: one immutable accepted coupon or quote per customer;
  coupon-linked rows are the redemption history.

Monetary amounts use `Decimal(12,3)` and are returned as decimal strings. Coupon
prices round to KWD's three decimals with explicit half-up rounding. Constraints
bound amounts, percentages, durations, counters and the acceptance source; indexes
cover customer, author, plan and coupon lookups. Tables receive no public Data API
grants. Existing custom auth and API tenant checks remain authoritative.

Staff screen: `/admin/offers`. Customer screen: `/dashboard/offers`. Both provide
English/Arabic text. State-changing forms require a reason and a review before
save; customers confirm commercial terms explicitly. Reads and staff mutations
are audited, and customer reads omit internal staff reasons and decision metadata.
