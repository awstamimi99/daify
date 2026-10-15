# Platform employees — local verification, 2026-10-15

Branch: `feat/m8-staging`, working-tree changes based on `e84d8a4`.
Scope: [employee policy](../DECISIONS/PLATFORM_STAFF.md), invitation acceptance,
custom grants, customer scope and menu assistance. Hosted Supabase was not
modified and no deployment was performed.

## Results

- API regression: **169 tests passed**, 27 suites, including six new employee
  integration scenarios. PostgreSQL and Redis were local isolated test services.
- Compiled-web regression: **73 tests passed** in Chromium, including existing
  authentication, customer menus, publishing, billing, support, templates and
  accessibility checks.
- Employee integration tests rerun after invitation-renewal changes: **6 passed**.
- Production build, TypeScript checks and ESLint passed.
- The new additive `20261015100000_platform_staff` migration was applied only to
  `daify_release_test` locally. No hosted schema/data changes were made.

Authorization coverage includes Owner-only Manager appointment; Manager and
Supervisor delegation boundaries; rejection of unknown grants, scope escalation,
self/peer edits and Sales menu permissions; scoped customer directories;
Support editing and publishing with audit attribution; invitation identity,
MFA, expiry, revoked inviter and replay rejection; stale updates and session
revocation on suspension. API contract discovery includes the new controller.

Browser coverage includes a reviewed custom Manager invitation, Sales permission
checkbox restrictions, Manager hierarchy/scope restrictions and a forged
promotion request rejected by the API. Customer assistance renders the real
menu preview through the scoped reason cookie; ending assistance removes access
without a fresh reason. English/Arabic employee rendering and Axe checks pass.
Final focused checks also cover the invitation login return path and Arabic
permissions on a 390px viewport.

Screenshots use synthetic users/customers only and are saved in
`docs/QA/evidence/platform-staff/`.

## Reproduction

Use an isolated local test database with migrations applied. Do not point these
commands at the hosted Supabase project or a database containing customer data.

```sh
export DATABASE_URL=postgresql://daify@127.0.0.1:55432/daify_release_test
export TEST_DATABASE_URL="$DATABASE_URL"
export ANALYTICS_TEST_REDIS_URL=redis://127.0.0.1:56379/15
npm run build
npm run lint
npm run typecheck
npm run test --workspace @daify/api
WEB_TEST_PRODUCTION=true npm run test:web -- --workers=2
WEB_TEST_PRODUCTION=true npm run test:web -- employees.spec.ts --workers=1
```

## Limits and rollout checks

Real invitation email delivery, hosted connection/TLS/runtime permissions,
Netlify SSR/QR and provider acceptance remain open in the
[staging runbook](M8_STAGING.md). Mail delivery after commit is not a durable
outbox. Existing `platformAdmin` users keep Owner authority and must be reviewed
before rollout. New employee data has not been pushed to any external database.

Discounts, one-month-free offers, 25%-for-three-months offers, custom-price
approval and their payment integration are **not implemented by this change**.
The current billing grant controls usage limits only. Ownership transfer and
arbitrary custom role definitions are also outside this implementation.

The PostgreSQL client emitted an existing concurrent-query deprecation warning;
tests completed successfully. Local test success does not close hosted M8 gates.
