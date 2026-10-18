# Coupons and custom pricing — local QA, 2026-10-15

Branch: `feat/m8-staging`; implementation follows employee commit `1c54827`.
Policy: [commercial offers](../DECISIONS/COMMERCIAL_OFFERS.md).

## Verified

- **179 API tests / 28 suites**, including ten new commercial integration
  scenarios and OpenAPI route/schema discovery.
- **75 compiled-web Chromium tests**, including two new complete offer journeys.
- Production build, TypeScript, ESLint, Prisma validation and diff checks pass.
- New additive migration `20261015140000_commercial_offers` applied only to the
  isolated local `daify_release_test` database. Four tables bring the application
  schema to 41 tables and 15 migrations.

The commercial integration scenarios verify:

1. Manager 50%/6-month and Owner 100%/12-month coupon boundaries and role checks.
2. Sales defaults, configurable limits, single-customer coupon restriction,
   prohibition on self-granted limits and stale-update detection.
3. Mandatory Sales quote approval, Manager approval ceilings and Owner escalation.
4. Approval clearing on revision; stale, expired, rejected and wrong-customer quotes.
5. Exact customer acceptance, preserved plan limits and renewal amount, immutable
   accepted quotes, retry idempotency, no stacking and checkout paused after acceptance.
6. Current issuer/approver permissions rechecked at acceptance after suspension.
7. Two concurrent customers competing for a coupon's final redemption; exactly
   one succeeds, and retrying it does not consume a second redemption.
8. Revoked/expired/wrong-customer coupons, forged reviewed terms and reduced Sales
   allowance invalidating a previously reviewed coupon.
9. Acceptance disabled in production and when sandbox billing is disabled.
10. Scoped employee isolation, suspended employees, outsider customers and MFA.

The browser scenarios use separate Sales, Manager and customer sessions. Sales
submits a reviewed quote, a Manager approves it, and the customer reviews the
price/duration/renewal amount and explicitly accepts. No record is created before
confirmation. The second journey creates a Manager 50%/6-month coupon, reviews
its plan-specific price and redeems it once. Arabic screens pass Axe checks;
the staff page is checked at 390px without horizontal overflow.

Screenshots contain synthetic records only:

- [Staff quotes, Arabic/mobile](evidence/commercial-offers/offers-mobile-ar.png)
- [Customer accepted terms, Arabic](evidence/commercial-offers/customer-offer-ar.png)

## Reproduce

Use the local isolated test database, with migrations applied. These test suites
must never target the hosted project or customer data.

```sh
export DATABASE_URL=postgresql://daify@127.0.0.1:55432/daify_release_test
export TEST_DATABASE_URL="$DATABASE_URL"
export ANALYTICS_TEST_REDIS_URL=redis://127.0.0.1:56379/15
npm run prisma:migrate:deploy --workspace @daify/api
npm run build
npm run lint
npm run typecheck
npm run prisma:validate --workspace @daify/api
npm run test --workspace @daify/api
WEB_TEST_PRODUCTION=true npm run test:web -- --workers=2
```

## Limits and rollout

No hosted Supabase database, storage, deployment settings or payment account was
changed. No real charge, free-access period or discount activation was performed.
Accepted terms explicitly await billing activation; their duration has not started.
Existing unresolved checkouts must be reconciled before acceptance. An accepted
offer blocks new checkout to prevent charging the standard price.

This implementation deliberately permits one introductory offer per customer.
Renewal campaigns, changing accepted agreements, multiple sequential offers,
custom plan entitlements and provider billing activation are future work.
Production acceptance remains disabled, matching the existing billing gate.

Before rollout, grant commercial permissions deliberately to existing employees,
verify runtime/migration privileges for all four new tables and follow the
[staging runbook](M8_STAGING.md). If rolling back to a version without commercial
offer checks while acceptances exist, keep billing disabled to prevent the older
checkout path from using the standard price. Hosted SMTP/ingress/SSR/private media
and payment-provider acceptance remain open M8/M6 gates.

Existing pg concurrent-query and NO_COLOR/FORCE_COLOR deprecation warnings appeared
in local runs; no test was skipped on their account.
