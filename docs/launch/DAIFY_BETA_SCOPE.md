# DAIFY Beta scope

## Required for Beta

- Secure signup, email verification, login, logout and password reset.
- Owner onboarding into an organization and first restaurant location.
- Tenant-scoped restaurant settings, members and basic employee access.
- English and Arabic draft menus with categories, products, prices, availability and images.
- Template selection, authenticated preview, publish/unpublish and stable QR access.
- Public mobile menu without customer authentication, with correct RTL/LTR behavior.
- Persistent PostgreSQL storage, private object storage, least-privilege runtime access and verified TLS.
- Staging deployment on the selected free providers with HTTPS, exact-origin CORS/cookies, health checks and an end-to-end browser journey.

## Optional for Beta

- MFA enrollment and recovery, support tickets, platform assistance, basic analytics and sandbox plan enrollment. These may remain available when configured but do not block the owner-to-public-menu journey.
- Manager and supervisor presets beyond the minimum owner invitation workflow.
- Multiple locations and publication rollback, which are implemented but need only regression coverage for Beta.

## Post-Beta

- Live payments, recurring billing, refunds/disputes and commercial activation of accepted quotes.
- Production analytics/retention operations, scheduled publishing, custom domains and mobile applications.
- Production DNS, paid availability, formal monitoring/on-call, production restore acceptance and public launch.
- Advanced sales coupons, custom pricing, platform employee workflows and broad administrative reporting do not delay Beta.

## Beta access policy

Beta must not charge customers. Deploy with `BILLING_MODE=disabled` and
`ANALYTICS_MODE=disabled`. New organizations without a subscription retain the
existing unrestricted menu entitlements; no sandbox enrollment or fabricated
payment is required. The billing screen describes this access and exposes no
checkout/trial action. Backend billing mutations still fail closed.

Existing sandbox subscriptions remain unavailable when sandbox mode is disabled;
do not seed them into hosted Beta. This policy does not introduce an invite-only
gate or plan resource quotas for unenrolled organizations. Keep access limited
operationally during hosted acceptance and review quota/abuse controls before
promoting public signup. Existing authentication, tenant scoping, upload limits,
and rate limits continue to apply. Live payments require separate approval.

## Current execution boundary — 2026-10-18

The owner deferred hosting and email setup and prohibited deployment for now.
Complete all independent implementation, local integration/security tests and
release preparation. Hosted delivery, private storage and ingress acceptance
remain external dependencies; do not bypass verification or use test mail in
production to work around them.
